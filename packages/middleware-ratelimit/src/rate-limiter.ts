import { Middleware, MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';

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
 * In-memory rate limit store (for single instance)
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async increment(key: string): Promise<number> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + 60000 });
      return 1;
    }

    record.count++;
    return record.count;
  }

  async resetKey(key: string): Promise<void> {
    this.store.delete(key);
  }

  async get(key: string): Promise<number> {
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
export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const {
    max,
    windowMs,
    keyGenerator = (context) => context.clientId,
    message: errorMessage = `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`,
    store = new MemoryStore(),
    skip,
  } = options;

  // Cleanup memory store periodically
  if (store instanceof MemoryStore) {
    setInterval(() => store.cleanup(), windowMs);
  }

  return {
    name: 'rate-limit',
    priority: 90, // Run after auth, before business logic
    
    async handler(message: MCPMessage, context: MiddlewareContext, next: () => Promise<void>) {
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
export function createRedisStore(redis: any, options: { windowMs: number }): RateLimitStore {
  return {
    async increment(key: string): Promise<number> {
      const fullKey = `ratelimit:${key}`;
      const count = await redis.incr(fullKey);
      
      // Set expiry on first request
      if (count === 1) {
        await redis.pexpire(fullKey, options.windowMs);
      }
      
      return count;
    },

    async resetKey(key: string): Promise<void> {
      await redis.del(`ratelimit:${key}`);
    },

    async get(key: string): Promise<number> {
      const count = await redis.get(`ratelimit:${key}`);
      return parseInt(count || '0', 10);
    },
  };
}
