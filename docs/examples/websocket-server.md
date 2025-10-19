# WebSocket Example

Real-time calculator server that communicates with MCP clients over WebSocket (`examples/websocket-server`).

## Highlights

- Supports the handshake (`initialize`), `tools/list`, `tools/call`.
- Provides math tools (`add`, `multiply`, `power`) plus a broadcast tool.
- Demonstrates how to broadcast events to all connected clients.
- Shows minimal configuration for the WebSocket transport.

## Run the example

```bash
cd examples/websocket-server
npm install
npm start
```

Default endpoint: `ws://127.0.0.1:3001/mcp`.

## JavaScript test client

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3001/mcp');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'request',
    id: 'init',
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' }
  }));

  ws.send(JSON.stringify({
    type: 'request',
    id: 'tools',
    method: 'tools/list'
  }));

  ws.send(JSON.stringify({
    type: 'request',
    id: 'calc',
    method: 'tools/call',
    params: { name: 'add', arguments: { a: 2, b: 5 } }
  }));
});

ws.on('message', (raw) => {
  const message = JSON.parse(raw.toString());
  console.log('Received:', message);
});
```

## MCP response example

```json
{
  "type": "response",
  "id": "calc",
  "result": {
    "content": [
      { "type": "text", "text": "{\"operation\":\"addition\",\"result\":7}" }
    ]
  }
}
```

## Extending

- Replace math handlers with domain-specific tools.
- Add middleware for authentication or rate limiting.
- Broadcast server status updates using the `broadcast` tool.
+