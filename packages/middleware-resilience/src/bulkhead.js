"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkheadMiddleware = void 0;
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
function createBulkheadMiddleware(options = {}) {
    const { maxConcurrent = 10, maxQueue = 100, rejectOnQueueFull = true, queueTimeout = 5000, } = options;
    let activeCount = 0;
    const queue = [];
    const acquire = async () => {
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
        await new Promise((resolve, reject) => {
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
    const release = () => {
        activeCount--;
        const next = queue.shift();
        if (next) {
            next();
        }
    };
    return {
        name: 'bulkhead',
        priority: 90,
        handler: async (message, context, next) => {
            await acquire();
            try {
                await next();
            }
            finally {
                release();
            }
        },
    };
}
exports.createBulkheadMiddleware = createBulkheadMiddleware;
//# sourceMappingURL=bulkhead.js.map