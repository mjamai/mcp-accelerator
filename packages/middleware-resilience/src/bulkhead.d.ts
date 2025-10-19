import { Middleware } from '@mcp-accelerator/core';
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
export declare function createBulkheadMiddleware(options?: BulkheadOptions): Middleware;
//# sourceMappingURL=bulkhead.d.ts.map