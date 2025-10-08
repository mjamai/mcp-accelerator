# @mcp-accelerator/middleware-cors

CORS configuration helpers for MCP Accelerator HTTP/SSE transports.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/middleware-cors
```

## Important Note

**CORS is configured at the transport level (Fastify), not as a middleware.**

This package provides easy-to-use configuration helpers for CORS setup.

## Usage

### Basic Setup

```typescript
import { HttpTransport } from '@mcp-accelerator/transport-http';
import { createCORSOptions } from '@mcp-accelerator/middleware-cors';

// You would extend HttpTransport to accept CORS options
// Or configure Fastify directly in your custom transport

const cors = createCORSOptions({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true
});
```

### Development (Allow All)

```typescript
import { developmentCORS } from '@mcp-accelerator/middleware-cors';

const cors = developmentCORS;
// Allows all origins - use only in development!
```

### Production (Strict)

```typescript
import { productionCORS } from '@mcp-accelerator/middleware-cors';

const cors = productionCORS([
  'https://example.com',
  'https://app.example.com',
  'https://admin.example.com'
]);
```

### Dynamic Origin Validation

```typescript
import { dynamicOriginCORS } from '@mcp-accelerator/middleware-cors';

const cors = dynamicOriginCORS(async (origin) => {
  // Validate against database
  const allowed = await db.allowedOrigins.findOne({ origin });
  return !!allowed;
});
```

### Custom Configuration

```typescript
import { createCORSOptions } from '@mcp-accelerator/middleware-cors';

const cors = createCORSOptions({
  origin: (origin) => {
    // Custom validation logic
    return origin.endsWith('.example.com');
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Rate-Limit-Remaining'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
```

## Configuration Options

```typescript
interface CORSOptions {
  origin?: string | string[] | ((origin: string) => boolean | Promise<boolean>);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;                  // Preflight cache duration (seconds)
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}
```

## Examples

### API with Auth

```typescript
const cors = createCORSOptions({
  origin: ['https://app.example.com'],
  credentials: true,  // Allow cookies/auth headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
});
```

### Multi-Tenant Application

```typescript
const cors = createCORSOptions({
  origin: async (origin) => {
    // Check if origin belongs to a tenant
    const tenant = await db.tenants.findOne({ 
      domain: origin 
    });
    return tenant && tenant.isActive;
  },
  credentials: true
});
```

### WebSocket with CORS

```typescript
// For WebSocket, you typically handle origin in the connection upgrade
// This is usually done at the transport level
```

## Security Best Practices

### ❌ Don't Do This in Production

```typescript
// Allow all origins
origin: '*',
credentials: true  // ❌ Security risk!
```

### ✅ Do This Instead

```typescript
// Whitelist specific origins
origin: ['https://example.com'],
credentials: true  // ✅ Safe
```

### Recommendations

1. **Never use `origin: '*'` with `credentials: true`**
2. **Whitelist specific origins** in production
3. **Use dynamic validation** for multi-tenant apps
4. **Limit allowed methods** to what you actually use
5. **Be specific with headers** - don't allow all
6. **Set appropriate `maxAge`** to reduce preflight requests
7. **Monitor CORS errors** in production

## Integration with Transports

### HTTP Transport

```typescript
// Custom HTTP transport with CORS
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { productionCORS } from '@mcp-accelerator/middleware-cors';

const fastify = Fastify();

await fastify.register(cors, productionCORS([
  'https://example.com'
]));

// ... configure transport
```

### SSE Transport

Same as HTTP - SSE uses Fastify under the hood.

## Common Issues

### Issue: CORS errors even with correct configuration

**Solution**: Make sure your client is sending the `Origin` header correctly.

### Issue: Credentials not working

**Solution**: Ensure both `credentials: true` in CORS and `withCredentials: true` in client.

### Issue: Custom headers blocked

**Solution**: Add them to `allowedHeaders` in CORS configuration.

## Testing CORS

```bash
# Test preflight request
curl -X OPTIONS http://localhost:3000/mcp \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Test actual request
curl -X POST http://localhost:3000/mcp \
  -H "Origin: https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"type":"request","method":"tools/list"}' \
  -v
```

## License

MIT
