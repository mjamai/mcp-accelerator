"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisStore = exports.createRateLimitMiddleware = void 0;
/**
 * In-memory rate limit store (for single instance)
 */
class MemoryStore {
    store = new Map();
    async increment(key) {
        const now = Date.now();
        const record = this.store.get(key);
        if (!record || now > record.resetTime) {
            this.store.set(key, { count: 1, resetTime: now + 60000 });
            return 1;
        }
        record.count++;
        return record.count;
    }
    async resetKey(key) {
        this.store.delete(key);
    }
    async get(key) {
        const record = this.store.get(key);
        if (!record || Date.now() > record.resetTime) {
            return 0;
        }
        return record.count;
    }
    // Cleanup old entries
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (now > record.resetTime) {
                this.store.delete(key);
            }
        }
    }
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
function createRateLimitMiddleware(options) {
    const { max, windowMs, keyGenerator = (context) => context.clientId, message: errorMessage = `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`, store = new MemoryStore(), skip, } = options;
    // Cleanup memory store periodically
    if (store instanceof MemoryStore) {
        setInterval(() => store.cleanup(), windowMs);
    }
    return {
        name: 'rate-limit',
        priority: 90, // Run after auth, before business logic
        async handler(message, context, next) {
            // Skip if condition met
            if (skip && await skip(context)) {
                await next();
                return;
            }
            // Generate key for this client
            const key = keyGenerator(context);
            // Increment counter
            const current = await store.increment(key);
            // Add rate limit info to context
            context.metadata = {
                ...context.metadata,
                rateLimit: {
                    limit: max,
                    current,
                    remaining: Math.max(0, max - current),
                    reset: Date.now() + windowMs,
                },
            };
            // Check if limit exceeded
            if (current > max) {
                throw new Error(errorMessage);
            }
            await next();
        },
    };
}
exports.createRateLimitMiddleware = createRateLimitMiddleware;
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
function createRedisStore(redis, options) {
    return {
        async increment(key) {
            const fullKey = `ratelimit:${key}`;
            const count = await redis.incr(fullKey);
            // Set expiry on first request
            if (count === 1) {
                await redis.pexpire(fullKey, options.windowMs);
            }
            return count;
        },
        async resetKey(key) {
            await redis.del(`ratelimit:${key}`);
        },
        async get(key) {
            const count = await redis.get(`ratelimit:${key}`);
            return parseInt(count || '0', 10);
        },
    };
}
exports.createRedisStore = createRedisStore;
//# sourceMappingURL=rate-limiter.js.map