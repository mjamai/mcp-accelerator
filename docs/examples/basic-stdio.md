# Basic STDIO Example

This example shows how to build a compliant MCP server that communicates over STDIO using the latest `tools/call` contract. The project lives in `examples/basic-stdio`.

---

## Features Demonstrated

- Automatic handling of `initialize`, `tools/list`, `tools/call`.
- Multiple tools with Zod validation (`echo`, `status`, `validate_input`).
- Lifecycle hooks for connect/disconnect and tool execution logging.
- Graceful shutdown and structured error handling.

---

## Run the Example

```bash
cd examples/basic-stdio
npm install
npm start
```

The script starts a STDIO server. All protocol traffic must flow through stdin/stdout, while logs and diagnostics go to stderr.

---

## MCP Message Flow

Send messages with newline-delimited JSON:

```bash
# 1. Initialize
echo '{"type":"request","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"demo-client","version":"1.0.0"}},"id":"init"}' | node index.ts

# 2. List tools
echo '{"type":"request","method":"tools/list","id":"list"}' | node index.ts

# 3. Call a tool
echo '{"type":"request","method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello MCP"}},"id":"call"}' | node index.ts
```

Responses follow MCP format:

```jsonc
{
  "type": "response",
  "id": "call",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"echoed\":\"Hello MCP\",\"clientId\":\"stdio-client\"}"
      }
    ]
  }
}
```

---

## Key Files

- `index.ts`: server setup, tool registration, hooks.
- `README.md`: quick instructions and sample payloads.
- `package.json`: minimal scripts and dependencies.

---

**Tips**

- Use the example as a base for CLI-style integrations.
- Customize hooks (`HookPhase.BeforeToolExecution`, etc.) to add telemetry or auditing.
- For production use, redirect stdin/stdout properly (e.g., via `cat` or `tee` in automation scripts).
