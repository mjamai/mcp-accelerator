import { Middleware } from '@mcp-accelerator/core';
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
export declare function createRetryMiddleware(options?: RetryOptions): Middleware;
//# sourceMappingURL=retry.d.ts.map