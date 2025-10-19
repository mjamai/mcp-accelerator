import { Middleware } from '@mcp-accelerator/core';
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
export declare function createTimeoutMiddleware(options?: TimeoutOptions): Middleware;
//# sourceMappingURL=timeout.d.ts.map