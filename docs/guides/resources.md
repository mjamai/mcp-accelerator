# Managing Resources

The MCP Accelerator exposes resources through pluggable providers. Once registered, the server handles `resources/list` and `resources/read` requests and broadcasts `resources/updated` events when catalogs change.

## Register Providers

```ts
import { MCPServer, FilesystemResourceProvider } from '@mcp-accelerator/core';
import path from 'node:path';

const server = new MCPServer({ name: 'docs', version: '1.0.0' });

server.registerResourceProvider(
  new FilesystemResourceProvider('docs', 'Project Docs', {
    rootPath: path.join(process.cwd(), 'docs'),
    includeExtensions: ['.md', '.txt'],
  }),
);
```

## Broadcast Updates

```ts
await server.notifyResourcesUpdated({
  uris: ['resource://docs/update-guide'],
  reason: 'sync',
});
```

Clients receive an MCP event:

```json
{
  "type": "event",
  "method": "resources/updated",
  "params": {
    "listChanged": true,
    "uris": ["resource://docs/update-guide"],
    "reason": "sync"
  }
}
```
