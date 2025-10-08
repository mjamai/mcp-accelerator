import { Middleware, MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';

export interface TimeoutOptions {
  /** Timeout in milliseconds (default: 30000 = 30s) */
  timeout?: number;
  /** Custom timeout message */
  message?: string;
  /** Per-tool timeout overrides */
  toolTimeouts?: Record<string, number>;
}

/**
 * Timeout Middleware
 * 
 * Automatically cancels requests that take too long
 * 
 * @example
 * ```typescript
 * import { createTimeoutMiddleware } from '@mcp-accelerator/middleware-resilience';
 * 
 * server.registerMiddleware(createTimeoutMiddleware({
 *   timeout: 30000,  // 30 seconds default
 *   toolTimeouts: {
 *     'expensive-operation': 120000,  // 2 minutes for specific tool
 *   }
 * }));
 * ```
 */
export function createTimeoutMiddleware(options: TimeoutOptions = {}): Middleware {
  const {
    timeout: defaultTimeout = 30000,
    message = 'Request timeout',
    toolTimeouts = {},
  } = options;

  return {
    name: 'timeout',
    priority: 95,
    
    handler: async (message: MCPMessage, context: MiddlewareContext, next: () => Promise<void>) => {
      // Determine timeout for this request
      let timeoutMs = defaultTimeout;
      
      if (message.method === 'tools/execute' && message.params) {
        const toolName = (message.params as any).name;
        if (toolName && toolTimeouts[toolName]) {
          timeoutMs = toolTimeouts[toolName];
        }
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${message}: Exceeded ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Race between execution and timeout
      try {
        await Promise.race([next(), timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Exceeded')) {
          // Add timeout metadata
          context.metadata = {
            ...context.metadata,
            timeout: true,
            timeoutMs,
          };
        }
        throw error;
      }
    },
  };
}
