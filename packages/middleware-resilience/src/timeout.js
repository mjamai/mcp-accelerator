"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutMiddleware = void 0;
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
function createTimeoutMiddleware(options = {}) {
    const { timeout: defaultTimeout = 30000, message = 'Request timeout', toolTimeouts = {}, } = options;
    return {
        name: 'timeout',
        priority: 95,
        handler: async (message, context, next) => {
            // Determine timeout for this request
            let timeoutMs = defaultTimeout;
            if (message.method === 'tools/call' && message.params) {
                const toolName = message.params.name;
                if (toolName && toolTimeouts[toolName]) {
                    timeoutMs = toolTimeouts[toolName];
                }
            }
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`${message}: Exceeded ${timeoutMs}ms`));
                }, timeoutMs);
            });
            // Race between execution and timeout
            try {
                await Promise.race([next(), timeoutPromise]);
            }
            catch (error) {
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
exports.createTimeoutMiddleware = createTimeoutMiddleware;
//# sourceMappingURL=timeout.js.map