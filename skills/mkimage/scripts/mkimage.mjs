#!/usr/bin/env node
import { openAsBlob } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';

const types = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const protocolVersion = '2025-11-25';

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function run([command, ...args]) {
  const key = process.env.MKIMAGE_API_KEY;
  if (!/^mki_[\w-]+$/.test(key ?? ''))
    throw new Error('Provide MKIMAGE_API_KEY through your secret store.');
  const base = new URL(process.env.MKIMAGE_BASE_URL || 'https://mkimage.ai');
  if (
    base.username ||
    base.password ||
    (base.protocol !== 'https:' &&
      !(
        base.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
      ))
  ) {
    throw new Error(
      'Use an explicitly trusted HTTPS MkImage origin, or HTTP on loopback for development.'
    );
  }
  async function request(path, options = {}) {
    const response = await fetch(new URL(path, base.origin), {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { ...options.headers, Authorization: `Bearer ${key}` },
    });
    if (!response.ok)
      throw new Error(`MkImage returned HTTP ${response.status}.`);
    return response;
  }
  async function rpc(method, params, notification = false, version) {
    const response = await request('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(version ? { 'MCP-Protocol-Version': version } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        ...(!notification ? { id: 1 } : {}),
        method,
        params,
      }),
    });
    if (notification) return;
    const message = await response.json();
    if (message.error) throw new Error(message.error.message);
    return message.result;
  }
  if (command === 'tools' || command === 'call') {
    if (
      (command === 'tools' && args.length) ||
      (command === 'call' &&
        (!/^[a-z_]+$/.test(args[0] ?? '') || args.length > 2))
    )
      throw new Error('Usage: tools | call TOOL [JSON]');
    const input = command === 'call' ? JSON.parse(args[1] ?? '{}') : undefined;
    if (
      input !== undefined &&
      (!input || typeof input !== 'object' || Array.isArray(input))
    )
      throw new Error('Tool input must be a JSON object.');
    const connection = await rpc('initialize', {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'mkimage-skill', version: '1.0.0' },
    });
    await rpc(
      'notifications/initialized',
      undefined,
      true,
      connection.protocolVersion
    );
    const result =
      command === 'tools'
        ? await rpc('tools/list', {}, false, connection.protocolVersion)
        : await rpc(
            'tools/call',
            { name: args[0], arguments: input },
            false,
            connection.protocolVersion
          );
    if (result.isError)
      throw new Error(
        result.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
          .join(' ') || 'Tool call failed.'
      );
    print(result.structuredContent ?? result);
    return;
  }
  if (command === 'upload') {
    if (args.length < 1 || args.length > 5)
      throw new Error('Usage: upload FILE [FILE...] (up to five).');
    const form = new FormData();
    for (const file of args) {
      const type = types[extname(file).toLowerCase()];
      if (!type) throw new Error('Reference files must be PNG, JPEG or WebP.');
      const blob = await openAsBlob(file, { type });
      if (!blob.size || blob.size > 10 * 1024 * 1024)
        throw new Error(
          'Reference files must be non-empty and no larger than 10 MiB.'
        );
      form.append('files', blob, basename(file));
    }
    const response = await request('/api/generate/reference-images', {
      method: 'POST',
      body: form,
    });
    print(await response.json());
    return;
  }
  if (command === 'download') {
    const [id, output] = args;
    if (!/^[\w-]{1,80}$/.test(id ?? '') || !output || args.length !== 2)
      throw new Error('Usage: download HISTORY_ID OUTPUT_FILE');
    const response = await request(
      `/api/mcp/image?historyId=${encodeURIComponent(id)}`
    );
    const file = await open(output, 'wx');
    try {
      await pipeline(response.body, file.createWriteStream());
    } catch (error) {
      await file.close().catch(() => {});
      await unlink(output).catch(() => {});
      throw error;
    }
    print({ file: output });
    return;
  }
  throw new Error(
    'Usage: tools | call TOOL [JSON] | upload FILE... | download HISTORY_ID FILE'
  );
}

run(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
