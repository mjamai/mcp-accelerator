# Changelog

All notable changes to MCP Accelerator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-03

### Added

- Initial release of MCP Accelerator
- Core server implementation with `createServer()` function
- Multi-transport support:
  - STDIO transport for command-line applications
  - HTTP transport with Fastify
  - WebSocket transport for real-time communication
  - SSE (Server-Sent Events) transport for streaming
- Dynamic tool registration with Zod validation
- Plugin system for extensibility
- Built-in plugins:
  - LoggingPlugin for request/response logging
  - MetricsPlugin for execution statistics
  - RateLimitPlugin for request throttling
- Middleware system for message processing
- Lifecycle hooks:
  - onStart, onStop
  - onClientConnect, onClientDisconnect
  - beforeToolExecution, afterToolExecution
- CLI with code generators:
  - `create-project` - Generate complete MCP server projects
  - `generate-tool` - Generate tool templates with tests
  - `generate-transport` - Generate custom transport implementations
- Comprehensive error handling with standard MCP error codes
- Type-safe tool definitions with TypeScript
- Customizable logging with Logger interface
- Complete examples:
  - Basic STDIO server
  - WebSocket calculator server
  - HTTP API server with data processing
  - Custom authentication plugin
- Full TypeScript support with type definitions
- Comprehensive test suite with Jest
- Complete documentation and README
- Contributing guidelines

### Features

- ✨ Simple and intuitive API
- 🔌 Pluggable transport layer
- 🛠️ Type-safe tool definitions
- 🧩 Extensible plugin system
- 📝 Automatic input validation
- ⚡ High performance
- 🔄 Hot-swappable transports
- 🎨 CLI for rapid development
- 📚 Rich documentation and examples

### Technical Details

- Built with TypeScript 5.3+
- Uses Zod for schema validation
- Fastify for HTTP/SSE transports
- ws library for WebSocket support
- Commander for CLI framework
- Jest for testing
- TypeDoc for documentation generation

---

## Future Releases

### [1.1.0] - Planned

- [ ] gRPC transport support
- [ ] Redis pub/sub transport
- [ ] Built-in authentication plugin
- [ ] Request caching middleware
- [ ] Distributed tracing support
- [ ] Performance monitoring dashboard
- [ ] Multi-language RPC interfaces

### [1.2.0] - Planned

- [ ] GraphQL endpoint support
- [ ] Tool composition and chaining
- [ ] Built-in tool marketplace
- [ ] Visual server builder
- [ ] Enhanced CLI with interactive mode
- [ ] Cloud deployment helpers

---

For more details on each release, see the [GitHub Releases](https://github.com/your-org/mcp-accelerator/releases) page.

