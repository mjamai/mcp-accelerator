"use strict";
/**
 * Templates for generating prompt providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePromptTest = exports.generatePromptFile = void 0;
const pascalCase = (value) => value
    .replace(/[-_ ]+/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
function generatePromptFile(options) {
    const className = pascalCase(options.name);
    const description = options.description ?? 'Describe the prompt pack purpose';
    return `import { PromptProvider, PromptProviderContext, PromptDefinition } from 'mcp-accelerator';

/**
 * ${className}PromptProvider
 * ${description}
 */
export class ${className}PromptProvider implements PromptProvider {
  public readonly id = '${options.name}';
  public readonly displayName = '${className} Prompt Pack';

  async listPrompts(_context: PromptProviderContext): Promise<PromptDefinition[]> {
    return [
      {
        id: '${options.name}-welcome',
        title: '${className} welcome message',
        description: 'Greets a user with their name',
        placeholders: [
          { id: 'name', description: 'Name of the user', required: true },
        ],
        content: [
          { role: 'system', text: 'You are a helpful assistant.' },
          { role: 'user', text: 'Please welcome {{name}} to the project.' },
        ],
      },
    ];
  }

  async getPrompt(id: string, context: PromptProviderContext): Promise<PromptDefinition | null> {
    const prompts = await this.listPrompts(context);
    return prompts.find((prompt) => prompt.id === id) ?? null;
  }
}
`;
}
exports.generatePromptFile = generatePromptFile;
function generatePromptTest(options) {
    const className = pascalCase(options.name);
    return `import { ${className}PromptProvider } from '../${options.name}.prompt';

describe('${className}PromptProvider', () => {
  it('lists prompts', async () => {
    const provider = new ${className}PromptProvider();
    const prompts = await provider.listPrompts({ logger: console, metadata: {} });
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('retrieves a prompt', async () => {
    const provider = new ${className}PromptProvider();
    const prompt = await provider.getPrompt('${options.name}-welcome', { logger: console, metadata: {} });
    expect(prompt?.placeholders?.length).toBeGreaterThan(0);
  });
});
`;
}
exports.generatePromptTest = generatePromptTest;
//# sourceMappingURL=prompt-template.js.map