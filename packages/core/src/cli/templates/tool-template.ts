/**
 * Template generators for creating new tools
 */

export interface ToolTemplateOptions {
  name: string;
  description: string;
}

const toCamelCase = (value: string): string => {
  const parts = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);

  if (parts.length === 0) {
    return 'tool';
  }

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

export function generateToolFile(options: ToolTemplateOptions): string {
  const baseName = toCamelCase(options.name);
  const symbolName = baseName.endsWith('Tool') ? baseName : `${baseName}Tool`;
  const capitalizedName =
    symbolName.charAt(0).toUpperCase() + symbolName.slice(1);

  return `import { z } from 'mcp-accelerator';
import { Tool } from 'mcp-accelerator';

/**
 * ${options.description}
 */
export const ${symbolName}: Tool = {
  name: '${options.name}',
  description: '${options.description}',

  // Define input schema with Zod
  inputSchema: z.object({
    // Add your input parameters here
    example: z.string().describe('Example parameter'),
  }),

  // Implement the tool handler
  handler: async (input, context) => {
    context.logger.info(\`Executing ${options.name} tool\`, { input });

    try {
      // TODO: Implement your tool logic here
      const result = {
        message: \`Processed: \${input.example}\`,
      };

      context.logger.info(\`${capitalizedName} completed successfully\`);
      return result;
    } catch (error) {
      context.logger.error(\`${capitalizedName} failed\`, error as Error);
      throw error;
    }
  },

  // Optional metadata
  metadata: {
    category: 'general',
    version: '1.0.0',
  },
};
`;
}

export function generateToolTest(options: ToolTemplateOptions): string {
  const baseName = toCamelCase(options.name);
  const symbolName = baseName.endsWith('Tool') ? baseName : `${baseName}Tool`;

  return `import { ${symbolName} } from '../${options.name}';
import { SilentLogger } from 'mcp-accelerator';

describe('${symbolName}', () => {
  it('should have correct metadata', () => {
    expect(${symbolName}.name).toBe('${options.name}');
    expect(${symbolName}.description).toBe('${options.description}');
  });

  it('should validate input correctly', () => {
    const validInput = { example: 'test' };
    const result = ${symbolName}.inputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid input', () => {
    const invalidInput = { example: 123 }; // Should be string
    const result = ${symbolName}.inputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should execute successfully with valid input', async () => {
    const input = { example: 'test' };
    const context = {
      clientId: 'test-client',
      logger: new SilentLogger(),
    };

    const result = await ${symbolName}.handler(input, context);

    expect(result).toBeDefined();
    expect(result.message).toContain('test');
  });
});
`;
}
