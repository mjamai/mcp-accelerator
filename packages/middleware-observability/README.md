# @mcp-accelerator/middleware-observability

Full-stack observability for MCP Accelerator with OpenTelemetry support.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/middleware-observability
```

## Features

- ✅ **Distributed Tracing** (Jaeger, Zipkin, OTLP)
- ✅ **Metrics Collection** (Prometheus, OTLP)
- ✅ **Structured Logging** (OpenTelemetry Logs)
- ✅ **Auto-instrumentation** (Node.js libraries)
- ✅ **Zero-config presets** (dev, prod, self-hosted)
- ✅ **Custom spans and metrics**

## Quick Start

### 1. Basic Setup (Console Output)

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';
import {
  initializeObservability,
  createTracingMiddleware,
  createMetricsHooks,
  createOTelLogger,
  presets,
} from '@mcp-accelerator/middleware-observability';

// Initialize OpenTelemetry (before creating server!)
await initializeObservability(presets.development('my-mcp-server'));

// Create server with OTel logger
const logger = createOTelLogger({ serviceName: 'my-mcp-server' });
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  logger,
});

server.setTransport(new HttpTransport({ port: 3000 }));

// Add tracing middleware
server.registerMiddleware(createTracingMiddleware({
  serviceName: 'my-mcp-server',
  includePayloads: false, // Don't log sensitive data
}));

// Add metrics hooks
const metricsHooks = createMetricsHooks({ serviceName: 'my-mcp-server' });
metricsHooks.forEach(hook => server.registerHook(hook));

await server.start();
```

### 2. Production Setup (Jaeger + Prometheus)

```typescript
import { initializeObservability } from '@mcp-accelerator/middleware-observability';

// Self-hosted observability stack
await initializeObservability({
  serviceName: 'my-mcp-server',
  serviceVersion: '1.0.0',
  environment: 'production',
  traceExporter: 'jaeger',        // Traces to Jaeger
  metricsExporter: 'prometheus',  // Metrics to Prometheus
  prometheusPort: 9464,           // Prometheus scrape endpoint
});
```

**Access:**
- Traces: http://localhost:16686 (Jaeger UI)
- Metrics: http://localhost:9464/metrics (Prometheus)

### 3. Cloud Setup (OTLP)

```typescript
// For Grafana Cloud, Honeycomb, Lightstep, etc.
await initializeObservability({
  serviceName: 'my-mcp-server',
  environment: 'production',
  traceExporter: 'otlp',
  metricsExporter: 'otlp',
  otlpTraceEndpoint: process.env.OTLP_TRACES_ENDPOINT!,
  otlpMetricsEndpoint: process.env.OTLP_METRICS_ENDPOINT!,
});
```

## Tracing

### Automatic Spans

Every request and tool execution is automatically traced:

```
my-mcp-server
  ├─ request.tools/call (10ms)
  │   └─ tool.text-stats (8ms)
  └─ request.tools/list (2ms)
```

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-mcp-server');

server.registerTool({
  name: 'complex-operation',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    // Create custom span
    return await tracer.startActiveSpan('database-query', async (span) => {
      span.setAttribute('query.type', 'SELECT');
      span.setAttribute('query.table', 'users');
      
      try {
        const result = await db.query('SELECT * FROM users');
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  },
});
```

### Distributed Tracing

Automatically propagates trace context across services:

```typescript
// Service A (MCP Server)
server.registerTool({
  name: 'call-service-b',
  handler: async (input, context) => {
    // Trace context is automatically injected into headers
    const response = await fetch('http://service-b/api', {
      headers: {
        // Context propagation happens automatically
      }
    });
    return response.json();
  },
});
```

## Metrics

### Built-in Metrics

- `mcp.requests.total` - Total requests (counter)
- `mcp.errors.total` - Total errors (counter)
- `mcp.connections.active` - Active connections (gauge)
- `mcp.request.duration` - Request latency (histogram)
- `mcp.tool.duration` - Tool execution time (histogram)

### Custom Metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-mcp-server');

// Counter
const customCounter = meter.createCounter('custom.operations', {
  description: 'Custom operations counter',
});

server.registerTool({
  name: 'my-tool',
  handler: async (input) => {
    customCounter.add(1, { operation: 'my-operation' });
    return { success: true };
  },
});

// Histogram
const processingTime = meter.createHistogram('custom.processing_time', {
  description: 'Processing time in milliseconds',
  unit: 'ms',
});

server.registerTool({
  name: 'process-data',
  handler: async (input) => {
    const start = Date.now();
    // ... processing
    processingTime.record(Date.now() - start);
  },
});
```

## Logging

### Structured Logs with OpenTelemetry

```typescript
import { createOTelLogger } from '@mcp-accelerator/middleware-observability';

const logger = createOTelLogger({
  serviceName: 'my-mcp-server',
  level: 'info',
  attributes: {
    environment: 'production',
    region: 'us-east-1',
  },
});

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  logger, // Use OTel logger
});

// Logs are automatically correlated with traces
server.logger.info('Processing request', {
  userId: '123',
  requestId: 'abc',
});
```

## Configuration

### Development Preset

```typescript
await initializeObservability(presets.development('my-server'));
// ✓ Console output for traces and metrics
// ✓ Quick debugging
```

### Production Preset

```typescript
await initializeObservability(presets.production(
  'my-server',
  'https://otlp.grafana.cloud/otlp'
));
// ✓ OTLP export to cloud provider
// ✓ Production-ready
```

### Self-Hosted Preset

```typescript
await initializeObservability(presets.selfHosted('my-server'));
// ✓ Jaeger for traces (localhost:16686)
// ✓ Prometheus for metrics (localhost:9464/metrics)
```

### Custom Configuration

```typescript
await initializeObservability({
  serviceName: 'my-mcp-server',
  serviceVersion: '2.0.0',
  environment: 'staging',
  traceExporter: 'jaeger',
  metricsExporter: 'prometheus',
  jaegerEndpoint: 'http://jaeger:14268/api/traces',
  prometheusPort: 9464,
  autoInstrumentation: true, // Auto-instrument HTTP, DB, etc.
});
```

## Docker Compose Setup

Run Jaeger and Prometheus locally:

```yaml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector HTTP
      - "14250:14250"  # Collector gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['host.docker.internal:9464']
```

Run:
```bash
docker-compose up -d
```

Access:
- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090

## Cloud Providers

### Grafana Cloud

```typescript
await initializeObservability({
  serviceName: 'my-mcp-server',
  traceExporter: 'otlp',
  metricsExporter: 'otlp',
  otlpTraceEndpoint: process.env.GRAFANA_OTLP_ENDPOINT!,
  otlpMetricsEndpoint: process.env.GRAFANA_OTLP_ENDPOINT!,
});
```

### Honeycomb

```typescript
await initializeObservability({
  serviceName: 'my-mcp-server',
  traceExporter: 'otlp',
  otlpTraceEndpoint: 'https://api.honeycomb.io/v1/traces',
  // Add API key via headers in custom exporter
});
```

### AWS X-Ray

```bash
npm install @opentelemetry/exporter-trace-otlp-http
```

```typescript
// Use AWS Distro for OpenTelemetry or OTLP with X-Ray collector
```

## Best Practices

### 1. Initialize Early

```typescript
// ✓ Good: Initialize before creating server
await initializeObservability({...});
const server = new MCPServer({...});

// ✗ Bad: Initialize after server
const server = new MCPServer({...});
await initializeObservability({...}); // Too late!
```

### 2. Don't Log Sensitive Data

```typescript
// ✓ Good: Exclude payloads in production
createTracingMiddleware({
  includePayloads: process.env.NODE_ENV !== 'production',
});

// ✗ Bad: Always include payloads
createTracingMiddleware({
  includePayloads: true, // Risk of leaking secrets!
});
```

### 3. Use Sampling in Production

```typescript
// For high-traffic services
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces
const sampler = new TraceIdRatioBasedSampler(0.1);
```

### 4. Set Resource Attributes

```typescript
await initializeObservability({
  serviceName: 'my-mcp-server',
  serviceVersion: '1.0.0',  // Track versions
  environment: 'production', // Separate envs
});
```

### 5. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await server.stop();
  await shutdownObservability(); // Flush remaining data
  process.exit(0);
});
```

## Troubleshooting

### No traces appearing

1. Check exporter configuration
2. Verify backend is running (Jaeger, etc.)
3. Check network connectivity
4. Enable debug logging

### High memory usage

- Reduce sampling rate
- Use batch span processor
- Limit attribute sizes

### Missing metrics

- Verify Prometheus scrape config
- Check metrics endpoint: http://localhost:9464/metrics
- Ensure hooks are registered

## Examples

Integration examples coming soon. See [main documentation](../../README.md) for usage.

## License

MIT
