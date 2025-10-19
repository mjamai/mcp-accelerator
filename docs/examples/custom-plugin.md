# Custom Plugin Example

Describes the plugin demonstration located at `examples/custom-plugin`.

## Overview

- Defines a simple plugin with lifecycle hooks (`initialize`, `cleanup`).
- Shows how to register the plugin within a server.
- Emits audit logs when tools are executed.

## Run

```bash
cd examples/custom-plugin
npm install
npm start
```

## Key Concepts

- Plugins can register hooks for MCP lifecycle events.
- Plugins can add middleware or mutate the server configuration.
- Audit records demonstrate how to trace tool executions.
