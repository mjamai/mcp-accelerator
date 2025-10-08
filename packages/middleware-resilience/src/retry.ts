import { Middleware, MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Retry only on specific errors */
  retryIf?: (error: any) => boolean;
  /** Callback on retry */
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Retry Middleware
 * 
 * Automatically retries failed requests with exponential backoff
 * 
 * @example
 * ```typescript
 * import { createRetryMiddleware } from '@mcp-accelerator/middleware-resilience';
 * 
 * server.registerMiddleware(createRetryMiddleware({
 *   maxAttempts: 3,
 *   initialDelay: 1000,
 *   backoffMultiplier: 2,
 *   retryIf: (error) => error.code === 'ECONNRESET',
 * }));
 * ```
 */
export function createRetryMiddleware(options: RetryOptions = {}): Middleware {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryIf = (error) => error instanceof Error && !error.message.includes('Invalid'),
    onRetry,
  } = options;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return {
    name: 'retry',
    priority: 85, // Run after circuit breaker
    
    handler: async (message: MCPMessage, context: MiddlewareContext, next: () => Promise<void>) => {
      let lastError: any;
      let delay = initialDelay;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await next();
          
          // Add retry metadata if we retried
          if (attempt > 1) {
            context.metadata = {
              ...context.metadata,
              retryCount: attempt - 1,
            };
          }
          
          return; // Success!
        } catch (error) {
          lastError = error;

          // Check if we should retry
          if (attempt >= maxAttempts || !retryIf(error)) {
            throw error;
          }

          // Call onRetry callback
          if (onRetry) {
            onRetry(attempt, error);
          }

          // Wait before retrying
          await sleep(Math.min(delay, maxDelay));
          delay *= backoffMultiplier;
        }
      }

      throw lastError;
    },
  };
}
