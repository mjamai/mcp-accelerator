# @mcp-accelerator/transport-sse

Server-Sent Events (SSE) transport for MCP Accelerator. Unidirectional server-to-client streaming.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-sse zod
```

## Usage

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { SSETransport } from '@mcp-accelerator/transport-sse';

const server = new MCPServer({
  name: 'my-sse-server',
  version: '1.0.0',
});

// Use SSE transport
server.setTransport(new SSETransport({
  host: '0.0.0.0',
  port: 3002,
}));

server.registerTool({
  name: 'stream',
  description: 'Stream data to client',
  inputSchema: z.object({
    count: z.number(),
  }),
  handler: async (input) => {
    return { streamed: input.count };
  },
});

await server.start();
```

## Configuration

```typescript
new SSETransport({
  host: '127.0.0.1', // Listen address (default: '127.0.0.1')
  port: 3002,        // Listen port (default: 3002)
})
```

## Endpoints

- `GET /mcp/events` - Subscribe to SSE stream
- `POST /mcp/message` - Send a message to the server
- `GET /health` - Health check

## Features

- ✅ Server-to-client streaming
- ✅ Broadcast support
- ✅ Automatic client-side reconnection
- ✅ Built-in keep-alive (30 seconds)
- ✅ Compatible with EventSource API

## Client Example

```javascript
const eventSource = new EventSource('http://localhost:3002/mcp/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'connected') {
    console.log('Connected with client ID:', data.clientId);
  } else {
    console.log('Received:', data);
  }
};

// To send messages to the server
fetch('http://localhost:3002/mcp/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-ID': clientId,
  },
  body: JSON.stringify({
    type: 'request',
    id: '1',
    method: 'tools/list',
  }),
});
```

## License

MIT
