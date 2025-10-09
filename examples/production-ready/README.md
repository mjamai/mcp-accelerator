# Production-Ready MCP Server Example

> **Enterprise-grade MCP server** with TLS, authentication, rate limiting, and full observability.

---

## Features

- ✅ **TLS/HTTPS**: Secure communication with SSL/TLS certificates
- ✅ **JWT Authentication**: Token-based authentication with role-based access
- ✅ **Rate Limiting**: Per-user rate limiting (100 req/min)
- ✅ **CORS**: Cross-origin resource sharing configuration
- ✅ **Circuit Breaker**: Automatic failure protection (5 failures = open circuit)
- ✅ **OpenTelemetry**: Distributed tracing and metrics export
- ✅ **Graceful Shutdown**: Clean shutdown on SIGTERM/SIGINT
- ✅ **Error Handling**: Centralized error handling with safe handlers
- ✅ **Backpressure**: Request queue management (100 concurrent, 200 queue)
- ✅ **Health Checks**: Health and metrics endpoints
- ✅ **Request Timeout**: 30s request timeout with retry logic

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate TLS Certificates

```bash
npm run generate-certs
```

This creates self-signed certificates in `./certs/` directory:
- `certs/key.pem` - Private key
- `certs/cert.pem` - Certificate

**For production**, use certificates from Let's Encrypt or your organization's PKI.

### 3. Set Environment Variables

```bash
export JWT_SECRET="your-production-secret-key"
export TLS_KEY_PATH="./certs/key.pem"
export TLS_CERT_PATH="./certs/cert.pem"
export PORT="8443"
export HOST="0.0.0.0"
export CORS_ORIGIN="https://yourdomain.com"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

### 4. Start the Server

```bash
npm start
```

You should see:

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🚀 Production MCP Server is running                         ║
║                                                              ║
║  🔒 Protocol:      HTTPS                                     ║
║  🌐 URL:           https://0.0.0.0:8443                      ║
║  🔑 Auth:          JWT Bearer Token                          ║
║  📊 Observability: OpenTelemetry                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Testing

### Generate JWT Token

Create a test script `generate-token.js`:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    roles: ['user'],
  },
  process.env.JWT_SECRET || 'your-production-secret-key',
  { expiresIn: '1h' }
);

console.log('JWT Token:');
console.log(token);
```

Run it:

```bash
node generate-token.js
```

### Test Authenticated Request

```bash
curl -X POST https://localhost:8443/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "type": "request",
    "id": "1",
    "method": "tools/execute",
    "params": {
      "name": "process-data",
      "input": {
        "userId": "123e4567-e89b-12d3-a456-426614174000",
        "action": "fetch"
      }
    }
  }' \
  --insecure
```

**Note**: `--insecure` flag is for self-signed certificates. Remove for production.

### Test Health Check (Public Endpoint)

```bash
curl https://localhost:8443/health --insecure
```

Response:

```json
{
  "status": "ok",
  "transport": "http",
  "activeRequests": 0,
  "queueSize": 0,
  "circuitState": "closed"
}
```

### Test Rate Limiting

Make 101 requests in quick succession to trigger rate limiting:

```bash
for i in {1..101}; do
  curl -X POST https://localhost:8443/mcp \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"type":"request","id":"'$i'","method":"tools/list"}' \
    --insecure
done
```

After 100 requests, you'll receive:

```json
{
  "type": "error",
  "error": {
    "code": -32603,
    "message": "Rate limit exceeded",
    "data": {
      "limit": 100,
      "retryAfter": 45
    }
  }
}
```

### Test Circuit Breaker

Simulate failures to open the circuit breaker:

```bash
# Trigger 5+ errors to open circuit
for i in {1..6}; do
  curl -X POST https://localhost:8443/mcp \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid_token" \
    -d '{"type":"request","id":"'$i'","method":"tools/list"}' \
    --insecure
done

# Next request will be rejected immediately (503 Circuit Breaker Open)
curl -X POST https://localhost:8443/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"request","id":"7","method":"tools/list"}' \
  --insecure
```

---

## Available Tools

### 1. process-data

Process user data with validation and authorization.

**Input:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "action": "fetch" | "update" | "delete",
  "data": { ... } (optional)
}
```

**Output:**
```json
{
  "success": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "action": "fetch",
  "timestamp": "2025-10-09T...",
  "processedBy": "user@example.com"
}
```

### 2. get-profile

Get user profile information (requires auth).

**Input:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Output:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user-123e4567@example.com",
  "name": "User 123e4567",
  "roles": ["user"],
  "createdAt": "2025-10-09T..."
}
```

**Authorization**: Users can only access their own profile unless they have the `admin` role.

### 3. health-check

Check server health status (public endpoint).

**Input:** `{}`

**Output:**
```json
{
  "status": "healthy",
  "server": {
    "name": "production-server",
    "version": "1.0.0",
    "isRunning": true,
    "transport": "http",
    "toolsCount": 3,
    "clientsCount": 2
  },
  "timestamp": "2025-10-09T..."
}
```

---

## Monitoring

### Metrics Endpoint

```bash
curl https://localhost:8443/metrics --insecure
```

Response:

```json
{
  "activeRequests": 2,
  "queueSize": 0,
  "connectedClients": 5,
  "circuitBreaker": {
    "state": "closed",
    "failures": 0,
    "successes": 123
  }
}
```

### OpenTelemetry Integration

The server exports metrics and traces to OpenTelemetry Collector.

**Metrics exported:**
- `mcp.requests.total` - Total requests by method
- `mcp.errors.total` - Total errors by type
- `mcp.connections.active` - Active connections
- `mcp.request.duration` - Request duration histogram
- `mcp.tool.duration` - Tool execution duration

**Setup OpenTelemetry Collector:**

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: debug

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [prometheus, logging]
```

Run collector:

```bash
docker run -p 4317:4317 -p 4318:4318 -p 8889:8889 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otel-collector-config.yaml \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector-config.yaml
```

---

## Deployment

### Docker

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Copy certificates (or mount as volume)
COPY certs/ /app/certs/

# Expose port
EXPOSE 8443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('https://localhost:8443/health', { rejectUnauthorized: false })"

# Start server
CMD ["node", "index.js"]
```

**Build and run:**

```bash
docker build -t mcp-production-server .

docker run -d \
  -p 8443:8443 \
  -e JWT_SECRET="your-secret" \
  -e TLS_KEY_PATH="/app/certs/key.pem" \
  -e TLS_CERT_PATH="/app/certs/cert.pem" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318" \
  --name mcp-server \
  mcp-production-server
```

### Docker Compose

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "8443:8443"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - TLS_KEY_PATH=/app/certs/key.pem
      - TLS_CERT_PATH=/app/certs/cert.pem
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
    volumes:
      - ./certs:/app/certs:ro
    depends_on:
      - otel-collector
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "-k", "https://localhost:8443/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

**Start stack:**

```bash
docker-compose up -d
```

**Access dashboards:**
- Server: https://localhost:8443
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key-change-me` | Yes (prod) |
| `TLS_KEY_PATH` | Path to TLS private key | `./certs/key.pem` | No |
| `TLS_CERT_PATH` | Path to TLS certificate | `./certs/cert.pem` | No |
| `PORT` | Server port | `8443` (HTTPS) or `8080` (HTTP) | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `CORS_ORIGIN` | CORS allowed origin | `*` | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | `http://localhost:4318` | No |

---

## Security Best Practices

### 1. JWT Secret Management

**❌ Don't:**
- Hardcode secrets in code
- Use weak secrets
- Commit secrets to git

**✅ Do:**
- Use environment variables
- Use strong random secrets (min 32 characters)
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)

```bash
# Generate strong secret
openssl rand -base64 32
```

### 2. TLS Configuration

**❌ Don't:**
- Use self-signed certificates in production
- Use outdated TLS versions (< TLS 1.2)
- Expose private keys

**✅ Do:**
- Use certificates from trusted CA (Let's Encrypt)
- Enable TLS 1.2+ only
- Store private keys securely (file permissions 600)
- Implement certificate rotation

### 3. Rate Limiting

Adjust based on your infrastructure:

```typescript
createRateLimitMiddleware({
  maxRequests: 100,       // Adjust based on capacity
  windowMs: 60000,        // 1 minute window
  keyGenerator: (ctx) => ctx.metadata.user?.id, // Per-user limiting
})
```

### 4. CORS Configuration

Be restrictive in production:

```typescript
createCorsMiddleware({
  origin: 'https://yourdomain.com',  // Specific domain
  credentials: true,                  // Allow cookies
  allowedHeaders: ['Content-Type', 'Authorization'], // Explicit headers
})
```

### 5. Error Handling

Don't leak sensitive information:

```typescript
// ❌ Don't expose internals
throw new Error('Database connection failed: postgres://user:pass@host')

// ✅ Generic user-facing message
throw new Error('Service temporarily unavailable')
```

---

## Troubleshooting

### Server won't start

**Problem**: Port already in use

```bash
Error: listen EADDRINUSE: address already in use 0.0.0.0:8443
```

**Solution**:
```bash
# Find process using port
lsof -i :8443

# Kill process
kill -9 <PID>

# Or use different port
export PORT=8444
npm start
```

### TLS certificate errors

**Problem**: Certificate not found or invalid

```bash
Error: ENOENT: no such file or directory, open './certs/key.pem'
```

**Solution**:
```bash
# Generate new certificates
npm run generate-certs

# Or specify correct paths
export TLS_KEY_PATH=/path/to/key.pem
export TLS_CERT_PATH=/path/to/cert.pem
```

### Authentication failures

**Problem**: JWT token invalid or expired

```json
{
  "error": {
    "code": -32600,
    "message": "Invalid or expired token"
  }
}
```

**Solution**:
- Generate new token
- Check JWT_SECRET matches
- Verify token not expired (default 1h)

### Circuit breaker stuck open

**Problem**: Circuit breaker remains open after failures

**Solution**:
Wait for timeout (default 60s) or restart server:

```bash
# Wait for circuit to close automatically
# Or restart
npm start
```

---

## Performance Tuning

### Concurrency Settings

Adjust based on your infrastructure:

```typescript
new HttpTransport({
  maxConcurrentRequests: 100,  // Increase for high traffic
  maxQueueSize: 200,           // Increase for bursty traffic
  requestTimeout: 30000,       // Adjust based on tool complexity
})
```

### Rate Limit Configuration

```typescript
createRateLimitMiddleware({
  maxRequests: 1000,     // Higher for production
  windowMs: 60000,       // Consider larger windows
})
```

### Circuit Breaker Tuning

```typescript
new HttpTransport({
  circuitBreakerThreshold: 10,   // More failures before opening
  circuitBreakerTimeout: 30000,  // Faster recovery
})
```

---

## Additional Resources

- [MCP Accelerator Documentation](../../docs/)
- [Middleware Guide](../../docs/MIDDLEWARE_GUIDE.md)
- [Technical Review](../../docs/TECHNICAL_REVIEW.md)
- [Security Guide](../../docs/SECURITY_PACKAGES.md)

---

## License

MIT © Mohamed JAMAI

