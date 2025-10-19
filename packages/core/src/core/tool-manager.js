"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolManager = void 0;
const zod_1 = require("zod");
const error_handler_1 = require("./error-handler");
const zod_to_json_schema_1 = require("../utils/zod-to-json-schema");
/**
 * Tool manager handles registration, validation, and execution of tools
 */
class ToolManager {
    logger;
    tools = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Register a new tool
     */
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            this.logger.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
        }
        this.logger.info(`Registering tool: ${tool.name}`);
        this.tools.set(tool.name, tool);
    }
    /**
     * Unregister a tool
     */
    unregisterTool(name) {
        const existed = this.tools.delete(name);
        if (existed) {
            this.logger.info(`Unregistered tool: ${name}`);
        }
        else {
            this.logger.warn(`Attempted to unregister non-existent tool: ${name}`);
        }
        return existed;
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * List all registered tools
     */
    listTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Check if a tool exists
     */
    hasTool(name) {
        return this.tools.has(name);
    }
    /**
     * Validate tool input against its schema
     */
    validateInput(tool, input) {
        try {
            const data = tool.inputSchema.parse(input);
            return { success: true, data };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return { success: false, error };
            }
            throw error;
        }
    }
    /**
     * Execute a tool with input validation
     */
    async executeTool(toolName, input, context) {
        const startTime = Date.now();
        try {
            // Find tool
            const tool = this.getTool(toolName);
            if (!tool) {
                return {
                    success: false,
                    error: (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.TOOL_NOT_FOUND, `Tool "${toolName}" not found`),
                    duration: Date.now() - startTime,
                };
            }
            // Validate input
            const validation = this.validateInput(tool, input);
            if (!validation.success) {
                return {
                    success: false,
                    error: (0, error_handler_1.formatValidationError)(validation.error),
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
                result: result,
                duration,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Tool execution failed: ${toolName}`, error);
            return {
                success: false,
                error: (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.TOOL_EXECUTION_ERROR, error instanceof Error ? error.message : 'Unknown error', error),
                duration,
            };
        }
    }
    /**
     * Get tool metadata for listing
     */
    getToolsMetadata() {
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
    zodSchemaToJSON(schema) {
        const jsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(schema);
        // Remove $schema metadata to keep payload concise for clients
        if (typeof jsonSchema === 'object' && jsonSchema !== null && '$schema' in jsonSchema) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete jsonSchema['$schema'];
        }
        return jsonSchema;
    }
    /**
     * Clear all tools
     */
    clear() {
        this.logger.info('Clearing all registered tools');
        this.tools.clear();
    }
}
exports.ToolManager = ToolManager;
//# sourceMappingURL=tool-manager.js.map