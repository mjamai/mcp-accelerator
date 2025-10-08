# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial modular monorepo architecture
- Split into 5 packages: core + 4 transports
- HookPhase enum for type-safe lifecycle hooks

## [1.0.0] - 2025-01-08

### Added
- 🎯 Core package with server and types
- 📝 STDIO transport (no external dependencies)
- 🌐 HTTP transport (Fastify-based)
- 🔌 WebSocket transport (ws-based)
- 📡 Server-Sent Events transport
- 🛠️ Type-safe tools with Zod schema validation
- 🧩 Plugin system for extensibility
- 🪝 Lifecycle hooks (6 phases)
- ⚙️ Middleware support
- 📚 Complete TypeScript support
- 📖 Comprehensive documentation and examples

### Architecture
- Modular package structure for optimal bundle size
- npm workspaces for monorepo management
- Independent transport packages
- Zod as peer dependency

### Performance
- 90% smaller bundle for CLI applications (STDIO only)
- ~500 KB core package (vs ~5 MB monolithic)
- Optimal tree-shaking support
- Faster installation times (~5s vs ~30s minimal setup)

### Documentation
- README with usage examples
- Individual README for each package
- Example projects for all transports
- Architecture documentation
- Migration guide (for future versions)

[Unreleased]: https://github.com/mohamedjamai/mcp-accelerator/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mohamedjamai/mcp-accelerator/releases/tag/v1.0.0
