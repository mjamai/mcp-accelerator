"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.formatValidationError = exports.isMCPError = exports.toMCPError = exports.createMCPError = exports.MCPErrorCode = void 0;
/**
 * Standard MCP error codes
 */
var MCPErrorCode;
(function (MCPErrorCode) {
    MCPErrorCode[MCPErrorCode["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
    MCPErrorCode[MCPErrorCode["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
    MCPErrorCode[MCPErrorCode["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
    MCPErrorCode[MCPErrorCode["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
    MCPErrorCode[MCPErrorCode["TOOL_NOT_FOUND"] = -32001] = "TOOL_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["TOOL_EXECUTION_ERROR"] = -32002] = "TOOL_EXECUTION_ERROR";
    MCPErrorCode[MCPErrorCode["VALIDATION_ERROR"] = -32003] = "VALIDATION_ERROR";
    MCPErrorCode[MCPErrorCode["TRANSPORT_ERROR"] = -32004] = "TRANSPORT_ERROR";
})(MCPErrorCode || (exports.MCPErrorCode = MCPErrorCode = {}));
/**
 * Create a standardized MCP error
 */
function createMCPError(code, message, data) {
    return {
        code,
        message,
        data,
    };
}
exports.createMCPError = createMCPError;
/**
 * Convert any error to an MCP error
 */
function toMCPError(error) {
    if (isMCPError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return createMCPError(MCPErrorCode.INTERNAL_ERROR, error.message, { stack: error.stack });
    }
    return createMCPError(MCPErrorCode.INTERNAL_ERROR, 'Unknown error occurred', error);
}
exports.toMCPError = toMCPError;
/**
 * Check if an object is an MCP error
 */
function isMCPError(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'code' in obj &&
        'message' in obj &&
        typeof obj.code === 'number' &&
        typeof obj.message === 'string');
}
exports.isMCPError = isMCPError;
/**
 * Format validation errors for user-friendly display
 */
function formatValidationError(zodError) {
    // Check if it's a Zod error (duck typing to avoid importing zod here)
    if (typeof zodError === 'object' &&
        zodError !== null &&
        'errors' in zodError &&
        Array.isArray(zodError.errors)) {
        const errors = zodError.errors;
        const formattedIssues = errors.map(err => ({
            field: err.path.join('.') || 'root',
            message: err.message,
            type: err.code,
            received: 'received' in err ? err.received : undefined,
        }));
        const summary = formattedIssues
            .map(issue => `${issue.field}: ${issue.message}`)
            .join('; ');
        return createMCPError(MCPErrorCode.VALIDATION_ERROR, `Validation failed: ${summary}`, {
            issues: formattedIssues,
            count: formattedIssues.length,
        });
    }
    // Fallback for non-Zod errors
    return createMCPError(MCPErrorCode.VALIDATION_ERROR, 'Validation failed', zodError);
}
exports.formatValidationError = formatValidationError;
/**
 * Error handler class for centralized error management
 */
class ErrorHandler {
    errorHandlers = new Map();
    /**
     * Register a custom error handler for specific error codes
     */
    registerHandler(code, handler) {
        this.errorHandlers.set(code, handler);
    }
    /**
     * Handle an error
     */
    handle(error) {
        const mcpError = toMCPError(error);
        const handler = this.errorHandlers.get(mcpError.code);
        if (handler) {
            handler(mcpError);
        }
        return mcpError;
    }
    /**
     * Clear all custom handlers
     */
    clearHandlers() {
        this.errorHandlers.clear();
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.js.map