import { createAPIKeyAuthMiddleware } from '../api-key-auth';
import type { MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';

describe('API Key Authentication Middleware', () => {
  const mockNext = jest.fn();
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAPIKeyAuthMiddleware', () => {
    it('should create middleware with array of keys', () => {
      const middleware = createAPIKeyAuthMiddleware({
        keys: ['key1', 'key2', 'key3'],
      });

      expect(middleware).toBeDefined();
      expect(middleware.name).toBe('api-key-auth');
      expect(middleware.priority).toBe(100);
      expect(middleware.handler).toBeInstanceOf(Function);
    });

    it('should create middleware with validation function', () => {
      const validateFn = jest.fn();
      const middleware = createAPIKeyAuthMiddleware({
        keys: validateFn,
      });

      expect(middleware).toBeDefined();
      expect(middleware.name).toBe('api-key-auth');
    });

    it('should create middleware with custom header name', () => {
      const middleware = createAPIKeyAuthMiddleware({
        keys: ['key1'],
        headerName: 'x-custom-key',
      });

      expect(middleware).toBeDefined();
    });

    it('should create middleware with getUserInfo function', () => {
      const getUserInfo = jest.fn();
      const middleware = createAPIKeyAuthMiddleware({
        keys: ['key1'],
        getUserInfo,
      });

      expect(middleware).toBeDefined();
    });
  });

  describe('Middleware Handler', () => {
    describe('API Key Validation - Array', () => {
      it('should accept valid API key from array', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1', 'key2', 'key3'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'key2',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.user).toEqual({
          id: 'key2',
          apiKey: 'key2',
        });
        expect(context.metadata.authenticated).toBe(true);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid API key', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1', 'key2'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'invalid-key',
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Invalid API key'
        );

        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle empty keys array', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: [],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'any-key',
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Invalid API key'
        );
      });
    });

    describe('API Key Validation - Function', () => {
      it('should use validation function that returns true', async () => {
        const validateFn = jest.fn().mockResolvedValue(true);
        const middleware = createAPIKeyAuthMiddleware({
          keys: validateFn,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'dynamic-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(validateFn).toHaveBeenCalledWith('dynamic-key');
        expect(context.metadata.user).toEqual({
          id: 'dynamic-key',
          apiKey: 'dynamic-key',
        });
        expect(context.metadata.authenticated).toBe(true);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should use validation function that returns false', async () => {
        const validateFn = jest.fn().mockResolvedValue(false);
        const middleware = createAPIKeyAuthMiddleware({
          keys: validateFn,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'rejected-key',
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Invalid API key'
        );

        expect(validateFn).toHaveBeenCalledWith('rejected-key');
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle synchronous validation function', async () => {
        const validateFn = jest.fn().mockReturnValue(true);
        const middleware = createAPIKeyAuthMiddleware({
          keys: validateFn,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'sync-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(validateFn).toHaveBeenCalledWith('sync-key');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('getUserInfo Function', () => {
      it('should call getUserInfo and merge result', async () => {
        const getUserInfo = jest.fn().mockResolvedValue({
          userId: 'user-123',
          role: 'admin',
          email: 'admin@example.com',
        });

        const middleware = createAPIKeyAuthMiddleware({
          keys: ['valid-key'],
          getUserInfo,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'valid-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(getUserInfo).toHaveBeenCalledWith('valid-key');
        expect(context.metadata.user).toEqual({
          id: 'valid-key',
          userId: 'user-123',
          role: 'admin',
          email: 'admin@example.com',
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle synchronous getUserInfo', async () => {
        const getUserInfo = jest.fn().mockReturnValue({
          name: 'Test User',
        });

        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
          getUserInfo,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'key1',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.user).toEqual({
          id: 'key1',
          name: 'Test User',
        });
      });

      it('should use getUserInfo with validation function', async () => {
        const validateFn = jest.fn().mockResolvedValue(true);
        const getUserInfo = jest.fn().mockResolvedValue({
          permissions: ['read', 'write'],
        });

        const middleware = createAPIKeyAuthMiddleware({
          keys: validateFn,
          getUserInfo,
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'special-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(validateFn).toHaveBeenCalledWith('special-key');
        expect(getUserInfo).toHaveBeenCalledWith('special-key');
        expect(context.metadata.user).toEqual({
          id: 'special-key',
          permissions: ['read', 'write'],
        });
      });
    });

    describe('Custom Header Name', () => {
      it('should use custom header name', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['my-key'],
          headerName: 'x-custom-auth',
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-custom-auth': 'my-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.user).toEqual({
          id: 'my-key',
          apiKey: 'my-key',
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle authorization header', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['bearer-key'],
          headerName: 'authorization',
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            authorization: 'bearer-key',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.user).toEqual({
          id: 'bearer-key',
          apiKey: 'bearer-key',
        });
      });
    });

    describe('Error Handling', () => {
      it('should throw error when no API key provided', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['valid-key'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {},
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Authentication required: No API key provided'
        );

        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should throw error for missing custom header', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
          headerName: 'x-custom-key',
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'key1', // Wrong header
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Authentication required: No API key provided'
        );
      });
    });

    describe('Metadata Updates', () => {
      it('should preserve existing metadata', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'key1',
            existingField: 'should-be-preserved',
            nested: {
              value: 123,
            },
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.existingField).toBe('should-be-preserved');
        expect(context.metadata.nested).toEqual({ value: 123 });
        expect(context.metadata.user).toBeDefined();
        expect(context.metadata.authenticated).toBe(true);
      });

      it('should set authenticated flag', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': 'key1',
          },
        };

        await middleware.handler(message, context, mockNext);

        expect(context.metadata.authenticated).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined metadata', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: undefined as any,
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Authentication required: No API key provided'
        );
      });

      it('should handle null API key', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['key1'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            'x-api-key': null as any,
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Authentication required: No API key provided'
        );
      });

      it('should reject empty string API key', async () => {
        const middleware = createAPIKeyAuthMiddleware({
          keys: ['valid-key'],
        });

        const message: MCPMessage = {
          type: 'request',
          id: '1',
          method: 'test',
        };

        const context: MiddlewareContext = {
          clientId: 'test-client',
          logger: mockLogger,
          metadata: {
            'x-api-key': '',
          },
        };

        await expect(middleware.handler(message, context, mockNext)).rejects.toThrow(
          'Authentication required: No API key provided'
        );
      });
    });
  });
});