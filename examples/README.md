# MCP Accelerator Examples

Practical scenarios that demonstrate how to build MCP-compliant servers with the latest tooling (`tools/call`, handshake negotiation, CLI scaffolding, observability, security).

---

## 🚀 Quick Start

```bash
cd /path/to/MCraPid
npm install
npm run build:core

# Optional: link packages for local development
npm link --workspaces
```

Inside any example:

```bash
cd examples/<example-name>
npm install
npm start
```

All examples use the MCP-compliant flow:

1. Client sends `initialize` with `protocolVersion`.
2. Server responds with negotiated capabilities.
3. Client calls `tools/list` to discover tools.
4. Tool execution uses `tools/call` with `{ name, arguments }`.

---

## 📂 Example Catalog

| Example | Transport | Highlights |
|---------|-----------|------------|
| [basic-stdio](./basic-stdio) | STDIO | Minimal CLI server, lifecycle hooks, validation demos. |
| [http-api](./http-api) | HTTP | REST-style MCP endpoint with multiple tools and logging plugins. |
| [websocket-server](./websocket-server) | WebSocket | Real-time calculator, broadcast support, streaming responses. |
| [secure-api](./secure-api) | HTTP | JWT & API key auth, layered rate limits, RBAC awareness. |
| [production-ready](./production-ready) | HTTP + middleware | TLS-ready deployment blueprint with observability and CI tooling. |
| [prompts](./prompts) | STDIO + resources | Prompt provider and resource catalogs for content workflows. |
| [custom-plugin](./custom-plugin) | HTTP | Sample plugin with audit logging and custom middleware. |

---

## 🧪 Testing Examples Locally

### Use workspace builds (recommended)

```bash
# From the repo root
npm run build --workspaces

# Run any example
cd examples/http-api
npm install
npm start
```

### Alternative: link packages

```bash
# Link once from the repo root
npm link --workspaces

# Then inside each example
npm link @mcp-accelerator/core @mcp-accelerator/transport-http
npm install
npm start
```

---

## 🔌 MCP Request Templates

### Initialize

```jsonc
{
  "type": "request",
  "id": "init-1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": { "name": "client-demo", "version": "1.0.0" }
  }
}
```

### List tools

```jsonc
{
  "type": "request",
  "id": "tools-1",
  "method": "tools/list"
}
```

### Call a tool

```jsonc
{
  "type": "request",
  "id": "call-1",
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "message": "Hello MCP!"
    }
  }
}
```

### Receive response

```jsonc
{
  "type": "response",
  "id": "call-1",
  "result": {
    "content": [
      { "type": "text", "text": "{\"echo\":\"Hello MCP!\"}" }
    ]
  }
}
```

---

## 🏗️ Skeleton Pattern

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';

const server = new MCPServer({
  name: 'example-server',
  version: '1.0.0',
});

server.setTransport(new HttpTransport({ port: 3000 }));

server.registerTool({
  name: 'echo',
  description: 'Echo back input text',
  inputSchema: z.object({ message: z.string() }),
  handler: async (input, context) => ({
    echoed: input.message,
    clientId: context.clientId,
  }),
});

await server.start();
```

---

## 📝 Client Snippets

### HTTP (curl)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "id": "example",
    "method": "tools/call",
    "params": {
      "name": "text-stats",
      "arguments": {
        "text": "Hello world! This is a test."
      }
    }
  }'
```

### WebSocket (Node.js)

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/mcp');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'request',
    id: 'init',
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' },
  }));

  ws.send(JSON.stringify({
    type: 'request',
    id: 'call-1',
    method: 'tools/call',
    params: { name: 'add', arguments: { a: 2, b: 3 } },
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data.toString()));
});
```

---

## ✅ Best Practices

- Always send `initialize` before `tools/list` or `tools/call`.
- Use `tools/call` with `arguments` rather than the deprecated `tools/execute`.
- Keep example dependencies minimal; each project has its own `package.json`.
- Run `npm run release:prepare` at the repo root to ensure lint/tests/audit pass before sharing examples.

---

Happy experimenting! If you build a new scenario that showcases transports, resources, or prompts, feel free to open a PR.

### 6. HTTP SSE Inspector ([http-sse-inspector/](http-sse-inspector/))
Compatible with MCP Inspector via legacy HTTP + SSE transport.
