# HTTP SSE Example (MCP Inspector Compatible)

Minimal MCP server using the legacy HTTP + Server-Sent Events transport. This layout is currently compatible with MCP Inspector.

## Prerequisites

- Node.js 18+
- Install dependencies:

```bash
cd examples/http-sse-inspector
npm install
```

## Build & Run

```bash
# optional overrides
export MCP_EXAMPLE_HOST=0.0.0.0
export MCP_EXAMPLE_PORT=3200

npm run build
npm start
```

Server endpoints (defaults shown):
- Events stream: `GET http://127.0.0.1:3200/mcp/events`
- Message endpoint: `POST http://127.0.0.1:3200/mcp/message`

## Integration Test

A small script validates `initialize`, `tools/call`, and server notifications:

```bash
npx ts-node test-integration.ts
```

Console output confirms:
1. Stream connection established (`clientId` received).
2. `initialize` response with protocol info.
3. `tools/call` response containing `content[]`.
4. `resources/updated` notification emitted by the server.

## MCP Inspector Steps

1. Start the server (`npm start`).
2. Open MCP Inspector.
3. Add new server:
   - Transport: **HTTP SSE / Legacy**
   - Events URL: `http://127.0.0.1:3200/mcp/events`
   - Message URL: `http://127.0.0.1:3200/mcp/message`
4. Connect and verify:
   - Initialize handshake completes.
   - `List tools` shows `echo`.
   - Execute `echo` with `{ "text": "hello" }` and inspect the JSON response.
   - Observe the `resources/updated` notification that fires immediately after the tool call.
