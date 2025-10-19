# Prompts & Resources Example

Shows how to combine prompt providers and resource catalogs (`examples/prompts`) while following the MCP `prompts/list` and `resources/list` contracts.

## Run the example

```bash
cd examples/prompts
npm install
npm start
```

## Features

- Registers an in-memory prompt provider with placeholders.
- Registers resource providers (filesystem + in-memory).
- Demonstrates how to emit `prompts/updated` and `resources/updated` events.
- Responds to `prompts/list`, `prompts/get`, `resources/list`, `resources/read` requests.

## Example Requests

```jsonc
// List prompts
{"type":"request","id":"prompts","method":"prompts/list"}

// Fetch a prompt template
{
  "type": "request",
  "id": "welcome",
  "method": "prompts/get",
  "params": { "id": "welcome-message" }
}

// List resources
{"type":"request","id":"resources","method":"resources/list"}

// Read a resource
{
  "type": "request",
  "id": "doc",
  "method": "resources/read",
  "params": { "uri": "memory://guides/getting-started" }
}
```

## Extending

- Replace in-memory providers with database-backed implementations.
- Hook into `server.notifyPromptsUpdated` and `server.notifyResourcesUpdated` when catalogs change.
- Combine with secure transports to expose documentation portals or onboarding guides.
