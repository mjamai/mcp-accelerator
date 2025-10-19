"use strict";
/**
 * Templates for generating resource providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResourceTest = exports.generateResourceFile = void 0;
const pascalCase = (value) => value
    .replace(/[-_ ]+/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
function generateResourceFile(options) {
    const className = pascalCase(options.name);
    const description = options.description ?? 'Describe the resource provider purpose';
    return `import { ResourceProvider, ResourceProviderContext, ResourceDescriptor, ResourceContent } from 'mcp-accelerator';

/**
 * ${className}ResourceProvider
 * ${description}
 */
export class ${className}ResourceProvider implements ResourceProvider {
  public readonly id = '${options.name}';
  public readonly displayName = '${className} Resources';

  async listResources(_context: ResourceProviderContext): Promise<ResourceDescriptor[]> {
    // TODO: replace with your resource discovery logic
    return [
      {
        uri: '${options.name}://example',
        name: 'example.txt',
        description: 'Sample resource',
        mimeType: 'text/plain',
      },
    ];
  }

  async readResource(uri: string, _context: ResourceProviderContext): Promise<ResourceContent> {
    // TODO: replace with your resource reading logic
    if (uri !== '${options.name}://example') {
      throw new Error(\`Resource not found: \${uri}\`);
    }

    return {
      uri,
      mimeType: 'text/plain',
      data: 'Hello from ${className}ResourceProvider',
      encoding: 'utf-8',
    };
  }
}
`;
}
exports.generateResourceFile = generateResourceFile;
function generateResourceTest(options) {
    const className = pascalCase(options.name);
    return `import { ${className}ResourceProvider } from '../${options.name}.resource';

describe('${className}ResourceProvider', () => {
  it('lists resources', async () => {
    const provider = new ${className}ResourceProvider();
    const resources = await provider.listResources({ logger: console, metadata: {} });
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);
  });

  it('reads a resource', async () => {
    const provider = new ${className}ResourceProvider();
    const resource = await provider.readResource('${options.name}://example', { logger: console, metadata: {} });
    expect(resource.mimeType).toBe('text/plain');
  });
});
`;
}
exports.generateResourceTest = generateResourceTest;
//# sourceMappingURL=resource-template.js.map