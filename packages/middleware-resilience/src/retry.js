"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetryMiddleware = void 0;
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
function createRetryMiddleware(options = {}) {
    const { maxAttempts = 3, initialDelay = 1000, maxDelay = 30000, backoffMultiplier = 2, retryIf = (error) => error instanceof Error && !error.message.includes('Invalid'), onRetry, } = options;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    return {
        name: 'retry',
        priority: 85, // Run after circuit breaker
        handler: async (message, context, next) => {
            let lastError;
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
                }
                catch (error) {
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
exports.createRetryMiddleware = createRetryMiddleware;
//# sourceMappingURL=retry.js.map