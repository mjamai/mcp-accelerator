# MCP Accelerator Examples

This folder contains usage examples of MCP Accelerator with different transports.

## 📦 Prerequisites

Each example requires specific package installations. Install only what you need!

## 🚀 Available Examples

### 1. Basic STDIO ([basic-stdio/](basic-stdio/))

Simple CLI server using stdin/stdout.

**Installation:**
```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
```

**Run:**
```bash
npm run build
node examples/basic-stdio/index.js
```

**Features:**
- ✅ Communication via stdin/stdout
- ✅ Simple echo tool
- ✅ No external dependencies

---

### 2. HTTP API ([http-api/](http-api/))

HTTP/REST server with data processing tools.

**Installation:**
```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-http zod
```

**Run:**
```bash
npm run build
node examples/http-api/index.js
```

**Test:**
```bash
# Health check
curl http://localhost:3000/health

# Tool call
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "id": "1",
    "method": "tools/execute",
    "params": {
      "name": "text-stats",
      "input": {
        "text": "Hello world! This is a test."
      }
    }
  }'
```

**Features:**
- ✅ REST API with Fastify
- ✅ Text processing tools
- ✅ JSON validation
- ✅ Array operations
- ✅ Logging and metrics plugins

---

### 3. WebSocket Server ([websocket-server/](websocket-server/))

Real-time calculator server with WebSocket.

**Installation:**
```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-websocket zod
```

**Run:**
```bash
npm run build
node examples/websocket-server/index.js
```

**Test client:**
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // Request tool list
  ws.send(JSON.stringify({
    type: 'request',
    id: '1',
    method: 'tools/list',
  }));

  // Execute addition
  ws.send(JSON.stringify({
    type: 'request',
    id: '2',
    method: 'tools/execute',
    params: {
      name: 'add',
      input: { a: 5, b: 3 }
    }
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data.toString()));
});
```

**Features:**
- ✅ Real-time bidirectional communication
- ✅ Calculator with add, multiply, power
- ✅ Broadcast messages to all clients
- ✅ Support for multiple simultaneous clients

---

### 4. Custom Plugin ([custom-plugin/](custom-plugin/))

Example of creating a custom plugin.

**Installation:**
```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-http zod
```

**Features:**
- ✅ Authentication plugin
- ✅ Custom middleware
- ✅ Lifecycle hooks
- ✅ Reusable across projects

---

## 🏗️ Example Structure

Each example follows this structure:

```typescript
// 1. Import required packages
import { MCPServer, z } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';

// 2. Create server
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
});

// 3. Configure transport
server.setTransport(new HttpTransport({ port: 3000 }));

// 4. Register tools
server.registerTool({
  name: 'my-tool',
  description: 'My tool',
  inputSchema: z.object({ /* ... */ }),
  handler: async (input) => { /* ... */ },
});

// 5. Start server
await server.start();
```

## 💡 Tips

### Choosing the Right Transport

- **STDIO**: CLI, scripts, integration with other processes
- **HTTP**: REST APIs, standard web integration
- **WebSocket**: Real-time, chat, push notifications
- **SSE**: Unidirectional streaming, logs, events

### Development

For development, use watch mode:

```bash
# In the root directory
npm run dev
```

This will automatically recompile all packages on changes.

### Production

For production, compile all packages:

```bash
npm run build
```

## 📚 Resources

- [Main documentation](../README.md)
- [Core Package](../packages/core/README.md)
- [STDIO Transport](../packages/transport-stdio/README.md)
- [HTTP Transport](../packages/transport-http/README.md)
- [WebSocket Transport](../packages/transport-websocket/README.md)
- [SSE Transport](../packages/transport-sse/README.md)

## 🤝 Contributing

Feel free to propose new examples via a Pull Request!
