import { z } from 'zod';
import { Tool, ToolContext, Logger, ToolExecutionResult } from '../types';
import { MCPErrorCode, createMCPError } from './error-handler';

/**
 * Tool manager handles registration, validation, and execution of tools
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor(private logger: Logger) {}

  /**
   * Register a new tool
   */
  registerTool<I = unknown, O = unknown>(tool: Tool<I, O>): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }

    this.logger.info(`Registering tool: ${tool.name}`);
    this.tools.set(tool.name, tool as Tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const existed = this.tools.delete(name);
    if (existed) {
      this.logger.info(`Unregistered tool: ${name}`);
    } else {
      this.logger.warn(`Attempted to unregister non-existent tool: ${name}`);
    }
    return existed;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Validate tool input against its schema
   */
  validateInput<I>(tool: Tool<I>, input: unknown): { success: true; data: I } | { success: false; error: z.ZodError } {
    try {
      const data = tool.inputSchema.parse(input);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error };
      }
      throw error;
    }
  }

  /**
   * Execute a tool with input validation
   */
  async executeTool<O = unknown>(
    toolName: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolExecutionResult<O>> {
    const startTime = Date.now();

    try {
      // Find tool
      const tool = this.getTool(toolName);
      if (!tool) {
        return {
          success: false,
          error: createMCPError(
            MCPErrorCode.TOOL_NOT_FOUND,
            `Tool "${toolName}" not found`
          ),
          duration: Date.now() - startTime,
        };
      }

      // Validate input
      const validation = this.validateInput(tool, input);
      if (!validation.success) {
        return {
          success: false,
          error: createMCPError(
            MCPErrorCode.VALIDATION_ERROR,
            'Input validation failed',
            validation.error.errors
          ),
          duration: Date.now() - startTime,
        };
      }

      this.logger.debug(`Executing tool: ${toolName}`, { input: validation.data });

      // Execute tool
      const result = await tool.handler(validation.data, context);

      const duration = Date.now() - startTime;
      this.logger.debug(`Tool executed successfully: ${toolName}`, { duration });

      return {
        success: true,
        result: result as O,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Tool execution failed: ${toolName}`, error as Error);

      return {
        success: false,
        error: createMCPError(
          MCPErrorCode.TOOL_EXECUTION_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          error
        ),
        duration,
      };
    }
  }

  /**
   * Get tool metadata for listing
   */
  getToolsMetadata(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }> {
    return this.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.zodSchemaToJSON(tool.inputSchema),
      metadata: tool.metadata,
    }));
  }

  /**
   * Convert Zod schema to JSON schema (simplified)
   */
  private zodSchemaToJSON(schema: z.ZodType): Record<string, unknown> {
    // This is a simplified conversion
    // For production, consider using zod-to-json-schema library
    const description = (schema as any)._def?.description || '';
    return {
      type: 'object',
      description,
    };
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.logger.info('Clearing all registered tools');
    this.tools.clear();
  }
}

