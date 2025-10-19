"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCircuitBreakerState = exports.createCircuitBreakerMiddleware = void 0;
/**
 * Circuit Breaker Middleware
 *
 * Prevents cascading failures by stopping requests when error rate is high
 *
 * @example
 * ```typescript
 * import { createCircuitBreakerMiddleware } from '@mcp-accelerator/middleware-resilience';
 *
 * server.registerMiddleware(createCircuitBreakerMiddleware({
 *   failureThreshold: 5,    // Open after 5 failures
 *   timeout: 60000,         // Try again after 1 minute
 *   onOpen: () => console.log('Circuit opened!'),
 * }));
 * ```
 */
function createCircuitBreakerMiddleware(options = {}) {
    const { failureThreshold = 5, successThreshold = 3, timeout = 60000, isError = (error) => error instanceof Error, onOpen, onClose, onHalfOpen, } = options;
    let state = 'closed';
    let failureCount = 0;
    let successCount = 0;
    let lastFailureTime = 0;
    const checkState = () => {
        if (state === 'open') {
            const now = Date.now();
            if (now - lastFailureTime >= timeout) {
                state = 'half-open';
                successCount = 0;
                if (onHalfOpen)
                    onHalfOpen();
            }
        }
        return state;
    };
    const recordSuccess = () => {
        if (state === 'half-open') {
            successCount++;
            if (successCount >= successThreshold) {
                state = 'closed';
                failureCount = 0;
                successCount = 0;
                if (onClose)
                    onClose();
            }
        }
        else if (state === 'closed') {
            failureCount = Math.max(0, failureCount - 1);
        }
    };
    const recordFailure = () => {
        failureCount++;
        lastFailureTime = Date.now();
        if (state === 'half-open') {
            state = 'open';
            successCount = 0;
            if (onOpen)
                onOpen();
        }
        else if (state === 'closed' && failureCount >= failureThreshold) {
            state = 'open';
            if (onOpen)
                onOpen();
        }
    };
    return {
        name: 'circuit-breaker',
        priority: 95,
        handler: async (message, context, next) => {
            const currentState = checkState();
            if (currentState === 'open') {
                throw new Error(`Circuit breaker is open. Retry after ${Math.ceil((lastFailureTime + timeout - Date.now()) / 1000)}s`);
            }
            try {
                await next();
                recordSuccess();
            }
            catch (error) {
                if (isError(error)) {
                    recordFailure();
                }
                throw error;
            }
        },
    };
}
exports.createCircuitBreakerMiddleware = createCircuitBreakerMiddleware;
/**
 * Get circuit breaker state for monitoring
 */
function getCircuitBreakerState(middleware) {
    // This would require storing state externally or exposing it via the middleware
    // For now, return a placeholder
    return {
        state: 'unknown',
        failures: 0,
        successes: 0,
    };
}
exports.getCircuitBreakerState = getCircuitBreakerState;
//# sourceMappingURL=circuit-breaker.js.map