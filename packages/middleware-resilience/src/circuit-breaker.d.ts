import { Middleware } from '@mcp-accelerator/core';
export interface CircuitBreakerOptions {
    /** Failure threshold to open circuit (default: 5) */
    failureThreshold?: number;
    /** Success threshold to close circuit from half-open (default: 3) */
    successThreshold?: number;
    /** Timeout before trying half-open in ms (default: 60000 = 1min) */
    timeout?: number;
    /** Custom error detector function */
    isError?: (error: any) => boolean;
    /** Callback when circuit opens */
    onOpen?: () => void;
    /** Callback when circuit closes */
    onClose?: () => void;
    /** Callback when circuit half-opens */
    onHalfOpen?: () => void;
}
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
export declare function createCircuitBreakerMiddleware(options?: CircuitBreakerOptions): Middleware;
/**
 * Get circuit breaker state for monitoring
 */
export declare function getCircuitBreakerState(middleware: Middleware): {
    state: string;
    failures: number;
    successes: number;
};
//# sourceMappingURL=circuit-breaker.d.ts.map