# Connect MkImage

1. Sign in to MkImage with a verified email address. In [Settings → API Keys](https://mkimage.ai/settings/apikeys), create a new key and tick **MCP**. Store the one-time value in your client's secret settings. Unscoped keys work for neither MCP nor MCP downloads. Revoke the MCP key in the same settings page when no longer needed.
2. Configure a Streamable HTTP MCP server at `https://mkimage.ai/api/mcp`. Send `Authorization: Bearer <MCP key>` on each request. If your client cannot set a custom authorization header, use the helper instead. Browser OAuth is not implemented.
3. Verify the connection with `list_models` and `list_skills` before submitting a paid job.

## Local helper (Node 22+)

With `MKIMAGE_API_KEY` securely injected into the process environment, run these commands from the installed Skill directory:

```sh
node scripts/mkimage.mjs tools
node scripts/mkimage.mjs call list_models
node scripts/mkimage.mjs call quote_image '{"model":"gpt-image-2","resolution":"1k","aspectRatio":"1:1"}'
node scripts/mkimage.mjs upload ./product.png
node scripts/mkimage.mjs download HISTORY_ID ./result.png
```

`call` accepts one JSON object argument; pass only non-secret tool inputs. `upload` reads local PNG, JPEG, or WebP files; `download` refuses to overwrite a file. Both only send the key to the configured MkImage origin. `MKIMAGE_BASE_URL` defaults to `https://mkimage.ai`; use it only for an explicitly trusted HTTPS deployment or a loopback development server. Check a job via `call check_generation '{"requestId":"YOUR_ORIGINAL_ID"}'`; a receipt is not a completed image.
