import { z } from 'zod';
import { ToolManager } from '../tool-manager';
import { Logger } from '../../types';

class NoopLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug(): void {}
}

describe('ToolManager JSON schema conversion', () => {
  it('produces a JSON Schema compatible structure for tool metadata', async () => {
    const manager = new ToolManager(new NoopLogger());
    manager.registerTool({
      name: 'read_file',
      description: 'Read file contents',
      inputSchema: z.object({
        path: z.string().min(1, 'Path is required'),
        encoding: z.enum(['utf-8', 'base64']).optional(),
        withMetadata: z.boolean().default(false),
      }),
      handler: async () => ({ content: 'mock' }),
    });

    const metadata = manager.getToolsMetadata();

    expect(metadata).toHaveLength(1);
    const toolMetadata = metadata[0];
    expect(toolMetadata.name).toBe('read_file');
    expect(toolMetadata.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        path: {
          type: 'string',
        },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'base64'],
        },
        withMetadata: {
          type: 'boolean',
        },
      },
      required: ['path'],
    });
    expect(toolMetadata.inputSchema).not.toHaveProperty('$schema');
  });
});
