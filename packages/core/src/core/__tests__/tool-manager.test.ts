import { ToolManager } from '../tool-manager';
import { SilentLogger } from '../logger';
import { z } from 'zod';
import { Tool } from '../../types';

describe('ToolManager', () => {
  let toolManager: ToolManager;

  beforeEach(() => {
    toolManager = new ToolManager(new SilentLogger());
  });

  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: z.object({ value: z.string() }),
        handler: async (input: any) => ({ result: input.value }),
      };

      toolManager.registerTool(tool);

      expect(toolManager.hasTool('test-tool')).toBe(true);
      expect(toolManager.getTool('test-tool')).toEqual(tool);
    });

    it('should overwrite existing tool with same name', () => {
      const tool1: Tool = {
        name: 'test-tool',
        description: 'First version',
        inputSchema: z.object({}),
        handler: async () => ({ v: 1 }),
      };

      const tool2: Tool = {
        name: 'test-tool',
        description: 'Second version',
        inputSchema: z.object({}),
        handler: async () => ({ v: 2 }),
      };

      toolManager.registerTool(tool1);
      toolManager.registerTool(tool2);

      expect(toolManager.getTool('test-tool')?.description).toBe('Second version');
    });
  });

  describe('unregisterTool', () => {
    it('should unregister a tool successfully', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool);
      const result = toolManager.unregisterTool('test-tool');

      expect(result).toBe(true);
      expect(toolManager.hasTool('test-tool')).toBe(false);
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = toolManager.unregisterTool('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('listTools', () => {
    it('should return empty array when no tools registered', () => {
      expect(toolManager.listTools()).toEqual([]);
    });

    it('should return all registered tools', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: z.object({}),
        handler: async () => ({}),
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: z.object({}),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool1);
      toolManager.registerTool(tool2);

      const tools = toolManager.listTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContainEqual(tool1);
      expect(tools).toContainEqual(tool2);
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const tool: Tool<{ name: string; age: number }> = {
        name: 'validate-test',
        description: 'Test',
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool);

      const validation = toolManager.validateInput(tool, {
        name: 'John',
        age: 30,
      });

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('should reject invalid input', () => {
      const tool: Tool = {
        name: 'validate-test',
        description: 'Test',
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool);

      const validation = toolManager.validateInput(tool, {
        name: 'John',
        age: 'thirty', // Invalid: should be number
      });

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('executeTool', () => {
    it('should execute tool successfully with valid input', async () => {
      const tool: Tool<{ value: number }, { doubled: number }> = {
        name: 'double',
        description: 'Double a number',
        inputSchema: z.object({
          value: z.number(),
        }),
        handler: async (input) => ({
          doubled: input.value * 2,
        }),
      };

      toolManager.registerTool(tool);

      const result = await toolManager.executeTool('double', { value: 5 }, {
        clientId: 'test',
        logger: new SilentLogger(),
        metadata: {},
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ doubled: 10 });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return error for non-existent tool', async () => {
      const result = await toolManager.executeTool('non-existent', {}, {
        clientId: 'test',
        logger: new SilentLogger(),
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not found');
    });

    it('should return validation error for invalid input', async () => {
      const tool: Tool = {
        name: 'test',
        description: 'Test',
        inputSchema: z.object({
          required: z.string(),
        }),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool);

      const result = await toolManager.executeTool('test', {}, {
        clientId: 'test',
        logger: new SilentLogger(),
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(-32003); // VALIDATION_ERROR
    });

    it('should handle tool execution errors', async () => {
      const tool: Tool = {
        name: 'error-tool',
        description: 'Tool that throws error',
        inputSchema: z.object({}),
        handler: async () => {
          throw new Error('Tool execution failed');
        },
      };

      toolManager.registerTool(tool);

      const result = await toolManager.executeTool('error-tool', {}, {
        clientId: 'test',
        logger: new SilentLogger(),
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(-32002); // TOOL_EXECUTION_ERROR
      expect(result.error?.message).toContain('Tool execution failed');
    });
  });

  describe('getToolsMetadata', () => {
    it('should return metadata for all tools', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: z.object({
          param: z.string(),
        }),
        handler: async () => ({}),
        metadata: {
          category: 'testing',
          version: '1.0.0',
        },
      };

      toolManager.registerTool(tool);

      const metadata = toolManager.getToolsMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0].name).toBe('test-tool');
      expect(metadata[0].description).toBe('A test tool');
      expect(metadata[0].metadata).toEqual({
        category: 'testing',
        version: '1.0.0',
      });
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: z.object({}),
        handler: async () => ({}),
      };

      toolManager.registerTool(tool);
      expect(toolManager.listTools()).toHaveLength(1);

      toolManager.clear();
      expect(toolManager.listTools()).toHaveLength(0);
    });
  });
});

