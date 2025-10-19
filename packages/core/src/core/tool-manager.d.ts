import { z } from 'zod';
import { Tool, ToolContext, Logger, ToolExecutionResult } from '../types';
/**
 * Tool manager handles registration, validation, and execution of tools
 */
export declare class ToolManager {
    private logger;
    private tools;
    constructor(logger: Logger);
    /**
     * Register a new tool
     */
    registerTool<I = unknown, O = unknown>(tool: Tool<I, O>): void;
    /**
     * Unregister a tool
     */
    unregisterTool(name: string): boolean;
    /**
     * Get a tool by name
     */
    getTool(name: string): Tool | undefined;
    /**
     * List all registered tools
     */
    listTools(): Tool[];
    /**
     * Check if a tool exists
     */
    hasTool(name: string): boolean;
    /**
     * Validate tool input against its schema
     */
    validateInput<I>(tool: Tool<I>, input: unknown): {
        success: true;
        data: I;
    } | {
        success: false;
        error: z.ZodError;
    };
    /**
     * Execute a tool with input validation
     */
    executeTool<O = unknown>(toolName: string, input: unknown, context: ToolContext): Promise<ToolExecutionResult<O>>;
    /**
     * Get tool metadata for listing
     */
    getToolsMetadata(): Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    }>;
    /**
     * Convert Zod schema to JSON schema (simplified)
     */
    private zodSchemaToJSON;
    /**
     * Clear all tools
     */
    clear(): void;
}
//# sourceMappingURL=tool-manager.d.ts.map