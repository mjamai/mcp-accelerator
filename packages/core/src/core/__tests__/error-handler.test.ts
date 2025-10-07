import {
  MCPErrorCode,
  createMCPError,
  toMCPError,
  isMCPError,
  ErrorHandler,
} from '../error-handler';

describe('Error Handler', () => {
  describe('createMCPError', () => {
    it('should create a valid MCP error', () => {
      const error = createMCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'Something went wrong',
        { detail: 'extra info' }
      );

      expect(error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Something went wrong');
      expect(error.data).toEqual({ detail: 'extra info' });
    });

    it('should create error without data', () => {
      const error = createMCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Invalid request'
      );

      expect(error.code).toBe(MCPErrorCode.INVALID_REQUEST);
      expect(error.message).toBe('Invalid request');
      expect(error.data).toBeUndefined();
    });
  });

  describe('isMCPError', () => {
    it('should identify valid MCP errors', () => {
      const error = createMCPError(MCPErrorCode.PARSE_ERROR, 'Parse error');
      expect(isMCPError(error)).toBe(true);
    });

    it('should reject non-MCP errors', () => {
      expect(isMCPError(new Error('Regular error'))).toBe(false);
      expect(isMCPError({ message: 'Missing code' })).toBe(false);
      expect(isMCPError({ code: 123 })).toBe(false);
      expect(isMCPError(null)).toBe(false);
      expect(isMCPError(undefined)).toBe(false);
      expect(isMCPError('string')).toBe(false);
    });
  });

  describe('toMCPError', () => {
    it('should pass through MCP errors', () => {
      const original = createMCPError(
        MCPErrorCode.VALIDATION_ERROR,
        'Validation failed'
      );
      const converted = toMCPError(original);

      expect(converted).toEqual(original);
    });

    it('should convert regular Error to MCP error', () => {
      const error = new Error('Regular error');
      const mcpError = toMCPError(error);

      expect(mcpError.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(mcpError.message).toBe('Regular error');
      expect(mcpError.data).toHaveProperty('stack');
    });

    it('should convert unknown errors', () => {
      const unknownError = { unexpected: 'value' };
      const mcpError = toMCPError(unknownError);

      expect(mcpError.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(mcpError.message).toBe('Unknown error occurred');
      expect(mcpError.data).toEqual(unknownError);
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = new ErrorHandler();
    });

    it('should handle errors without custom handlers', () => {
      const error = new Error('Test error');
      const mcpError = errorHandler.handle(error);

      expect(isMCPError(mcpError)).toBe(true);
      expect(mcpError.message).toBe('Test error');
    });

    it('should call custom handler for specific error codes', () => {
      const customHandler = jest.fn();
      errorHandler.registerHandler(MCPErrorCode.VALIDATION_ERROR, customHandler);

      const error = createMCPError(
        MCPErrorCode.VALIDATION_ERROR,
        'Validation failed'
      );
      errorHandler.handle(error);

      expect(customHandler).toHaveBeenCalledWith(error);
    });

    it('should not call custom handler for different error codes', () => {
      const customHandler = jest.fn();
      errorHandler.registerHandler(MCPErrorCode.VALIDATION_ERROR, customHandler);

      const error = createMCPError(
        MCPErrorCode.INTERNAL_ERROR,
        'Internal error'
      );
      errorHandler.handle(error);

      expect(customHandler).not.toHaveBeenCalled();
    });

    it('should clear all custom handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      errorHandler.registerHandler(MCPErrorCode.VALIDATION_ERROR, handler1);
      errorHandler.registerHandler(MCPErrorCode.INTERNAL_ERROR, handler2);

      errorHandler.clearHandlers();

      errorHandler.handle(
        createMCPError(MCPErrorCode.VALIDATION_ERROR, 'Error')
      );
      errorHandler.handle(
        createMCPError(MCPErrorCode.INTERNAL_ERROR, 'Error')
      );

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should convert non-MCP errors before handling', () => {
      const customHandler = jest.fn();
      errorHandler.registerHandler(MCPErrorCode.INTERNAL_ERROR, customHandler);

      const error = new Error('Regular error');
      const result = errorHandler.handle(error);

      expect(customHandler).toHaveBeenCalled();
      expect(result.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });
  });
});

