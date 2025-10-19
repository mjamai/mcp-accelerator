# HTTP API Example

Builds a REST-style MCP server that exposes tools over HTTP. Located at `examples/http-api`.

## Highlights

- Multi-tool registration (`text-stats`, `validate-json`, `array-operations`).
- Metrics & logging plugins (optional) using core plugin examples.
- Request handling with `tools/call` and MCP-compliant responses.
- Health (`/health`) endpoint provided by the transport.

## Run the example

```bash
cd examples/http-api
npm install
npm start
```

## Invoke via cURL

```bash
# 1. Initialize (handshake)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "id": "init",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "clientInfo": {"name": "curl", "version": "1.0"}
    }
  }'

# 2. List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"type":"request","id":"tools","method":"tools/list"}'

# 3. Call text-stats
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "id": "call",
    "method": "tools/call",
    "params": {
      "name": "text-stats",
      "arguments": { "text": "Hello world" }
    }
  }'
```

**Response snippet**

```json
{
  "type": "response",
  "id": "call",
  "result": {
    "content": [
      { "type": "text", "text": "{\"words\":2,\"characters\":11,\"lines\":1,...}" }
    ]
  }
}
```

## Extending

- Add auth middleware (JWT/API key) for protected tools.
- Register additional tools in `index.ts`.
- Replace logging plugins with custom observability (OpenTelemetry).
