# @mcp-accelerator/middleware-ratelimit

Rate limiting and quota management middleware for MCP Accelerator.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/middleware-ratelimit
```

## Features

- ✅ In-memory rate limiting (single instance)
- ✅ Redis support (distributed systems)
- ✅ Flexible key generation (by client, user, IP, etc.)
- ✅ Customizable time windows
- ✅ Skip conditions
- ✅ Rate limit info in context

## Usage

### Basic Rate Limiting

```typescript
import { createRateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';

// 100 requests per minute per client
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
}));
```

### Rate Limit by User (After Auth)

```typescript
server.registerMiddleware(createRateLimitMiddleware({
  max: 1000,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (context) => {
    // Use authenticated user ID
    return context.metadata.user?.id || context.clientId;
  }
}));
```

### Different Limits for Different Users

```typescript
// Premium users get higher limits
server.registerMiddleware(createRateLimitMiddleware({
  max: 10000,
  windowMs: 60 * 60 * 1000,
  skip: async (context) => {
    // Skip rate limit for premium users
    const user = context.metadata.user;
    return user?.plan === 'premium';
  }
}));

// Standard limit for everyone else
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 60 * 1000,
}));
```

### Using Redis (Distributed Systems)

```typescript
import Redis from 'ioredis';
import { createRedisStore, createRateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const store = createRedisStore(redis, { 
  windowMs: 60 * 1000 
});

server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000,
  store, // Use Redis store
}));
```

### Per-Tool Rate Limits

```typescript
// Global rate limit
server.registerMiddleware(createRateLimitMiddleware({
  max: 1000,
  windowMs: 60 * 1000,
}));

// Expensive tool gets stricter limit
server.registerTool({
  name: 'expensive-operation',
  description: 'Resource-intensive operation',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    // Check if we should rate limit this specific tool
    const toolRateLimit = context.metadata.toolRateLimits?.['expensive-operation'];
    if (toolRateLimit && toolRateLimit.current > 10) {
      throw new Error('Tool rate limit exceeded: max 10 calls per minute');
    }
    
    // ... expensive operation
  },
});
```

### Accessing Rate Limit Info

```typescript
server.registerTool({
  name: 'get-quota',
  description: 'Get current rate limit status',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    const rateLimit = context.metadata.rateLimit;
    
    return {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: new Date(rateLimit.reset).toISOString(),
    };
  },
});
```

## Configuration

```typescript
interface RateLimitOptions {
  max: number;                           // Maximum requests
  windowMs: number;                      // Time window (milliseconds)
  keyGenerator?: (context) => string;    // Generate key for rate limiting
  message?: string;                      // Custom error message
  store?: RateLimitStore;                // Custom store (Redis, etc.)
  skip?: (context) => boolean;           // Skip rate limiting
}
```

## Examples

### API with Tiered Limits

```typescript
// Free tier: 100 requests/hour
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 60 * 1000,
  skip: (context) => context.metadata.user?.plan !== 'free',
  message: 'Free tier limit reached. Upgrade for higher limits.',
}));

// Pro tier: 10,000 requests/hour
server.registerMiddleware(createRateLimitMiddleware({
  max: 10000,
  windowMs: 60 * 60 * 1000,
  skip: (context) => context.metadata.user?.plan !== 'pro',
  message: 'Pro tier limit reached.',
}));

// Enterprise: unlimited (skip all)
server.registerMiddleware(createRateLimitMiddleware({
  max: 1000000, // Very high limit
  windowMs: 60 * 60 * 1000,
  skip: (context) => context.metadata.user?.plan === 'enterprise',
}));
```

### Rate Limit by IP (HTTP Transport)

```typescript
import { HttpTransport } from '@mcp-accelerator/transport-http';

// You'd need to pass IP from transport to context
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000,
  keyGenerator: (context) => {
    return context.metadata.ip || context.clientId;
  }
}));
```

## Best Practices

1. **Use Redis in production** for distributed systems
2. **Set appropriate limits** based on your infrastructure
3. **Different limits for different user tiers**
4. **Monitor rate limit hits** to adjust limits
5. **Combine with authentication** for user-based limits
6. **Add rate limit headers** to API responses (if HTTP)

## Custom Store

Implement `RateLimitStore` interface for custom backends:

```typescript
class CustomStore implements RateLimitStore {
  async increment(key: string): Promise<number> {
    // Your implementation
  }

  async resetKey(key: string): Promise<void> {
    // Your implementation
  }

  async get(key: string): Promise<number> {
    // Your implementation
  }
}
```

## License

MIT
