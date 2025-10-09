---
layout: page
title: "API Reference"
description: "Complete API reference for all MCP Accelerator packages and components"
---

# API Reference

Complete reference for all MCP Accelerator packages, interfaces, and components.

## 📦 Packages Overview

<div class="packages-grid">
  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/core</h3>
      <span class="package-badge primary">Core</span>
    </div>
    <p>Main server framework with tools, lifecycle hooks, and error handling.</p>
    <div class="package-links">
      <a href="./core" class="btn btn-primary">View API</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/core" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>

  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/transport-http</h3>
      <span class="package-badge">Transport</span>
    </div>
    <p>HTTP transport implementation with Fastify integration.</p>
    <div class="package-links">
      <a href="#" class="btn btn-secondary">Coming Soon</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/transport-http" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>

  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/transport-websocket</h3>
      <span class="package-badge">Transport</span>
    </div>
    <p>WebSocket transport for real-time bidirectional communication.</p>
    <div class="package-links">
      <a href="#" class="btn btn-secondary">Coming Soon</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/transport-websocket" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>

  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/middleware-auth</h3>
      <span class="package-badge warning">Middleware</span>
    </div>
    <p>Authentication middleware with JWT and API key support.</p>
    <div class="package-links">
      <a href="#" class="btn btn-secondary">Coming Soon</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/middleware-auth" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>

  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/middleware-cors</h3>
      <span class="package-badge warning">Middleware</span>
    </div>
    <p>CORS middleware for cross-origin resource sharing.</p>
    <div class="package-links">
      <a href="#" class="btn btn-secondary">Coming Soon</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/middleware-cors" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>

  <div class="package-card">
    <div class="package-header">
      <h3>@mcp-accelerator/middleware-ratelimit</h3>
      <span class="package-badge warning">Middleware</span>
    </div>
    <p>Rate limiting middleware to protect against abuse.</p>
    <div class="package-links">
      <a href="#" class="btn btn-secondary">Coming Soon</a>
      <a href="https://www.npmjs.com/package/@mcp-accelerator/middleware-ratelimit" target="_blank" class="btn btn-secondary">npm</a>
    </div>
  </div>
</div>

## 🔧 Core Components

### MCPServer

The main server class that orchestrates all MCP functionality.

```typescript
import { MCPServer } from '@mcp-accelerator/core';

const server = new MCPServer({
  name: 'My Server',
  version: '1.0.0',
  description: 'A powerful MCP server'
});
```

### ToolDefinition

Defines the structure and behavior of a tool.

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler?: ToolHandler;
}
```

### Transport Interface

Abstract interface for all transport implementations.

```typescript
interface Transport {
  start(server: MCPServer): Promise<void>;
  stop(): Promise<void>;
  onMessage(callback: MessageHandler): void;
  send(message: MCPMessage): Promise<void>;
}
```

## 📚 Quick Navigation

<div class="api-nav">
  <div class="nav-section">
    <h4>🚀 Getting Started</h4>
    <ul>
      <li><a href="./core#mcp-server">MCPServer</a></li>
      <li><a href="./core#tool-definition">ToolDefinition</a></li>
      <li><a href="./core#tool-handler">ToolHandler</a></li>
    </ul>
  </div>

  <div class="nav-section">
    <h4>🛡️ Error Handling</h4>
    <ul>
      <li><a href="./core#mcp-error">MCPError</a></li>
      <li><a href="./core#error-codes">Error Codes</a></li>
      <li><a href="./core#safe-handlers">Safe Handlers</a></li>
    </ul>
  </div>

  <div class="nav-section">
    <h4>🔄 Lifecycle Hooks</h4>
    <ul>
      <li><a href="./core#on-request">onRequest</a></li>
      <li><a href="./core#on-response">onResponse</a></li>
      <li><a href="./core#on-error">onError</a></li>
    </ul>
  </div>

  <div class="nav-section">
    <h4>📊 Observability</h4>
    <ul>
      <li><a href="./core#logging">Logging</a></li>
      <li><a href="./core#metrics">Metrics</a></li>
      <li><a href="./core#tracing">Tracing</a></li>
    </ul>
  </div>
</div>

## 🔗 External Resources

- **GitHub Repository**: [mjfphp/mcrapid](https://github.com/mjfphp/mcrapid)
- **npm Organization**: [@mcp-accelerator](https://www.npmjs.com/org/mcp-accelerator)
- **TypeScript Definitions**: Included in all packages
- **Examples**: See the [Examples section](../examples/) for practical implementations

---

*Need help with a specific API? Check the detailed [Core API documentation](./core) or browse our [examples](../examples/).*
