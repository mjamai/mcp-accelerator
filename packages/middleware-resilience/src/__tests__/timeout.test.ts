import { createTimeoutMiddleware } from '../timeout';
import { MCPMessage, MiddlewareContext, StrictMetadata, SilentLogger } from '@mcp-accelerator/core';

describe('Timeout Middleware', () => {
  let mockMessage: MCPMessage;
  let mockContext: MiddlewareContext<StrictMetadata>;

  beforeEach(() => {
    mockMessage = {
      type: 'request',
      method: 'test',
      id: '123',
    };

    mockContext = {
      clientId: 'test-client',
      logger: new SilentLogger(),
      metadata: {} as StrictMetadata,
    };
  });

  it('should pass through fast requests', async () => {
    const middleware = createTimeoutMiddleware({
      timeout: 1000,
    });

    const next = jest.fn().mockResolvedValue(undefined);
    
    await middleware.handler(mockMessage, mockContext, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('should timeout slow requests', async () => {
    const middleware = createTimeoutMiddleware({
      timeout: 100,
    });

    const next = jest.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 200));
    });

    await expect(
      middleware.handler(mockMessage, mockContext, next)
    ).rejects.toThrow('Exceeded 100ms');
  });

  it('should use per-tool timeouts', async () => {
    const middleware = createTimeoutMiddleware({
      timeout: 100,
      toolTimeouts: {
        'slow-tool': 500,
      },
    });

    const toolMessage: MCPMessage = {
      type: 'request',
      method: 'tools/call',
      params: { name: 'slow-tool', arguments: {} },
    };

    const next = jest.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 200));
    });

    // Should not timeout (tool timeout is 500ms)
    await expect(
      middleware.handler(toolMessage, mockContext, next)
    ).resolves.not.toThrow();
  });

  it('should add timeout metadata on timeout', async () => {
    const middleware = createTimeoutMiddleware({
      timeout: 50,
    });

    const next = jest.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    try {
      await middleware.handler(mockMessage, mockContext, next);
    } catch (error) {
      expect(mockContext.metadata.timeout).toBe(true);
      expect(mockContext.metadata.timeoutMs).toBe(50);
    }
  });
});
