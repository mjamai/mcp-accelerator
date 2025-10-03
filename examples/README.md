# MCP Accelerator Examples

This directory contains various examples demonstrating different features of MCP Accelerator.

## Examples

### 1. Basic STDIO (`basic-stdio/`)

Simple echo server using STDIO transport. Perfect for command-line tools and CLI integrations.

**Features:**
- STDIO transport
- Basic tool registration
- Simple echo functionality

**Run:**
```bash
cd examples/basic-stdio
npx ts-node index.ts
```

### 2. WebSocket Server (`websocket-server/`)

Real-time calculator server using WebSocket transport. Demonstrates bidirectional communication.

**Features:**
- WebSocket transport
- Multiple mathematical tools
- Real-time communication
- Graceful shutdown

**Run:**
```bash
cd examples/websocket-server
npx ts-node index.ts
```

**Test with a WebSocket client:**
```javascript
const ws = new WebSocket('ws://127.0.0.1:3001');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'request',
    id: '1',
    method: 'tools/execute',
    params: {
      name: 'add',
      input: { a: 5, b: 3 }
    }
  }));
});
```

### 3. HTTP API (`http-api/`)

RESTful API server with data processing tools. Includes plugins for logging and metrics.

**Features:**
- HTTP transport
- Text processing tools
- JSON validation
- Array operations
- Built-in plugins (Logging, Metrics)

**Run:**
```bash
cd examples/http-api
npx ts-node index.ts
```

**Test with curl:**
```bash
# List tools
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"type":"request","id":"1","method":"tools/list"}'

# Execute tool
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "id": "2",
    "method": "tools/execute",
    "params": {
      "name": "text-stats",
      "input": {"text": "Hello world, this is a test"}
    }
  }'
```

### 4. Custom Plugin (`custom-plugin/`)

Demonstrates creating custom plugins for authentication and authorization.

**Features:**
- Custom authentication plugin
- Middleware for token validation
- Protected endpoints
- Lifecycle hooks

**Run:**
```bash
cd examples/custom-plugin
npx ts-node index.ts
```

**Test with authentication:**
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-auth-token: secret-token-123" \
  -d '{
    "type": "request",
    "id": "1",
    "method": "tools/execute",
    "params": {
      "name": "secret-operation",
      "input": {"data": "confidential"}
    }
  }'
```

## Common Patterns

### Tool Registration

```typescript
server.registerTool({
  name: 'my-tool',
  description: 'Description of what the tool does',
  inputSchema: z.object({
    param: z.string(),
  }),
  handler: async (input, context) => {
    return { result: 'processed' };
  },
});
```

### Custom Middleware

```typescript
server.registerMiddleware({
  name: 'my-middleware',
  priority: 50,
  handler: async (message, context, next) => {
    // Pre-processing
    await next();
    // Post-processing
  },
});
```

### Lifecycle Hooks

```typescript
server.registerHook({
  name: 'my-hook',
  phase: 'beforeToolExecution',
  handler: async (ctx) => {
    console.log('Tool about to execute:', ctx.toolName);
  },
});
```

## Next Steps

- Explore the source code of each example
- Modify examples to suit your needs
- Create your own tools and plugins
- Refer to the main [README](../README.md) for full documentation

