# MkImage Skills

Public Agent Skills for [MkImage](https://mkimage.ai). This repository contains client-side guidance and tools, not the hosted generation server.

## Install

```sh
npx skills add MkThingsHQ/mkimage-skills --skill mkimage
```

In [MkImage → Settings → API Keys](https://mkimage.ai/settings/apikeys), create a key with **MCP** enabled. Keep it in your client secret store. Then follow the [MCP setup guide](https://mkimage.ai/mcp) or the [Skill connection guide](skills/mkimage/references/connection.md).

- Streamable HTTP endpoint: `https://mkimage.ai/api/mcp`
- Auth: `Authorization: Bearer <MCP key>`
- Node 22+ is required only for the bundled helper.

The Skill can discover models and prices, search prompt inspiration, upload private references, submit one image per task, recover an interrupted request, and download private outputs. See [SKILL.md](skills/mkimage/SKILL.md).

Licensed under [Apache 2.0](LICENSE).
