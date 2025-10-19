# Secure MCP API Example

Summarises the security-first HTTP example located at `examples/secure-api` with JWT, API keys, and layered rate limiting.

## Run the example

```bash
cd examples/secure-api
npm install
cp .env.example .env
# Update secrets inside .env (JWT_SECRET, API_KEYS)
npm start
```

## Quick tests

### Initialize and list tools

```bash
curl http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: service-key-1" \
  -d '{"type":"request","id":"init","method":"initialize","params":{"protocolVersion":"2024-11-05"}}'

curl http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: service-key-1" \
  -d '{"type":"request","id":"tools","method":"tools/list"}'
```

### Call a protected tool

```bash
curl http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: service-key-1" \
  -d '{
    "type": "request",
    "id": "status",
    "method": "tools/call",
    "params": {
      "name": "get-status",
      "arguments": {}
    }
  }'
```

## Notes

- Supports JWT authentication (set `Authorization: Bearer <token>`).
- Rate limits both globally and per-user, returning MCP errors when exceeded.
- Demonstrates metadata usage (`context.metadata.user`) inside tool handlers.
- Logs security events to aid auditing.
