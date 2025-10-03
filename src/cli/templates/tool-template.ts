/**
 * Template generators for creating new tools
 */

export interface ToolTemplateOptions {
  name: string;
  description: string;
}

export function generateToolFile(options: ToolTemplateOptions): string {
  const capitalizedName = options.name.charAt(0).toUpperCase() + options.name.slice(1);
  
  return `import { z } from 'mcp-accelerator';
import { Tool } from 'mcp-accelerator';

/**
 * ${options.description}
 */
export const ${options.name}Tool: Tool = {
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
      
      context.logger.info(\`${capitalizedName} tool completed successfully\`);
      return result;
    } catch (error) {
      context.logger.error(\`${capitalizedName} tool failed\`, error as Error);
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
  return `import { ${options.name}Tool } from '../${options.name}';
import { SilentLogger } from 'mcp-accelerator';

describe('${options.name}Tool', () => {
  it('should have correct metadata', () => {
    expect(${options.name}Tool.name).toBe('${options.name}');
    expect(${options.name}Tool.description).toBe('${options.description}');
  });

  it('should validate input correctly', () => {
    const validInput = { example: 'test' };
    const result = ${options.name}Tool.inputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid input', () => {
    const invalidInput = { example: 123 }; // Should be string
    const result = ${options.name}Tool.inputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should execute successfully with valid input', async () => {
    const input = { example: 'test' };
    const context = {
      clientId: 'test-client',
      logger: new SilentLogger(),
    };

    const result = await ${options.name}Tool.handler(input, context);
    
    expect(result).toBeDefined();
    expect(result.message).toContain('test');
  });
});
`;
}

