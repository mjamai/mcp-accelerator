"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_handler_1 = require("../error-handler");
describe('Error Handler', () => {
    describe('createMCPError', () => {
        it('should create a valid MCP error', () => {
            const error = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INTERNAL_ERROR, 'Something went wrong', { detail: 'extra info' });
            expect(error.code).toBe(error_handler_1.MCPErrorCode.INTERNAL_ERROR);
            expect(error.message).toBe('Something went wrong');
            expect(error.data).toEqual({ detail: 'extra info' });
        });
        it('should create error without data', () => {
            const error = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Invalid request');
            expect(error.code).toBe(error_handler_1.MCPErrorCode.INVALID_REQUEST);
            expect(error.message).toBe('Invalid request');
            expect(error.data).toBeUndefined();
        });
    });
    describe('isMCPError', () => {
        it('should identify valid MCP errors', () => {
            const error = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.PARSE_ERROR, 'Parse error');
            expect((0, error_handler_1.isMCPError)(error)).toBe(true);
        });
        it('should reject non-MCP errors', () => {
            expect((0, error_handler_1.isMCPError)(new Error('Regular error'))).toBe(false);
            expect((0, error_handler_1.isMCPError)({ message: 'Missing code' })).toBe(false);
            expect((0, error_handler_1.isMCPError)({ code: 123 })).toBe(false);
            expect((0, error_handler_1.isMCPError)(null)).toBe(false);
            expect((0, error_handler_1.isMCPError)(undefined)).toBe(false);
            expect((0, error_handler_1.isMCPError)('string')).toBe(false);
        });
    });
    describe('toMCPError', () => {
        it('should pass through MCP errors', () => {
            const original = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.VALIDATION_ERROR, 'Validation failed');
            const converted = (0, error_handler_1.toMCPError)(original);
            expect(converted).toEqual(original);
        });
        it('should convert regular Error to MCP error', () => {
            const error = new Error('Regular error');
            const mcpError = (0, error_handler_1.toMCPError)(error);
            expect(mcpError.code).toBe(error_handler_1.MCPErrorCode.INTERNAL_ERROR);
            expect(mcpError.message).toBe('Regular error');
            expect(mcpError.data).toHaveProperty('stack');
        });
        it('should convert unknown errors', () => {
            const unknownError = { unexpected: 'value' };
            const mcpError = (0, error_handler_1.toMCPError)(unknownError);
            expect(mcpError.code).toBe(error_handler_1.MCPErrorCode.INTERNAL_ERROR);
            expect(mcpError.message).toBe('Unknown error occurred');
            expect(mcpError.data).toEqual(unknownError);
        });
    });
    describe('ErrorHandler', () => {
        let errorHandler;
        beforeEach(() => {
            errorHandler = new error_handler_1.ErrorHandler();
        });
        it('should handle errors without custom handlers', () => {
            const error = new Error('Test error');
            const mcpError = errorHandler.handle(error);
            expect((0, error_handler_1.isMCPError)(mcpError)).toBe(true);
            expect(mcpError.message).toBe('Test error');
        });
        it('should call custom handler for specific error codes', () => {
            const customHandler = jest.fn();
            errorHandler.registerHandler(error_handler_1.MCPErrorCode.VALIDATION_ERROR, customHandler);
            const error = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.VALIDATION_ERROR, 'Validation failed');
            errorHandler.handle(error);
            expect(customHandler).toHaveBeenCalledWith(error);
        });
        it('should not call custom handler for different error codes', () => {
            const customHandler = jest.fn();
            errorHandler.registerHandler(error_handler_1.MCPErrorCode.VALIDATION_ERROR, customHandler);
            const error = (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INTERNAL_ERROR, 'Internal error');
            errorHandler.handle(error);
            expect(customHandler).not.toHaveBeenCalled();
        });
        it('should clear all custom handlers', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            errorHandler.registerHandler(error_handler_1.MCPErrorCode.VALIDATION_ERROR, handler1);
            errorHandler.registerHandler(error_handler_1.MCPErrorCode.INTERNAL_ERROR, handler2);
            errorHandler.clearHandlers();
            errorHandler.handle((0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.VALIDATION_ERROR, 'Error'));
            errorHandler.handle((0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INTERNAL_ERROR, 'Error'));
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
        it('should convert non-MCP errors before handling', () => {
            const customHandler = jest.fn();
            errorHandler.registerHandler(error_handler_1.MCPErrorCode.INTERNAL_ERROR, customHandler);
            const error = new Error('Regular error');
            const result = errorHandler.handle(error);
            expect(customHandler).toHaveBeenCalled();
            expect(result.code).toBe(error_handler_1.MCPErrorCode.INTERNAL_ERROR);
        });
    });
});
//# sourceMappingURL=error-handler.test.js.map