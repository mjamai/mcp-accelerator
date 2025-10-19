import { Middleware, MiddlewareContext } from '@mcp-accelerator/core';
export interface RateLimitOptions {
    /** Maximum number of requests */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Function to get identifier for rate limiting (e.g., clientId, userId, IP) */
    keyGenerator?: (context: MiddlewareContext) => string;
    /** Custom error message */
    message?: string;
    /** Optional store for distributed systems */
    store?: RateLimitStore;
    /** Skip rate limiting based on condition */
    skip?: (context: MiddlewareContext) => boolean | Promise<boolean>;
}
export interface RateLimitStore {
    increment(key: string): Promise<number>;
    resetKey(key: string): Promise<void>;
    get(key: string): Promise<number>;
}
/**
 * Rate Limiting Middleware
 *
 * Limits the number of requests per time window
 *
 * @example
 * ```typescript
 * import { createRateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';
 *
 * // 100 requests per minute per client
 * server.registerMiddleware(createRateLimitMiddleware({
 *   max: 100,
 *   windowMs: 60 * 1000, // 1 minute
 * }));
 *
 * // Rate limit by user ID (after auth)
 * server.registerMiddleware(createRateLimitMiddleware({
 *   max: 1000,
 *   windowMs: 60 * 60 * 1000, // 1 hour
 *   keyGenerator: (context) => context.metadata.user?.id || context.clientId
 * }));
 * ```
 */
export declare function createRateLimitMiddleware(options: RateLimitOptions): Middleware;
/**
 * Create a Redis-based rate limit store
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * import { createRedisStore } from '@mcp-accelerator/middleware-ratelimit';
 *
 * const redis = new Redis();
 * const store = createRedisStore(redis, { windowMs: 60000 });
 *
 * server.registerMiddleware(createRateLimitMiddleware({
 *   max: 100,
 *   windowMs: 60000,
 *   store
 * }));
 * ```
 */
export declare function createRedisStore(redis: any, options: {
    windowMs: number;
}): RateLimitStore;
//# sourceMappingURL=rate-limiter.d.ts.map