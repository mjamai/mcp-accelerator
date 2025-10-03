# Contributing to MCP Accelerator

Thank you for your interest in contributing to MCP Accelerator! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/mcp-accelerator.git
cd mcp-accelerator
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the project**

```bash
npm run build
```

4. **Run tests**

```bash
npm test
```

## Project Structure

```
mcp-accelerator/
├── src/
│   ├── core/           # Core server implementation
│   ├── transports/     # Transport implementations
│   ├── plugins/        # Plugin system and built-in plugins
│   ├── cli/            # CLI and code generators
│   ├── types/          # TypeScript type definitions
│   ├── factory.ts      # Server factory function
│   └── index.ts        # Main entry point
├── examples/           # Example projects
├── docs/              # Generated documentation
└── tests/             # Additional tests

```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for public APIs
- Use types for internal implementations

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Comments

- Write comments in English
- Document all public APIs with JSDoc
- Explain "why" not "what" in inline comments
- Keep comments up-to-date

Example:

```typescript
/**
 * Execute a tool with input validation
 * 
 * @param toolName - Name of the tool to execute
 * @param input - Input data for the tool
 * @param context - Execution context
 * @returns Promise resolving to execution result
 */
async executeTool<O = unknown>(
  toolName: string,
  input: unknown,
  context: ToolContext
): Promise<ToolExecutionResult<O>>
```

## Testing

### Writing Tests

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:

```typescript
describe('ToolManager', () => {
  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      // Arrange
      const toolManager = new ToolManager(new SilentLogger());
      const tool = createTestTool();

      // Act
      toolManager.registerTool(tool);

      // Assert
      expect(toolManager.hasTool(tool.name)).toBe(true);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Pull Request Process

1. **Create a branch**

```bash
git checkout -b feature/my-new-feature
```

2. **Make your changes**

- Write code following the coding standards
- Add tests for new functionality
- Update documentation as needed

3. **Run checks**

```bash
npm run lint
npm test
npm run build
```

4. **Commit your changes**

Use conventional commit messages:

```
feat: add new transport type
fix: resolve memory leak in WebSocket transport
docs: update API documentation
test: add tests for plugin manager
refactor: simplify error handling logic
```

5. **Push and create PR**

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Detailed description of what and why
- Link to related issues
- Screenshots if applicable

## Adding New Features

### Adding a Transport

1. Extend `BaseTransport` class
2. Implement required methods
3. Add tests
4. Update documentation
5. Add example usage

### Adding a Plugin

1. Implement `Plugin` interface
2. Add initialization logic
3. Include cleanup logic
4. Write comprehensive tests
5. Document usage

### Adding CLI Commands

1. Add command to `src/cli/index.ts`
2. Create templates if needed
3. Add tests
4. Update CLI documentation

## Documentation

- Update README.md for user-facing changes
- Generate API docs: `npm run docs`
- Add examples for new features
- Keep CHANGELOG.md updated

## Questions?

- Open an issue for bugs
- Start a discussion for feature requests
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

