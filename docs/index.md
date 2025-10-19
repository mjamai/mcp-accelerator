---
layout: page
title: "MCP Accelerator Documentation"
description: "Modern, modular, and high-performance framework for building MCP servers in TypeScript"
---

<div class="hero-section">
  <div class="hero-content">
    <h1 class="hero-title">MCP Accelerator</h1>
    <p class="hero-description">
      Modern, modular, and high-performance framework for building Model Context Protocol (MCP) servers in TypeScript. 
      Create robust, scalable servers with built-in authentication, observability, and multi-transport support.
    </p>
    <div class="hero-actions">
      <a href="./guides/getting-started" class="btn btn-primary">Get Started</a>
      <a href="https://github.com/mjfphp/mcrapid" class="btn btn-secondary" target="_blank">View on GitHub</a>
      <a href="https://www.npmjs.com/org/mcp-accelerator" class="btn btn-secondary" target="_blank">View on npm</a>
    </div>
  </div>
</div>

## 🎯 Quick Start

Get up and running in minutes:

```bash
npm install @mcp-accelerator/core
npx mcp-accelerator create-project my-server --transport http
cd my-server
npm run dev
```

<div class="alert alert-info">
<strong>🚀 New in v1.0.0:</strong> Production-ready middleware, enhanced error handling, and comprehensive observability features.
</div>

## ✨ Why Choose MCP Accelerator?

<div class="features-grid">
  <div class="feature-card">
    <div class="feature-icon">🚀</div>
    <h3>High Performance</h3>
    <p>Built for speed and scalability with optimized transports and efficient middleware pipeline.</p>
  </div>
  
  <div class="feature-card">
    <div class="feature-icon">🔧</div>
    <h3>Modular Architecture</h3>
    <p>Use only what you need with a plugin-based architecture and independent package versions.</p>
  </div>
  
  <div class="feature-card">
    <div class="feature-icon">🛡️</div>
    <h3>Production Ready</h3>
    <p>Built-in security, monitoring, error handling, and all the features you need for production.</p>
  </div>
  
  <div class="feature-card">
    <div class="feature-icon">📱</div>
    <h3>Multi-Transport</h3>
    <p>HTTP, WebSocket, SSE, and STDIO transports with unified interface and easy switching.</p>
  </div>
  
  <div class="feature-card">
    <div class="feature-icon">🔌</div>
    <h3>Extensible</h3>
    <p>Plugin system for custom functionality and comprehensive lifecycle hooks for observability.</p>
  </div>
  
  <div class="feature-card">
    <div class="feature-icon">🎯</div>
    <h3>TypeScript First</h3>
    <p>Full type safety, IntelliSense support, and excellent developer experience out of the box.</p>
  </div>
</div>

## 📚 Documentation Sections

### 🚀 [Getting Started](./guides/getting-started.md)
Learn the basics and create your first MCP server in minutes.

### 📖 [Core Concepts](./guides/core-concepts.md)
Understand the architecture, components, and request lifecycle.

### 🔧 [Transport Layer](./guides/transports.md)
Choose the right transport for your use case: HTTP, WebSocket, SSE, or STDIO.

### 🛡️ [Security](./guides/security.md)
Harden transports, authenticate clients, and audit plugins without breaking protocol guarantees.

### 🧠 [Middleware System](./guides/middleware.md)
Add authentication, CORS, rate limiting, observability, and resilience middleware.

### 📁 [Resources](./guides/resources.md)
Compile documentation, code snippets, and assets via resource providers.

### 🗣️ [Prompts](./guides/prompts.md)
Build reusable prompt packs with typed placeholders and broadcast updates to clients.

### 📊 [Observability](./guides/observability.md)
Capture metrics, traces, and structured logs with OpenTelemetry and transport hooks.

### 🚢 [Deployment & Operations](./guides/deployment.md)
Ship MCP servers to production with repeatable builds, health checks, and rollout strategies.

### 🧭 [Step-by-Step Tutorials](./guides/tutorials.md)
Follow guided walkthroughs for STDIO assistants, HTTP deployments, and telemetry-enabled servers.

## 🔧 API Reference

### [Core API](./api/core.md)
Complete reference for the core server, tools, and lifecycle hooks.

### [Middleware APIs](./api/middleware.md)
All available middleware components and their configurations.

### [Transport APIs](./api/transports.md)
Transport-specific configurations and options.

### [TypeScript Types](./api/types.md)
Complete type definitions and interfaces.

## 💡 Examples

### [Basic STDIO Server](./examples/basic-stdio.md)
Simple command-line tool integration.

### [HTTP API Server](./examples/http-api.md)
REST API server with HTTP transport.

### [WebSocket Server](./examples/websocket-server.md)
Real-time bidirectional communication.

### [Basic STDIO](./examples/basic-stdio.md)
CLI-ready STDIO server with hooks and validation.

### [HTTP API](./examples/http-api.md)
REST-style MCP server with multiple tools.

### [WebSocket Server](./examples/websocket-server.md)
Real-time calculator with broadcast support.

### [Secure API](./examples/secure-api.md)
Authentication, rate limiting, and RBAC policies.

### [Prompts & Resources](./examples/prompts.md)
Prompt provider and resource catalog demo.

### [Custom Plugin](./examples/custom-plugin.md)
Example plugin registering hooks and audit logs.

### [Production-Ready Server](./examples/production-ready.md)
Full-featured server with authentication, TLS, and monitoring.

## 🛠️ Development

### [Contributing Guide](./development/contributing.md)
How to contribute to MCP Accelerator development.

### [Architecture Overview](./development/architecture.md)
Deep dive into the internal architecture and design decisions.

### [Testing Guide](./development/testing.md)
Writing tests and ensuring code quality.

### [Release Process](./development/releases.md)
How we version and release packages.

## 🎯 Key Features

- **🚀 High Performance**: Built for speed and scalability
- **🔧 Modular Architecture**: Use only what you need
- **🛡️ Production Ready**: Built-in security, monitoring, and error handling
- **📱 Multi-Transport**: HTTP, WebSocket, SSE, and STDIO support
- **🔌 Extensible**: Plugin system for custom functionality
- **📊 Observability**: Built-in metrics, logging, and tracing
- **🎯 TypeScript First**: Full type safety and IntelliSense support

## 🤝 Community

- **GitHub**: [mjfphp/mcrapid](https://github.com/mjfphp/mcrapid)
- **npm**: [@mcp-accelerator](https://www.npmjs.com/org/mcp-accelerator)
- **Discussions**: [GitHub Discussions](https://github.com/mjfphp/mcrapid/discussions)
- **Issues**: [Report bugs or request features](https://github.com/mjfphp/mcrapid/issues)

## 📦 Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@mcp-accelerator/core` | Core MCP server framework | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/core.svg)](https://www.npmjs.com/package/@mcp-accelerator/core) |
| `@mcp-accelerator/transport-http` | HTTP transport implementation | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/transport-http.svg)](https://www.npmjs.com/package/@mcp-accelerator/transport-http) |
| `@mcp-accelerator/transport-websocket` | WebSocket transport implementation | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/transport-websocket.svg)](https://www.npmjs.com/package/@mcp-accelerator/transport-websocket) |
| `@mcp-accelerator/transport-sse` | Server-Sent Events transport | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/transport-sse.svg)](https://www.npmjs.com/package/@mcp-accelerator/transport-sse) |
| `@mcp-accelerator/transport-stdio` | STDIO transport for CLI tools | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/transport-stdio.svg)](https://www.npmjs.com/package/@mcp-accelerator/transport-stdio) |
| `@mcp-accelerator/middleware-auth` | Authentication middleware | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/middleware-auth.svg)](https://www.npmjs.com/package/@mcp-accelerator/middleware-auth) |
| `@mcp-accelerator/middleware-cors` | CORS middleware | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/middleware-cors.svg)](https://www.npmjs.com/package/@mcp-accelerator/middleware-cors) |
| `@mcp-accelerator/middleware-ratelimit` | Rate limiting middleware | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/middleware-ratelimit.svg)](https://www.npmjs.com/package/@mcp-accelerator/middleware-ratelimit) |
| `@mcp-accelerator/middleware-resilience` | Circuit breaker and retry logic | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/middleware-resilience.svg)](https://www.npmjs.com/package/@mcp-accelerator/middleware-resilience) |
| `@mcp-accelerator/middleware-observability` | Logging, metrics, and tracing | [![npm version](https://img.shields.io/npm/v/@mcp-accelerator/middleware-observability.svg)](https://www.npmjs.com/package/@mcp-accelerator/middleware-observability) |

## 🆕 What's New in v1.0.0

- 🛡️ **Safe Handler Utilities** - Automatic timeout, retry, and circuit breaker support
- 🔍 **Enhanced Error Handling** - User-friendly error formatting and validation
- 📊 **Observability Hooks** - Built-in request/response lifecycle hooks
- 🚀 **Production Example** - Complete production-ready server template
- 🔧 **Improved Testing** - Comprehensive integration tests and CI/CD
- 📚 **Complete Documentation** - Comprehensive guides and API reference

---

*Ready to build something amazing? Start with [Getting Started](./guides/getting-started.md)!* 🚀
