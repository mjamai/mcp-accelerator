# @mcp-accelerator/middleware-auth

Authentication middleware for MCP Accelerator. Provides JWT and API Key authentication out of the box.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/middleware-auth
```

## Features

- ✅ JWT Authentication (jsonwebtoken)
- ✅ API Key Authentication
- ✅ Custom verification logic
- ✅ Async key validation
- ✅ User info extraction
- ✅ TypeScript support

## Usage

### JWT Authentication

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';
import { createJWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';

const server = new MCPServer({
  name: 'secure-server',
  version: '1.0.0',
});

server.setTransport(new HttpTransport({ port: 3000 }));

// Add JWT authentication
server.registerMiddleware(createJWTAuthMiddleware({
  secret: process.env.JWT_SECRET!,
  algorithms: ['HS256'],
  // Optional: custom verification
  verify: async (decoded, context) => {
    // Check if user exists, is active, etc.
    const user = await db.users.findById(decoded.userId);
    return user && user.isActive;
  }
}));

server.registerTool({
  name: 'protected-action',
  description: 'Action that requires authentication',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    // Access authenticated user
    const user = context.metadata.user;
    return { message: `Hello, ${user.name}!` };
  },
});

await server.start();
```

**Client request:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"type":"request","method":"tools/execute","params":{"name":"protected-action"}}'
```

### API Key Authentication

```typescript
import { createAPIKeyAuthMiddleware } from '@mcp-accelerator/middleware-auth';

// Simple array of keys
server.registerMiddleware(createAPIKeyAuthMiddleware({
  keys: ['key-123', 'key-456', 'key-789']
}));

// Or async validation with database
server.registerMiddleware(createAPIKeyAuthMiddleware({
  keys: async (key) => {
    const apiKey = await db.apiKeys.findOne({ 
      key, 
      isActive: true 
    });
    return !!apiKey;
  },
  getUserInfo: async (key) => {
    const apiKey = await db.apiKeys.findOne({ key });
    return {
      userId: apiKey.userId,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
    };
  }
}));
```

**Client request:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "X-API-Key: key-123" \
  -H "Content-Type: application/json" \
  -d '{"type":"request","method":"tools/execute","params":{"name":"protected-action"}}'
```

### Custom Headers

```typescript
// Custom header name
server.registerMiddleware(createAPIKeyAuthMiddleware({
  keys: ['key-123'],
  headerName: 'x-custom-api-key' // Default: 'x-api-key'
}));

// Custom JWT header
server.registerMiddleware(createJWTAuthMiddleware({
  secret: 'secret',
  headerName: 'x-auth-token',    // Default: 'authorization'
  tokenPrefix: 'Token '           // Default: 'Bearer '
}));
```

### Accessing User Info in Tools

```typescript
server.registerTool({
  name: 'get-user-data',
  description: 'Get authenticated user data',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    // User info added by auth middleware
    const user = context.metadata.user;
    const isAuthenticated = context.metadata.authenticated;
    
    return {
      userId: user.userId,
      authenticated: isAuthenticated
    };
  },
});
```

### Optional Authentication

```typescript
// Make authentication optional for some tools
server.registerMiddleware({
  name: 'optional-auth',
  priority: 90,
  async handler(message, context, next) {
    try {
      // Try JWT auth
      const authMiddleware = createJWTAuthMiddleware({ 
        secret: 'secret' 
      });
      await authMiddleware.handler(message, context, async () => {});
    } catch (error) {
      // No auth - continue anyway
      context.metadata.authenticated = false;
    }
    await next();
  }
});
```

## Configuration

### JWTAuthOptions

```typescript
interface JWTAuthOptions {
  secret: string;                    // JWT secret key
  algorithms?: jwt.Algorithm[];      // Allowed algorithms (default: ['HS256'])
  headerName?: string;               // Header name (default: 'authorization')
  tokenPrefix?: string;              // Token prefix (default: 'Bearer ')
  verify?: (decoded, context) =>     // Custom verification
    Promise<boolean> | boolean;
}
```

### APIKeyAuthOptions

```typescript
interface APIKeyAuthOptions {
  keys: string[] |                   // Valid keys or validation function
    ((key: string) => Promise<boolean> | boolean);
  headerName?: string;               // Header name (default: 'x-api-key')
  getUserInfo?: (key: string) =>     // Get user info from key
    Promise<any> | any;
}
```

## Error Handling

The middleware throws errors for:
- Missing authentication (no token/key provided)
- Invalid token/key
- Expired JWT
- Failed custom verification

Handle these in your error handler or let them bubble up to the transport.

## Security Best Practices

1. **Use HTTPS in production**
2. **Store secrets securely** (environment variables, secrets manager)
3. **Rotate API keys regularly**
4. **Use short-lived JWTs** (15-60 minutes)
5. **Implement refresh tokens** for JWT
6. **Rate limit by user/API key**
7. **Log authentication failures**
8. **Use strong JWT algorithms** (RS256 recommended for production)

## Examples

See the [secure-api example](../../examples/secure-api/) for a complete example.

## License

MIT
