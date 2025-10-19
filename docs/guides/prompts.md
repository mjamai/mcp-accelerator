# Working with Prompts

Prompt providers enable typed prompts with placeholders that can be fetched via `prompts/list` and `prompts/get`.

## Register Prompts

```ts
import { MCPServer, InMemoryPromptProvider } from '@mcp-accelerator/core';

const server = new MCPServer({ name: 'prompt-server', version: '1.0.0' });

server.registerPromptProvider(
  new InMemoryPromptProvider('builtin', 'Built-in prompts', [
    {
      id: 'welcome-user',
      title: 'Welcome',
      placeholders: [{ id: 'name', required: true }],
      content: [
        { role: 'system', text: 'You are a helpful assistant.' },
        { role: 'user', text: 'Greet {{name}} warmly.' },
      ],
    },
  ]),
);
```

## Notify Clients

```ts
await server.notifyPromptsUpdated({
  promptIds: ['welcome-user'],
  reason: 'refresh',
});
```

Clients receive:

```json
{
  "type": "event",
  "method": "prompts/updated",
  "params": {
    "listChanged": true,
    "promptIds": ["welcome-user"],
    "reason": "refresh"
  }
}
```
