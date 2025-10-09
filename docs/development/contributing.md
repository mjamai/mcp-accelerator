# Contributing to MCP Accelerator

Thank you for your interest in contributing to MCP Accelerator! 🚀 This guide will help you get started with development, testing, and submitting contributions.

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+
- **npm** 8+
- **Git**
- **TypeScript** knowledge

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/mjfphp/mcrapid.git
cd mcrapid

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Project Structure

```
mcrapid/
├── packages/           # Monorepo packages
│   ├── core/          # Core MCP server framework
│   ├── middleware-*/  # Middleware packages
│   └── transport-*/   # Transport implementations
├── examples/          # Example applications
├── docs/             # Documentation
├── scripts/          # Build and deployment scripts
└── tests/            # Integration tests
```

## 🔧 Development Workflow

### 1. Create a Branch

```bash
# Create feature branch from main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

### 2. Make Changes

- Write your code following our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -- --testPathPattern=packages/core

# Run integration tests
npm run test:integration

# Check TypeScript compilation
npm run build

# Lint code
npm run lint
```

### 4. Commit Your Changes

```bash
# Use conventional commits
git commit -m "feat: add new authentication middleware"
git commit -m "fix: resolve memory leak in WebSocket transport"
git commit -m "docs: update API documentation"
```

### 5. Submit a Pull Request

- Push your branch: `git push origin feature/your-feature-name`
- Create a pull request on GitHub
- Fill out the PR template
- Request review from maintainers

## 📝 Coding Standards

### TypeScript Guidelines

- Use **strict mode** TypeScript
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for public APIs
- Avoid `any` type unless absolutely necessary

```typescript
// ✅ Good
interface ServerConfig {
  name: string;
  version: string;
  port?: number;
}

function createServer(config: ServerConfig): Promise<MCPServer> {
  // implementation
}

// ❌ Avoid
function createServer(config: any): any {
  // implementation
}
```

### Error Handling

- Use our centralized error handling system
- Create specific error types for different scenarios
- Always provide meaningful error messages

```typescript
import { createMCPError, MCPErrorCode } from '@mcp-accelerator/core';

// ✅ Good
if (!input.message) {
  throw createMCPError(
    MCPErrorCode.VALIDATION_ERROR,
    'Message is required'
  );
}

// ❌ Avoid
throw new Error('Invalid input');
```

### Testing Standards

- Write **unit tests** for all new functions
- Write **integration tests** for transport and middleware
- Aim for **>90% code coverage**
- Use descriptive test names

```typescript
// ✅ Good
describe('HTTPTransport', () => {
  describe('when handling requests', () => {
    it('should return 200 for valid tool calls', async () => {
      // test implementation
    });

    it('should return 400 for invalid input schema', async () => {
      // test implementation
    });
  });
});
```

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Test both success and error cases

```typescript
import { MCPServer } from '../src/core/server';
import { ToolDefinition } from '../src/types';

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer({
      name: 'Test Server',
      version: '1.0.0'
    });
  });

  it('should register tools correctly', () => {
    const tool: ToolDefinition = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: { type: 'object' }
    };

    server.addTool(tool, async () => ({ content: [] }));
    
    expect(server.getTool('test-tool')).toBeDefined();
  });
});
```

### Integration Tests

- Test complete workflows
- Use real transports and middleware
- Test error scenarios

```typescript
describe('HTTP Transport Integration', () => {
  it('should handle concurrent requests', async () => {
    const server = new MCPServer({ name: 'Test', version: '1.0.0' });
    const transport = new HTTPTransport({ port: 0 }); // Random port
    
    server.start(transport);
    
    // Test concurrent requests
    const requests = Array(10).fill(null).map(() => 
      fetch(`http://localhost:${transport.port}/tools/test`)
    );
    
    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
```

## 📚 Documentation Requirements

### Code Documentation

- Document all public APIs with JSDoc
- Include usage examples
- Explain complex algorithms

```typescript
/**
 * Creates a new MCP server instance
 * @param config - Server configuration options
 * @returns Promise resolving to configured server
 * @example
 * ```typescript
 * const server = await createServer({
 *   name: 'My Server',
 *   version: '1.0.0'
 * });
 * ```
 */
export async function createServer(config: ServerConfig): Promise<MCPServer> {
  // implementation
}
```

### README Updates

- Update package READMEs for new features
- Include installation and usage examples
- Document breaking changes

## 🚀 Release Process

### Version Management

- Use **semantic versioning** (semver)
- Update version numbers in all affected packages
- Update CHANGELOG.md with changes

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version numbers are bumped
- [ ] Packages are built successfully
- [ ] Release notes are prepared

## 🐛 Bug Reports

When reporting bugs, include:

1. **Environment details**: Node.js version, OS, package versions
2. **Reproduction steps**: Clear steps to reproduce the issue
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Error logs**: Complete error messages and stack traces
6. **Minimal example**: Code that demonstrates the issue

## 💡 Feature Requests

When requesting features:

1. **Use case**: Explain why this feature is needed
2. **Proposed solution**: Describe your ideal implementation
3. **Alternatives**: What alternatives have you considered?
4. **Breaking changes**: Would this require breaking changes?

## 🤝 Code of Conduct

Please read and follow our [Code of Conduct](../CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## 📞 Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions

## 🎉 Recognition

Contributors will be recognized in:
- CHANGELOG.md
- GitHub contributors list
- Release notes

Thank you for contributing to MCP Accelerator! 🙏

---

*Happy coding! If you have questions, don't hesitate to ask in [GitHub Discussions](https://github.com/mjfphp/mcrapid/discussions).*
