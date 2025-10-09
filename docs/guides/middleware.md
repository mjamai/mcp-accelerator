# Middleware System

The middleware system in MCP Accelerator provides a powerful plugin architecture for adding cross-cutting concerns to your MCP server. This guide covers all available middleware and how to create custom middleware.

## 🏗️ Middleware Architecture

Middleware in MCP Accelerator follows a pipeline pattern where each middleware can:
- Process the request before it reaches the tool handler
- Process the response after the tool handler completes
- Short-circuit the pipeline by throwing an error
- Add metadata and context to requests

```typescript
interface Middleware {
  name: string;
  priority: number;
  execute(context: MiddlewareContext, next: NextFunction): Promise<void>;
}
```

### Execution Order

Middleware executes in **priority order** (highest to lowest):

```typescript
// Higher priority = executes first
server.use(new AuthenticationMiddleware({ priority: 100 }));
server.use(new RateLimitMiddleware({ priority: 90 }));
server.use(new CORSMiddleware({ priority: 80 }));
server.use(new LoggingMiddleware({ priority: 70 }));
```

## 🛡️ Built-in Middleware

### 1. Authentication Middleware

**Package:** `@mcp-accelerator/middleware-auth`

Provides JWT and API key authentication.

#### JWT Authentication

```typescript
import { JWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';

server.use(new JWTAuthMiddleware({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  issuer: 'mcp-server',
  audience: 'mcp-clients',
  ignoreExpiration: false,
  clockTolerance: 30
}));
```

**Configuration:**
- `secret`: JWT secret key
- `algorithms`: Allowed signing algorithms
- `issuer`: Expected JWT issuer
- `audience`: Expected JWT audience
- `ignoreExpiration`: Skip expiration check
- `clockTolerance`: Clock skew tolerance in seconds

#### API Key Authentication

```typescript
import { APIKeyAuthMiddleware } from '@mcp-accelerator/middleware-auth';

server.use(new APIKeyAuthMiddleware({
  apiKeys: new Map([
    ['key1', { permissions: ['read', 'write'], userId: 'user1' }],
    ['key2', { permissions: ['read'], userId: 'user2' }]
  ]),
  headerName: 'X-API-Key',
  queryParam: 'api_key'
}));
```

### 2. CORS Middleware

**Package:** `@mcp-accelerator/middleware-cors`

Handles Cross-Origin Resource Sharing.

```typescript
import { CORSMiddleware } from '@mcp-accelerator/middleware-cors';

server.use(new CORSMiddleware({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Rate-Limit-Remaining'],
  maxAge: 86400
}));
```

**Configuration:**
- `origin`: Allowed origins (array, string, or function)
- `credentials`: Allow credentials
- `methods`: Allowed HTTP methods
- `allowedHeaders`: Allowed request headers
- `exposedHeaders`: Headers exposed to client
- `maxAge`: Preflight cache duration

### 3. Rate Limiting Middleware

**Package:** `@mcp-accelerator/middleware-ratelimit`

Protects against abuse and DoS attacks.

```typescript
import { RateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';

server.use(new RateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false
}));
```

**Configuration:**
- `windowMs`: Time window in milliseconds
- `max`: Maximum requests per window
- `keyGenerator`: Function to generate rate limit key
- `skipSuccessfulRequests`: Skip successful requests
- `skipFailedRequests`: Skip failed requests
- `standardHeaders`: Add standard rate limit headers
- `legacyHeaders`: Add legacy rate limit headers

### 4. Resilience Middleware

**Package:** `@mcp-accelerator/middleware-resilience`

Provides circuit breaker, retry, and timeout functionality.

#### Circuit Breaker

```typescript
import { CircuitBreakerMiddleware } from '@mcp-accelerator/middleware-resilience';

server.use(new CircuitBreakerMiddleware({
  threshold: 5, // Number of failures before opening
  timeout: 30000, // How long to wait before trying again
  resetTimeout: 60000, // How long to wait before resetting
  monitoringPeriod: 10000, // How often to check circuit state
  errorFilter: (error) => error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR'
}));
```

#### Retry Middleware

```typescript
import { RetryMiddleware } from '@mcp-accelerator/middleware-resilience';

server.use(new RetryMiddleware({
  attempts: 3,
  delay: 1000,
  backoff: 'exponential', // 'linear' | 'exponential'
  maxDelay: 10000,
  retryCondition: (error) => error.code === 'TIMEOUT'
}));
```

#### Timeout Middleware

```typescript
import { TimeoutMiddleware } from '@mcp-accelerator/middleware-resilience';

server.use(new TimeoutMiddleware({
  timeout: 30000, // 30 seconds
  onTimeout: (context) => {
    console.log('Request timed out:', context.request.toolName);
  }
}));
```

### 5. Observability Middleware

**Package:** `@mcp-accelerator/middleware-observability`

Provides logging, metrics, and tracing.

```typescript
import { ObservabilityMiddleware } from '@mcp-accelerator/middleware-observability';
import { createTracer } from '@mcp-accelerator/middleware-observability';

const tracer = createTracer('my-mcp-server');

server.use(new ObservabilityMiddleware({
  tracer,
  metrics: true,
  logging: true,
  samplingRate: 0.1, // Sample 10% of requests
  customMetrics: {
    'custom_metric_total': 'counter',
    'custom_duration_seconds': 'histogram'
  }
}));
```

## 🔧 Custom Middleware

### Creating Custom Middleware

```typescript
import { Middleware, MiddlewareContext, NextFunction } from '@mcp-accelerator/core';

class CustomMiddleware implements Middleware {
  name = 'custom';
  priority = 85;

  constructor(private options: CustomMiddlewareOptions) {}

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Pre-processing
      this.preProcess(context);
      
      // Call next middleware or tool handler
      await next();
      
      // Post-processing
      this.postProcess(context, Date.now() - startTime);
    } catch (error) {
      // Error handling
      this.handleError(context, error);
      throw error;
    }
  }

  private preProcess(context: MiddlewareContext): void {
    // Add custom headers, validate request, etc.
    context.request.customData = this.extractCustomData(context.request);
  }

  private postProcess(context: MiddlewareContext, duration: number): void {
    // Log metrics, update cache, etc.
    this.recordMetrics(context, duration);
  }

  private handleError(context: MiddlewareContext, error: Error): void {
    // Custom error handling
    this.logError(context, error);
  }

  private extractCustomData(request: any): any {
    // Extract custom data from request
    return {
      userAgent: request.headers?.['user-agent'],
      timestamp: new Date().toISOString()
    };
  }

  private recordMetrics(context: MiddlewareContext, duration: number): void {
    // Record custom metrics
    console.log(`Request to ${context.request.toolName} took ${duration}ms`);
  }

  private logError(context: MiddlewareContext, error: Error): void {
    console.error(`Error in ${context.request.toolName}:`, error.message);
  }
}

// Usage
server.use(new CustomMiddleware({
  // custom options
}));
```

### Middleware Context

```typescript
interface MiddlewareContext {
  clientId: string;
  request: MCPRequest;
  response?: MCPResponse;
  error?: Error;
  metadata: Record<string, any>;
  logger: Logger;
  metrics: MetricsCollector;
}
```

### Next Function

```typescript
type NextFunction = () => Promise<void>;
```

## 🎯 Middleware Patterns

### 1. Request Validation

```typescript
class ValidationMiddleware implements Middleware {
  name = 'validation';
  priority = 95;

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    // Validate request format
    if (!this.isValidRequest(context.request)) {
      throw createMCPError(
        MCPErrorCode.VALIDATION_ERROR,
        'Invalid request format'
      );
    }

    await next();
  }

  private isValidRequest(request: MCPRequest): boolean {
    // Custom validation logic
    return request.toolName && typeof request.toolName === 'string';
  }
}
```

### 2. Request Logging

```typescript
class RequestLoggingMiddleware implements Middleware {
  name = 'requestLogging';
  priority = 60;

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    context.logger.info('Request started', {
      toolName: context.request.toolName,
      clientId: context.clientId,
      timestamp: new Date().toISOString()
    });

    try {
      await next();
      
      const duration = Date.now() - startTime;
      context.logger.info('Request completed', {
        toolName: context.request.toolName,
        clientId: context.clientId,
        duration,
        status: 'success'
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      context.logger.error('Request failed', error, {
        toolName: context.request.toolName,
        clientId: context.clientId,
        duration,
        status: 'error'
      });
      throw error;
    }
  }
}
```

### 3. Response Transformation

```typescript
class ResponseTransformMiddleware implements Middleware {
  name = 'responseTransform';
  priority = 10; // Low priority, runs last

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    await next();
    
    // Transform response if needed
    if (context.response) {
      context.response = this.transformResponse(context.response);
    }
  }

  private transformResponse(response: MCPResponse): MCPResponse {
    // Add custom headers, modify content, etc.
    return {
      ...response,
      metadata: {
        ...response.metadata,
        transformedAt: new Date().toISOString()
      }
    };
  }
}
```

### 4. Caching

```typescript
class CachingMiddleware implements Middleware {
  name = 'caching';
  priority = 75;

  private cache = new Map<string, { data: any; expiry: number }>();

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    const cacheKey = this.generateCacheKey(context.request);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      context.response = cached.data;
      return;
    }

    await next();

    // Cache response
    if (context.response) {
      this.cache.set(cacheKey, {
        data: context.response,
        expiry: Date.now() + this.options.ttl
      });
    }
  }

  private generateCacheKey(request: MCPRequest): string {
    return `${request.toolName}:${JSON.stringify(request.input)}`;
  }
}
```

## 🔄 Middleware Composition

### Conditional Middleware

```typescript
class ConditionalMiddleware implements Middleware {
  name = 'conditional';
  priority = 85;

  constructor(
    private condition: (context: MiddlewareContext) => boolean,
    private middleware: Middleware
  ) {}

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    if (this.condition(context)) {
      await this.middleware.execute(context, next);
    } else {
      await next();
    }
  }
}

// Usage
server.use(new ConditionalMiddleware(
  (context) => context.request.toolName === 'admin-tool',
  new AdminOnlyMiddleware()
));
```

### Middleware Groups

```typescript
class MiddlewareGroup implements Middleware {
  name = 'middlewareGroup';
  priority = 80;

  constructor(
    private name: string,
    private middlewares: Middleware[]
  ) {}

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    let index = 0;
    
    const executeNext = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return next();
      }
      
      const middleware = this.middlewares[index++];
      await middleware.execute(context, executeNext);
    };

    await executeNext();
  }
}

// Usage
server.use(new MiddlewareGroup('auth', [
  new JWTAuthMiddleware({ secret: process.env.JWT_SECRET }),
  new PermissionMiddleware({ requiredPermissions: ['read', 'write'] })
]));
```

## 📊 Monitoring and Debugging

### Middleware Metrics

```typescript
class MetricsMiddleware implements Middleware {
  name = 'metrics';
  priority = 50;

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      await next();
      
      context.metrics.incrementCounter('middleware_executions_total', {
        middleware: this.name,
        status: 'success'
      });
    } catch (error) {
      context.metrics.incrementCounter('middleware_executions_total', {
        middleware: this.name,
        status: 'error'
      });
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      context.metrics.observeHistogram('middleware_duration_seconds', duration / 1000, {
        middleware: this.name
      });
    }
  }
}
```

### Debug Mode

```typescript
class DebugMiddleware implements Middleware {
  name = 'debug';
  priority = 1; // Lowest priority

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    if (process.env.DEBUG === 'true') {
      console.log('Middleware execution order:', context.metadata.executionOrder);
      console.log('Request context:', JSON.stringify(context.request, null, 2));
    }

    await next();

    if (process.env.DEBUG === 'true') {
      console.log('Response:', JSON.stringify(context.response, null, 2));
    }
  }
}
```

## 🎯 Best Practices

### 1. Middleware Ordering

```typescript
// Order by priority (highest to lowest)
server.use(new AuthenticationMiddleware({ priority: 100 }));  // Auth first
server.use(new RateLimitMiddleware({ priority: 90 }));        // Rate limiting
server.use(new CORSMiddleware({ priority: 80 }));            // CORS
server.use(new ValidationMiddleware({ priority: 70 }));       // Validation
server.use(new LoggingMiddleware({ priority: 60 }));         // Logging
server.use(new MetricsMiddleware({ priority: 50 }));         // Metrics
server.use(new ResponseTransformMiddleware({ priority: 10 })); // Transform last
```

### 2. Error Handling

```typescript
class SafeMiddleware implements Middleware {
  name = 'safe';
  priority = 85;

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    try {
      await next();
    } catch (error) {
      // Log error but don't break the pipeline
      context.logger.error('Middleware error', error);
      
      // Re-throw if it's a critical error
      if (this.isCriticalError(error)) {
        throw error;
      }
      
      // Continue with degraded functionality
    }
  }

  private isCriticalError(error: Error): boolean {
    return error.code === 'AUTHENTICATION_ERROR' || 
           error.code === 'VALIDATION_ERROR';
  }
}
```

### 3. Performance Optimization

```typescript
class OptimizedMiddleware implements Middleware {
  name = 'optimized';
  priority = 75;

  private cache = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async execute(context: MiddlewareContext, next: NextFunction): Promise<void> {
    // Use caching for expensive operations
    const cacheKey = this.getCacheKey(context);
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      context.metadata.cached = true;
      return next();
    }

    await next();

    // Cache result
    this.setCached(cacheKey, context.response);
  }

  private getCacheKey(context: MiddlewareContext): string {
    return `${context.request.toolName}:${context.clientId}`;
  }

  private getCached(key: string): any {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

---

*Ready to implement middleware? Check out the [Examples](../examples/) for complete implementations.*
