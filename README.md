# share-bill

Split a bill with friends from your phone. Add friends, add who paid for what, choose who shares each item, and get the shortest list of transfers. Thai / English UI.

- `frontend/`: Next.js app, mobile-first 4-step flow (Friends → Items → Split → Summary)
- `backend/`: Express + MongoDB REST API **and** an MCP server so an LLM can fill in bills for you

## Run locally

```bash
# backend (needs MongoDB)
cd backend && cp .env.example .env && npm install && npm run dev

# no MongoDB handy? run the real routes on an in-memory store
npm run dev:memory

# frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Tests: `npm test` in `backend/` and in `frontend/`.

## How data stays safe

Opening the site shows a landing page and costs nothing: a bill is only stored when its first friend or item is saved (a write based on version 0 creates it). Reads of a bill that does not exist return an empty one without writing.

Every session carries a `version`. The web app only writes after its first successful load, and every write says which version it is based on (`PUT /api/sessions/:id` with `baseVersion`). If the server has a newer version it answers `409` with the latest data and the client three-way merges its edits on top instead of overwriting. A slow browser, a failed load, or two people editing at once can no longer wipe the stored bill. The app also polls for changes made elsewhere (other phones, an LLM via MCP).

## MCP server

The same backend exposes the bill as [Model Context Protocol](https://modelcontextprotocol.io) tools, so any MCP client can create sessions, add friends and items, and read who owes whom.

| Transport | Where | Use with |
| --- | --- | --- |
| Streamable HTTP (stateless) | `POST https://<your-backend>/mcp` | Claude (custom connector), ChatGPT (developer-mode connector), Cursor, VS Code, MCP Inspector, … |
| stdio | `npm run mcp:stdio` (dev) or `node dist/mcp/stdio.js` | Claude Desktop, Claude Code, any client that spawns a process |

Tools: `create_session`, `get_session`, `get_summary`, `add_friends`, `update_friend`, `remove_friend`, `add_orders`, `update_order`, `remove_order`, `set_transfer_done`. Every item stores `payers` (who paid how much; one entry when one person paid it all). `add_orders` / `update_order` accept `paidBy` (one person) or `payers` (several people with the amount each paid, which must add up to the price; omit all amounts to split equally). Friends and orders are referenced by name, so a model never has to juggle ids. Tools return the link (`APP_BASE_URL/?sessionId=…`) so you can open the bill in the app.

Examples:

```bash
# Claude Code
claude mcp add --transport http share-bill https://<your-backend>/mcp

# local stdio (Claude Desktop / Cursor config)
{ "mcpServers": { "share-bill": { "command": "npx", "args": ["tsx", "src/mcp/stdio.ts"], "cwd": "/path/to/share-bill/backend" } } }
```

For ChatGPT: Settings → Connectors → Advanced → Developer mode → add a connector with the `https://<your-backend>/mcp` URL. For Claude.ai: Settings → Connectors → Add custom connector with the same URL. The backend must be reachable over public HTTPS for hosted clients.

Security: sessions are unguessable ids (anyone with the link can edit, as in the web app). Set `MCP_API_KEY` to require `Authorization: Bearer <key>` on `/mcp` (works for clients that let you set a header, e.g. Claude Code, Cursor); leave it empty for hosted connectors that only support OAuth or no auth.

## Configuration

| Variable | Where | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | backend | MongoDB connection string (`MONGO_URI` also accepted) |
| `PORT` | backend | default `5050` |
| `APP_BASE_URL` | backend | public web app URL used in MCP share links |
| `MCP_API_KEY` | backend | optional bearer key for `/mcp` |
| `NEXT_PUBLIC_API_BASE_URL` | frontend (build time) | e.g. `https://api.example.com/api` |
