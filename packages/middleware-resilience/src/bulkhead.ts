import { Middleware, MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';

export interface BulkheadOptions {
  /** Maximum concurrent executions (default: 10) */
  maxConcurrent?: number;
  /** Maximum queue size (default: 100) */
  maxQueue?: number;
  /** Reject on queue full (default: true) */
  rejectOnQueueFull?: boolean;
  /** Timeout for queued requests in ms (default: 5000) */
  queueTimeout?: number;
}

/**
 * Bulkhead Middleware
 * 
 * Limits concurrent executions to prevent resource exhaustion
 * 
 * @example
 * ```typescript
 * import { createBulkheadMiddleware } from '@mcp-accelerator/middleware-resilience';
 * 
 * server.registerMiddleware(createBulkheadMiddleware({
 *   maxConcurrent: 10,
 *   maxQueue: 100,
 *   rejectOnQueueFull: true,
 * }));
 * ```
 */
export function createBulkheadMiddleware(options: BulkheadOptions = {}): Middleware {
  const {
    maxConcurrent = 10,
    maxQueue = 100,
    rejectOnQueueFull = true,
    queueTimeout = 5000,
  } = options;

  let activeCount = 0;
  const queue: Array<() => void> = [];

  const acquire = async (): Promise<void> => {
    if (activeCount < maxConcurrent) {
      activeCount++;
      return;
    }

    // Need to queue
    if (queue.length >= maxQueue) {
      if (rejectOnQueueFull) {
        throw new Error(`Bulkhead queue full (${queue.length}/${maxQueue})`);
      }
    }

    // Wait in queue with timeout
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = queue.indexOf(resolve);
        if (index !== -1) {
          queue.splice(index, 1);
        }
        reject(new Error(`Bulkhead queue timeout after ${queueTimeout}ms`));
      }, queueTimeout);

      const wrappedResolve = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      queue.push(wrappedResolve);
    });

    activeCount++;
  };

  const release = (): void => {
    activeCount--;
    
    const next = queue.shift();
    if (next) {
      next();
    }
  };

  return {
    name: 'bulkhead',
    priority: 90,
    
    handler: async (message: MCPMessage, context: MiddlewareContext, next: () => Promise<void>) => {
      await acquire();

      try {
        await next();
      } finally {
        release();
      }
    },
  };
}
