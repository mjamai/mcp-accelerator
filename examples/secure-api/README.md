# Secure MCP API Example

Complete production-ready example with authentication, rate limiting, and authorization.

## Features

- ✅ **Dual Authentication**: JWT (users) + API Keys (services)
- ✅ **Layered Rate Limiting**: Global + per-user limits
- ✅ **Custom Authorization**: Role-based access control
- ✅ **Production-ready**: Environment variables, logging, error handling

## Installation

```bash
npm install @mcp-accelerator/core \
  @mcp-accelerator/transport-http \
  @mcp-accelerator/middleware-auth \
  @mcp-accelerator/middleware-ratelimit \
  zod dotenv
```

## Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate a strong JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Update `.env` with your values:**
   ```env
   JWT_SECRET=your-generated-secret-here
   API_KEYS=service-key-1,service-key-2
   PORT=3000
   ```

## Running

```bash
node index.ts
```

## Testing

### 1. API Key Authentication (Service Account)

```bash
curl http://localhost:3000/mcp \
  -H "X-API-Key: service-key-1" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "method": "tools/call",
    "params": {
      "name": "get-status",
      "arguments": {}
    }
  }'
```

**Response:**
```json
{
  "type": "response",
  "result": {
    "status": "operational",
    "authenticated": true,
    "user": {
      "type": "service",
      "plan": "enterprise"
    },
    "rateLimit": {
      "limit": 1000,
      "remaining": 999,
      "resetAt": "2024-01-01T01:00:00.000Z"
    }
  }
}
```

### 2. JWT Authentication (User Account)

First, generate a JWT token:

```javascript
// generate-token.js
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'user-123',
    email: 'user@example.com',
    plan: 'pro',
    permissions: ['read', 'write']
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('JWT Token:', token);
```

Then use it:

```bash
curl http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "method": "tools/call",
    "params": {
      "name": "get-user-data",
      "arguments": {
        "fields": ["userId", "plan", "email"]
      }
    }
  }'
```

### 3. Test Rate Limiting

Run this command 101 times quickly:

```bash
for i in {1..101}; do
  curl http://localhost:3000/mcp \
    -H "X-API-Key: service-key-1" \
    -H "Content-Type: application/json" \
    -d '{"type":"request","method":"tools/list"}' &
done
```

After 100 requests per minute, you'll get:
```json
{
  "type": "error",
  "error": {
    "code": 429,
    "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds."
  }
}
```

### 4. Test Authorization Failure

Without authentication:

```bash
curl http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request",
    "method": "tools/call",
    "params": {
      "name": "get-user-data",
      "arguments": {}
    }
  }'
```

**Response:**
```json
{
  "type": "error",
  "error": {
    "code": 401,
    "message": "Authentication required"
  }
}
```

## Architecture

### Security Layers

```
1. Global Rate Limiting (100 req/min)
         ↓
2. Authentication (JWT or API Key)
         ↓
3. User Rate Limiting (1000 req/hour)
         ↓
4. Authorization (RBAC)
         ↓
5. Tool Execution
```

### Middleware Order

```typescript
// Priority 90: Rate limit (cheap, blocks early)
createRateLimitMiddleware({ max: 100, windowMs: 60000 })

// Priority 100: Authentication (verify identity)
flexibleAuthMiddleware

// Priority 90: User rate limit (after knowing user)
createRateLimitMiddleware({ max: 1000, windowMs: 3600000 })

// Priority 50: Authorization (check permissions)
authorizationMiddleware
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for JWT signing/verification | ⚠️ change-this | Yes |
| `API_KEYS` | Comma-separated API keys | - | Yes |
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |

### Rate Limits

| Account Type | Limit | Window |
|--------------|-------|--------|
| Anonymous | 100 | 1 minute |
| Free User | 1,000 | 1 hour |
| Pro User | 10,000 | 1 hour |
| Service/Enterprise | Unlimited | - |

## Production Deployment

### Checklist

- [ ] Generate strong JWT secret (32+ bytes)
- [ ] Use HTTPS/TLS
- [ ] Store secrets in vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable logging and monitoring
- [ ] Set up Redis for distributed rate limiting
- [ ] Configure CORS for browser clients
- [ ] Set up health checks
- [ ] Configure reverse proxy (nginx, Caddy)
- [ ] Enable rate limit headers in responses

### Using Redis for Distributed Systems

```typescript
import Redis from 'ioredis';
import { createRedisStore } from '@mcp-accelerator/middleware-ratelimit';

const redis = new Redis(process.env.REDIS_URL);

server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60000,
  store: createRedisStore(redis, { windowMs: 60000 })
}));
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```bash
docker build -t mcp-secure-api .
docker run -p 3000:3000 \
  -e JWT_SECRET="your-secret" \
  -e API_KEYS="key1,key2" \
  mcp-secure-api
```

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use environment variables or secret vaults
   - Rotate secrets regularly

2. **Rate Limiting**
   - Set conservative limits initially
   - Monitor and adjust based on usage
   - Use Redis in multi-instance deployments

3. **Authentication**
   - Use short-lived JWTs (15-60 minutes)
   - Implement refresh tokens
   - Log failed authentication attempts

4. **Authorization**
   - Implement least privilege
   - Validate permissions on every request
   - Audit permission changes

5. **Monitoring**
   - Track authentication failures
   - Monitor rate limit hits
   - Alert on unusual patterns

## Troubleshooting

### Issue: "Authentication required" even with valid token

**Check:**
1. Token hasn't expired
2. Correct secret is used
3. Header format is correct: `Authorization: Bearer TOKEN`
4. Token is valid JWT format

### Issue: Rate limiting not working across instances

**Solution**: Use Redis store instead of in-memory:

```typescript
import { createRedisStore } from '@mcp-accelerator/middleware-ratelimit';
const store = createRedisStore(redis, { windowMs: 60000 });
```

### Issue: CORS errors in browser

**Solution**: Add CORS middleware (for HTTP transport):

```typescript
import { productionCORS } from '@mcp-accelerator/middleware-cors';
// Configure CORS at transport level
```

## Learn More

- [Security Packages Guide](../../docs/SECURITY_PACKAGES.md)
- [Authentication Package](../../packages/middleware-auth/README.md)
- [Rate Limiting Package](../../packages/middleware-ratelimit/README.md)
- [Main Documentation](../../README.md)

## License

MIT
