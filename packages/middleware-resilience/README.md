# @mcp-accelerator/middleware-resilience

Resilience patterns (circuit breaker, timeout, retry, bulkhead) for MCP Accelerator.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/middleware-resilience
```

## Features

- ✅ **Circuit Breaker** - Prevent cascading failures
- ✅ **Timeout** - Automatic request cancellation
- ✅ **Retry** - Exponential backoff retry logic
- ✅ **Bulkhead** - Limit concurrent executions

## Quick Start

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import {
  createCircuitBreakerMiddleware,
  createTimeoutMiddleware,
  createRetryMiddleware,
  createBulkheadMiddleware,
} from '@mcp-accelerator/middleware-resilience';

const server = new MCPServer({ name: 'resilient-server', version: '1.0.0' });

// Add resilience layers
server.registerMiddleware(createTimeoutMiddleware({ timeout: 30000 }));
server.registerMiddleware(createCircuitBreakerMiddleware({ failureThreshold: 5 }));
server.registerMiddleware(createRetryMiddleware({ maxAttempts: 3 }));
server.registerMiddleware(createBulkheadMiddleware({ maxConcurrent: 10 }));

await server.start();
```

## Circuit Breaker

Stops requests when error rate is too high to prevent cascading failures.

### Usage

```typescript
server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 5,        // Open after 5 failures
  successThreshold: 3,        // Close after 3 successes in half-open
  timeout: 60000,             // Try half-open after 1 minute
  onOpen: () => console.log('Circuit opened!'),
  onClose: () => console.log('Circuit closed!'),
}));
```

### States

- **Closed**: Normal operation
- **Open**: All requests immediately fail (after threshold)
- **Half-Open**: Test with limited requests (after timeout)

### Example

```typescript
// Service with circuit breaker
server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 5,
  timeout: 60000,
}));

// After 5 consecutive failures:
// ❌ Error: Circuit breaker is open. Retry after 60s

// After timeout, circuit goes to half-open
// ✓ Next 3 successful requests close the circuit
```

## Timeout

Automatically cancels requests that take too long.

### Usage

```typescript
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 30000,  // 30 seconds default
  toolTimeouts: {
    'expensive-operation': 120000,  // 2 minutes for specific tools
    'quick-check': 5000,            // 5 seconds for fast tools
  }
}));
```

### Per-Tool Timeouts

```typescript
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 30000,
  toolTimeouts: {
    'generate-report': 300000,  // 5 minutes
    'send-email': 10000,        // 10 seconds
  }
}));
```

## Retry

Automatically retries failed requests with exponential backoff.

### Usage

```typescript
server.registerMiddleware(createRetryMiddleware({
  maxAttempts: 3,             // Try 3 times total
  initialDelay: 1000,         // Start with 1s delay
  maxDelay: 30000,            // Cap at 30s
  backoffMultiplier: 2,       // Double each time (1s, 2s, 4s, ...)
  retryIf: (error) => {
    // Only retry on specific errors
    return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
  },
  onRetry: (attempt, error) => {
    console.log(`Retry attempt ${attempt}:`, error.message);
  },
}));
```

### Retry Strategy

```
Attempt 1: Immediate
Attempt 2: Wait 1s
Attempt 3: Wait 2s
Attempt 4: Wait 4s
...
Max delay: 30s
```

### Conditional Retry

```typescript
server.registerMiddleware(createRetryMiddleware({
  maxAttempts: 5,
  retryIf: (error) => {
    // Retry on network errors
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    
    // Don't retry on validation errors
    if (error.message.includes('Invalid')) return false;
    
    // Don't retry on auth errors
    if (error.message.includes('Unauthorized')) return false;
    
    return false;
  },
}));
```

## Bulkhead

Limits concurrent executions to prevent resource exhaustion.

### Usage

```typescript
server.registerMiddleware(createBulkheadMiddleware({
  maxConcurrent: 10,          // Max 10 concurrent requests
  maxQueue: 100,              // Queue up to 100 waiting requests
  rejectOnQueueFull: true,    // Reject when queue is full
  queueTimeout: 5000,         // Timeout for queued requests
}));
```

### How It Works

```
[Request 1]  ──> [Processing] ──> [Complete]
[Request 2]  ──> [Processing] ──> [Complete]
...
[Request 10] ──> [Processing] ──> [Complete]
[Request 11] ──> [Queue: 1/100]
[Request 12] ──> [Queue: 2/100]
...
[Request 110] ──> [Queue: 100/100]
[Request 111] ──> ❌ Error: Bulkhead queue full
```

## Combining Patterns

Combine multiple patterns for comprehensive resilience:

```typescript
// Order matters! Earlier middlewares run first
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 30000,
}));

server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 5,
  timeout: 60000,
}));

server.registerMiddleware(createRetryMiddleware({
  maxAttempts: 3,
  initialDelay: 1000,
}));

server.registerMiddleware(createBulkheadMiddleware({
  maxConcurrent: 10,
}));
```

### Execution Flow

```
1. Timeout: Start timer (30s)
2. Circuit Breaker: Check if open
3. Retry: Attempt 1
4. Bulkhead: Acquire slot (wait if full)
5. Execute request
6. Bulkhead: Release slot
7. Retry: On failure, try again
8. Circuit Breaker: Record success/failure
9. Timeout: Cancel if exceeded
```

## Best Practices

### 1. Layer Resilience Patterns

```typescript
// ✓ Good: Layered approach
server.registerMiddleware(createTimeoutMiddleware({ timeout: 30000 }));
server.registerMiddleware(createCircuitBreakerMiddleware({ failureThreshold: 5 }));
server.registerMiddleware(createRetryMiddleware({ maxAttempts: 3 }));

// ✗ Bad: Only timeout (no protection against cascading failures)
server.registerMiddleware(createTimeoutMiddleware({ timeout: 30000 }));
```

### 2. Set Appropriate Timeouts

```typescript
// ✓ Good: Different timeouts for different operations
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 30000,
  toolTimeouts: {
    'quick-check': 5000,
    'generate-report': 300000,
  }
}));

// ✗ Bad: Same timeout for everything
server.registerMiddleware(createTimeoutMiddleware({ timeout: 30000 }));
```

### 3. Don't Retry Everything

```typescript
// ✓ Good: Only retry transient errors
server.registerMiddleware(createRetryMiddleware({
  retryIf: (error) => {
    // Retry network errors
    if (error.code === 'ECONNRESET') return true;
    
    // Don't retry client errors
    return false;
  }
}));

// ✗ Bad: Retry everything (including validation errors)
server.registerMiddleware(createRetryMiddleware({ maxAttempts: 3 }));
```

### 4. Monitor Circuit Breaker

```typescript
server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 5,
  onOpen: () => {
    // Alert ops team
    console.error('⚠️ ALERT: Circuit breaker opened!');
    // metrics.increment('circuit_breaker.open');
  },
  onClose: () => {
    console.log('✓ Circuit breaker closed');
    // metrics.increment('circuit_breaker.close');
  },
}));
```

### 5. Set Bulkhead Limits

```typescript
// ✓ Good: Based on your resources
server.registerMiddleware(createBulkheadMiddleware({
  maxConcurrent: Math.floor(availableCPUs * 2),
  maxQueue: 100,
}));

// ✗ Bad: Unlimited (can exhaust resources)
// No bulkhead middleware
```

## Production Example

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';
import {
  createTimeoutMiddleware,
  createCircuitBreakerMiddleware,
  createRetryMiddleware,
  createBulkheadMiddleware,
} from '@mcp-accelerator/middleware-resilience';

const server = new MCPServer({ name: 'prod-server', version: '1.0.0' });

// Use HTTP transport with built-in resilience
server.setTransport(new HttpTransport({
  port: 3000,
  requestTimeout: 30000,
  maxConcurrentRequests: 100,
  enableCircuitBreaker: true,
  enableBackpressure: true,
}));

// Add application-level resilience
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 30000,
  toolTimeouts: {
    'expensive-operation': 120000,
  }
}));

server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 5,
  timeout: 60000,
  onOpen: () => {
    console.error('Circuit breaker opened - alerting ops');
  },
}));

server.registerMiddleware(createRetryMiddleware({
  maxAttempts: 3,
  initialDelay: 1000,
  retryIf: (error) => {
    return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
  },
}));

server.registerMiddleware(createBulkheadMiddleware({
  maxConcurrent: 50,
  maxQueue: 200,
}));

await server.start();
```

## Troubleshooting

### Issue: Circuit breaker opens too frequently

**Solution**: Increase failure threshold or timeout

```typescript
server.registerMiddleware(createCircuitBreakerMiddleware({
  failureThreshold: 10,  // Increase from 5
  timeout: 120000,       // Increase from 60s
}));
```

### Issue: Requests timing out unnecessarily

**Solution**: Increase timeout or use per-tool timeouts

```typescript
server.registerMiddleware(createTimeoutMiddleware({
  timeout: 60000,  // Increase default
  toolTimeouts: {
    'slow-operation': 300000,  // 5 minutes for slow ops
  }
}));
```

### Issue: Too many retries causing load

**Solution**: Reduce max attempts or add conditional retry

```typescript
server.registerMiddleware(createRetryMiddleware({
  maxAttempts: 2,  // Reduce from 3
  retryIf: (error) => {
    // Only retry specific errors
    return error.code === 'ETIMEDOUT';
  },
}));
```

## License

MIT
