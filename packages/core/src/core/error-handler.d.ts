import { MCPError } from '../types';
/**
 * Standard MCP error codes
 */
export declare enum MCPErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    TOOL_NOT_FOUND = -32001,
    TOOL_EXECUTION_ERROR = -32002,
    VALIDATION_ERROR = -32003,
    TRANSPORT_ERROR = -32004
}
/**
 * Create a standardized MCP error
 */
export declare function createMCPError(code: MCPErrorCode, message: string, data?: unknown): MCPError;
/**
 * Convert any error to an MCP error
 */
export declare function toMCPError(error: unknown): MCPError;
/**
 * Check if an object is an MCP error
 */
export declare function isMCPError(obj: unknown): obj is MCPError;
/**
 * Format validation errors for user-friendly display
 */
export declare function formatValidationError(zodError: unknown): MCPError;
/**
 * Error handler class for centralized error management
 */
export declare class ErrorHandler {
    private errorHandlers;
    /**
     * Register a custom error handler for specific error codes
     */
    registerHandler(code: number, handler: (error: MCPError) => void): void;
    /**
     * Handle an error
     */
    handle(error: unknown): MCPError;
    /**
     * Clear all custom handlers
     */
    clearHandlers(): void;
}
//# sourceMappingURL=error-handler.d.ts.map