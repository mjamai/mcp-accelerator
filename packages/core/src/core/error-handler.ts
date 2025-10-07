import { MCPError } from '../types';

/**
 * Standard MCP error codes
 */
export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  TOOL_NOT_FOUND = -32001,
  TOOL_EXECUTION_ERROR = -32002,
  VALIDATION_ERROR = -32003,
  TRANSPORT_ERROR = -32004,
}

/**
 * Create a standardized MCP error
 */
export function createMCPError(
  code: MCPErrorCode,
  message: string,
  data?: unknown
): MCPError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Convert any error to an MCP error
 */
export function toMCPError(error: unknown): MCPError {
  if (isMCPError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createMCPError(
      MCPErrorCode.INTERNAL_ERROR,
      error.message,
      { stack: error.stack }
    );
  }

  return createMCPError(
    MCPErrorCode.INTERNAL_ERROR,
    'Unknown error occurred',
    error
  );
}

/**
 * Check if an object is an MCP error
 */
export function isMCPError(obj: unknown): obj is MCPError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as MCPError).code === 'number' &&
    typeof (obj as MCPError).message === 'string'
  );
}

/**
 * Error handler class for centralized error management
 */
export class ErrorHandler {
  private errorHandlers: Map<number, (error: MCPError) => void> = new Map();

  /**
   * Register a custom error handler for specific error codes
   */
  registerHandler(code: number, handler: (error: MCPError) => void): void {
    this.errorHandlers.set(code, handler);
  }

  /**
   * Handle an error
   */
  handle(error: unknown): MCPError {
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
  clearHandlers(): void {
    this.errorHandlers.clear();
  }
}

