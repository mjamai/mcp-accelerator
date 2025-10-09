---
layout: page
title: "MCP Accelerator Documentation"
description: "Modern, modular, and high-performance framework for building MCP servers in TypeScript"
---

Welcome to the comprehensive documentation for **MCP Accelerator** - a modern, modular, and high-performance framework for building Model Context Protocol (MCP) servers in TypeScript.

## 🎯 Quick Start

Get up and running in minutes:

```bash
# Install the core package
npm install @mcp-accelerator/core

# Create your first server
npx @mcp-accelerator/cli create my-server
```

<div class="alert alert-info">
<strong>🚀 New in v1.0.0:</strong> Production-ready middleware, enhanced error handling, and comprehensive observability features.
</div>

## 📚 Documentation Sections

### 🚀 [Getting Started](./guides/getting-started.md)
Learn the basics and create your first MCP server in minutes.

### 📖 [Core Concepts](./guides/core-concepts.md)
Understand the architecture, components, and request lifecycle.

### 🔧 [Transport Layer](./guides/transports.md)
Choose the right transport for your use case: HTTP, WebSocket, SSE, or STDIO.

### 🛡️ [Middleware System](./guides/middleware.md)
Add authentication, CORS, rate limiting, observability, and more.

### ⚠️ [Error Handling](./guides/error-handling.md)
Implement robust error handling and debugging strategies.

### 🚀 [Production Deployment](./guides/production.md)
Best practices for deploying MCP servers in production environments.

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

### [Production-Ready Server](./examples/production-ready.md)
Full-featured server with authentication, TLS, and monitoring.

### [Custom Middleware](./examples/custom-middleware.md)
Creating custom middleware for specific needs.

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
