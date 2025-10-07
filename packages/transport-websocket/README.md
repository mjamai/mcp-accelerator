# @mcp-accelerator/transport-websocket

WebSocket transport for MCP Accelerator. Real-time bidirectional communication.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-websocket zod
```

## Usage

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { WebSocketTransport } from '@mcp-accelerator/transport-websocket';

const server = new MCPServer({
  name: 'my-websocket-server',
  version: '1.0.0',
});

// Use WebSocket transport
server.setTransport(new WebSocketTransport({
  host: '0.0.0.0',
  port: 3001,
}));

server.registerTool({
  name: 'notify',
  description: 'Send a notification',
  inputSchema: z.object({
    message: z.string(),
  }),
  handler: async (input) => {
    return { notification: input.message };
  },
});

await server.start();
```

## Configuration

```typescript
new WebSocketTransport({
  host: '127.0.0.1', // Listen address (default: '127.0.0.1')
  port: 3001,        // Listen port (default: 3001)
})
```

## Features

- ✅ Real-time bidirectional communication
- ✅ Broadcast support to all clients
- ✅ Automatic reconnection handling
- ✅ Based on 'ws' library (performant and stable)

## Client Example

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'request',
    id: '1',
    method: 'tools/list',
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

## License

MIT
