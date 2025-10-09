# Production-Ready Server Example

This comprehensive example demonstrates how to build a production-ready MCP server with authentication, security, monitoring, and all best practices.

## 🎯 Overview

This example showcases:
- **TLS/HTTPS** encryption
- **JWT Authentication** with role-based access
- **Rate limiting** and **CORS** protection
- **OpenTelemetry** observability
- **Circuit breaker** for resilience
- **Graceful shutdown** handling
- **Health checks** and monitoring
- **Comprehensive logging**

## 📁 Project Structure

```
production-server/
├── src/
│   ├── index.ts              # Main server file
│   ├── tools/                # Tool implementations
│   │   ├── search.ts
│   │   ├── analyze.ts
│   │   └── index.ts
│   ├── middleware/           # Custom middleware
│   │   └── audit.ts
│   └── config/               # Configuration
│       └── server.ts
├── package.json
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 🚀 Implementation

### Main Server (`src/index.ts`)

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HTTPTransport } from '@mcp-accelerator/transport-http';
import { JWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';
import { CORSMiddleware } from '@mcp-accelerator/middleware-cors';
import { RateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';
import { CircuitBreakerMiddleware } from '@mcp-accelerator/middleware-resilience';
import { ObservabilityMiddleware } from '@mcp-accelerator/middleware-observability';
import { createTracer } from '@mcp-accelerator/middleware-observability';

import { serverConfig } from './config/server';
import { registerTools } from './tools';
import { AuditMiddleware } from './middleware/audit';

async function createProductionServer() {
  // Create tracer for distributed tracing
  const tracer = createTracer('production-mcp-server');

  // Create server with production configuration
  const server = new MCPServer({
    name: serverConfig.name,
    version: serverConfig.version,
    description: 'Production-ready MCP server with full observability',
    logger: {
      level: serverConfig.logLevel,
      format: 'json'
    }
  });

  // Configure middleware stack (order matters!)
  server.use(new JWTAuthMiddleware({
    secret: serverConfig.jwt.secret,
    algorithms: ['HS256'],
    issuer: serverConfig.jwt.issuer,
    audience: serverConfig.jwt.audience
  }));

  server.use(new RateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: serverConfig.rateLimit.maxRequests,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }));

  server.use(new CORSMiddleware({
    origin: serverConfig.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  server.use(new CircuitBreakerMiddleware({
    threshold: 5,
    timeout: 30000,
    resetTimeout: 60000,
    monitoringPeriod: 10000
  }));

  server.use(new ObservabilityMiddleware({
    tracer,
    metrics: true,
    logging: true,
    samplingRate: serverConfig.observability.samplingRate
  }));

  // Custom audit middleware
  server.use(new AuditMiddleware({
    auditLog: serverConfig.audit.enabled,
    sensitiveFields: ['password', 'token', 'secret']
  }));

  // Register lifecycle hooks for monitoring
  server.onRequest((context) => {
    context.startTime = Date.now();
    server.logger.info('Request started', {
      toolName: context.request.toolName,
      clientId: context.clientId,
      userAgent: context.request.headers?.['user-agent']
    });
  });

  server.onResponse((context) => {
    const duration = Date.now() - context.startTime;
    server.logger.info('Request completed', {
      toolName: context.request.toolName,
      clientId: context.clientId,
      duration,
      status: 'success'
    });
  });

  server.onError((context) => {
    const duration = Date.now() - context.startTime;
    server.logger.error('Request failed', context.error, {
      toolName: context.request.toolName,
      clientId: context.clientId,
      duration,
      status: 'error'
    });
  });

  // Register tools
  await registerTools(server);

  // Create HTTPS transport with TLS
  const transport = new HTTPTransport({
    port: serverConfig.port,
    host: serverConfig.host,
    serverOptions: {
      https: {
        key: serverConfig.tls.privateKey,
        cert: serverConfig.tls.certificate,
        ca: serverConfig.tls.caCertificate
      },
      logger: {
        level: serverConfig.logLevel
      },
      trustProxy: true,
      requestTimeout: serverConfig.timeouts.request,
      keepAliveTimeout: serverConfig.timeouts.keepAlive
    }
  });

  // Start server
  await server.start(transport);

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    server.logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      await server.stop();
      server.logger.info('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      server.logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.logger.info('Production server started', {
    port: serverConfig.port,
    host: serverConfig.host,
    environment: process.env.NODE_ENV
  });

  return server;
}

// Start server if this file is run directly
if (require.main === module) {
  createProductionServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { createProductionServer };
```

### Server Configuration (`src/config/server.ts`)

```typescript
import { z } from 'zod';

const configSchema = z.object({
  name: z.string().default('Production MCP Server'),
  version: z.string().default('1.0.0'),
  port: z.number().default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  tls: z.object({
    enabled: z.boolean().default(true),
    privateKey: z.string(),
    certificate: z.string(),
    caCertificate: z.string().optional()
  }),
  
  jwt: z.object({
    secret: z.string(),
    issuer: z.string().default('mcp-server'),
    audience: z.string().default('mcp-clients'),
    expiresIn: z.string().default('1h')
  }),
  
  cors: z.object({
    allowedOrigins: z.array(z.string()).default(['*']),
    credentials: z.boolean().default(true)
  }),
  
  rateLimit: z.object({
    maxRequests: z.number().default(100),
    windowMs: z.number().default(15 * 60 * 1000)
  }),
  
  timeouts: z.object({
    request: z.number().default(30000),
    keepAlive: z.number().default(5000)
  }),
  
  observability: z.object({
    samplingRate: z.number().min(0).max(1).default(0.1),
    metricsEnabled: z.boolean().default(true),
    tracingEnabled: z.boolean().default(true)
  }),
  
  audit: z.object({
    enabled: z.boolean().default(true),
    logLevel: z.enum(['info', 'warn', 'error']).default('info')
  })
});

export const serverConfig = configSchema.parse({
  name: process.env.SERVER_NAME || 'Production MCP Server',
  version: process.env.SERVER_VERSION || '1.0.0',
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  tls: {
    enabled: process.env.TLS_ENABLED === 'true',
    privateKey: process.env.TLS_PRIVATE_KEY || '',
    certificate: process.env.TLS_CERTIFICATE || '',
    caCertificate: process.env.TLS_CA_CERTIFICATE
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    issuer: process.env.JWT_ISSUER || 'mcp-server',
    audience: process.env.JWT_AUDIENCE || 'mcp-clients',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000')
  },
  
  timeouts: {
    request: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    keepAlive: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000')
  },
  
  observability: {
    samplingRate: parseFloat(process.env.SAMPLING_RATE || '0.1'),
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    tracingEnabled: process.env.TRACING_ENABLED !== 'false'
  },
  
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info'
  }
});
```

### Tool Implementation (`src/tools/search.ts`)

```typescript
import { ToolDefinition, safeHandler } from '@mcp-accelerator/core';
import { z } from 'zod';

const searchInputSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(100).default(10),
  filters: z.object({
    category: z.string().optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional()
});

export const searchTool: ToolDefinition = {
  name: 'search',
  description: 'Search documents and data with advanced filtering',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
        minLength: 1,
        maxLength: 1000
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        minimum: 1,
        maximum: 100,
        default: 10
      },
      filters: {
        type: 'object',
        description: 'Optional filters to apply',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category'
          },
          dateRange: {
            type: 'object',
            description: 'Filter by date range',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          }
        }
      }
    },
    required: ['query']
  }
};

export const searchHandler = safeHandler(
  async (input) => {
    // Validate input with Zod for additional safety
    const validatedInput = searchInputSchema.parse(input);
    
    // Simulate search operation with external service
    const results = await performSearch(validatedInput);
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} results for "${validatedInput.query}"`
        }
      ],
      metadata: {
        query: validatedInput.query,
        resultCount: results.length,
        executionTime: results.executionTime
      }
    };
  },
  {
    timeout: 10000, // 10 second timeout
    retry: {
      attempts: 3,
      delay: 1000
    }
  }
);

async function performSearch(input: any) {
  // Simulate external API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    results: [
      { id: 1, title: 'Result 1', content: 'Content 1' },
      { id: 2, title: 'Result 2', content: 'Content 2' }
    ],
    executionTime: 100
  };
}
```

### Custom Audit Middleware (`src/middleware/audit.ts`)

```typescript
import { Middleware, MiddlewareContext, NextFunction } from '@mcp-accelerator/core';

interface AuditOptions {
  auditLog: boolean;
  sensitiveFields: string[];
}

export class AuditMiddleware implements Middleware {
  name = 'audit';
  priority = 50; // Low priority, runs after most middleware

  constructor(private options: AuditOptions) {}

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      await next();
      
      if (this.options.auditLog) {
        this.logAuditEvent({
          event: 'tool_execution_success',
          toolName: context.request.toolName,
          clientId: context.clientId,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      if (this.options.auditLog) {
        this.logAuditEvent({
          event: 'tool_execution_error',
          toolName: context.request.toolName,
          clientId: context.clientId,
          error: error.message,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  }

  private logAuditEvent(event: any) {
    // Sanitize sensitive fields
    const sanitizedEvent = this.sanitizeEvent(event);
    
    // Log to audit system (e.g., SIEM, database, etc.)
    console.log('[AUDIT]', JSON.stringify(sanitizedEvent));
  }

  private sanitizeEvent(event: any): any {
    const sanitized = { ...event };
    
    // Remove or mask sensitive fields
    this.options.sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}
```

### Package Configuration (`package.json`)

```json
{
  "name": "production-mcp-server",
  "version": "1.0.0",
  "description": "Production-ready MCP server example",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "docker:build": "docker build -t production-mcp-server .",
    "docker:run": "docker run -p 3000:3000 production-mcp-server"
  },
  "dependencies": {
    "@mcp-accelerator/core": "^1.0.0",
    "@mcp-accelerator/transport-http": "^1.0.0",
    "@mcp-accelerator/middleware-auth": "^1.0.0",
    "@mcp-accelerator/middleware-cors": "^1.0.0",
    "@mcp-accelerator/middleware-ratelimit": "^1.0.0",
    "@mcp-accelerator/middleware-resilience": "^1.0.0",
    "@mcp-accelerator/middleware-observability": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Environment Configuration (`.env.example`)

```bash
# Server Configuration
SERVER_NAME=Production MCP Server
SERVER_VERSION=1.0.0
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# TLS Configuration
TLS_ENABLED=true
TLS_PRIVATE_KEY=/path/to/private.key
TLS_CERTIFICATE=/path/to/certificate.crt
TLS_CA_CERTIFICATE=/path/to/ca.crt

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ISSUER=mcp-server
JWT_AUDIENCE=mcp-clients
JWT_EXPIRES_IN=1h

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Timeouts
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=5000

# Observability
SAMPLING_RATE=0.1
METRICS_ENABLED=true
TRACING_ENABLED=true

# Audit
AUDIT_ENABLED=true
AUDIT_LOG_LEVEL=info
```

### Docker Configuration (`Dockerfile`)

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - TLS_ENABLED=true
    volumes:
      - ./certs:/app/certs:ro
    depends_on:
      - prometheus
      - jaeger
    networks:
      - mcp-network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - mcp-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

## 🚀 Running the Example

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Generate TLS Certificates (for development)

```bash
# Generate self-signed certificates for development
openssl req -x509 -newkey rsa:4096 -keyout certs/private.key -out certs/certificate.crt -days 365 -nodes
```

### 4. Build and Run

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Docker
docker-compose up
```

### 5. Test the Server

```bash
# Health check
curl -k https://localhost:3000/health

# List tools
curl -k https://localhost:3000/tools

# Execute tool (with JWT token)
curl -k https://localhost:3000/tools/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test search"}'
```

## 📊 Monitoring and Observability

### Metrics Endpoint

```bash
# Prometheus metrics
curl https://localhost:3000/metrics
```

### Health Checks

```bash
# Basic health check
curl https://localhost:3000/health

# Detailed health check
curl https://localhost:3000/health/detailed
```

### Distributed Tracing

- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090

## 🔒 Security Features

1. **TLS Encryption**: All communications encrypted
2. **JWT Authentication**: Secure token-based authentication
3. **Rate Limiting**: Protection against abuse
4. **CORS**: Configurable cross-origin policies
5. **Input Validation**: Comprehensive input sanitization
6. **Audit Logging**: Complete audit trail
7. **Error Sanitization**: No sensitive data in error responses

## 🎯 Production Checklist

- [ ] TLS certificates configured
- [ ] JWT secrets are strong and rotated
- [ ] Rate limits are appropriate for your use case
- [ ] CORS origins are properly configured
- [ ] Monitoring and alerting are set up
- [ ] Log aggregation is configured
- [ ] Backup and disaster recovery plans are in place
- [ ] Security scanning is performed regularly
- [ ] Performance testing is completed
- [ ] Documentation is up to date

---

*This production-ready example provides a solid foundation for building robust, secure, and scalable MCP servers.* 🚀
