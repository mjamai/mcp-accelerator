# Observability & Telemetry

MCP Accelerator instruments transports, middleware, and tools with OpenTelemetry so you can trace requests, expose metrics, and centralize logs. Every recommendation below follows the [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) guidance for capability-aware, fail-safe servers.

## Deployment Checklist

- ✅ Install `@mcp-accelerator/middleware-observability` alongside your transports.
- ✅ Configure exporters through environment variables (`OTEL_SERVICE_NAME`, `OTEL_TRACE_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_EXPORTER_OTLP_ENDPOINT`, ...).
- ✅ Call `applyDefaultSecurity(server)` after creating the server so tracing, metrics, and structured logging are registered conditionally.
- ✅ Enable graceful shutdown (`SIGINT`, `SIGTERM`) to flush telemetry buffers.
- ✅ Tag spans with `clientId`, `toolName`, and `hookPhase` to match MCP lifecycle stages.

## Step-by-Step: Enable Observability

1. **Install packages**
   ```bash
   npm install @mcp-accelerator/middleware-observability
   ```
2. **Declare exporters**
   ```bash
   export OTEL_SERVICE_NAME=mcp-accelerator-demo
   export OTEL_TRACE_EXPORTER=otlp
   export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
   export OTEL_METRICS_EXPORTER=prometheus
   ```
3. **Wire observability in code**
   ```typescript
   import { createServer, applyDefaultSecurity } from 'mcp-accelerator';

   const server = createServer({
     name: 'observability-demo',
     version: '1.0.0',
   });

   await applyDefaultSecurity(server, {
     observability: {
       serviceName: process.env.OTEL_SERVICE_NAME,
       serviceVersion: process.env.OTEL_SERVICE_VERSION,
       environment: process.env.OTEL_ENVIRONMENT ?? 'development',
       traceExporter: process.env.OTEL_TRACE_EXPORTER,
       metricsExporter: process.env.OTEL_METRICS_EXPORTER,
     },
   });
   ```
4. **Run the server**
   ```bash
   node dist/index.js
   ```
5. **Verify telemetry**
   - Metrics endpoint (`/metrics` when using HTTP transport) or Prometheus scrape URL logged at startup.
   - Traces available in the configured OTLP/Jaeger backend within a few seconds.
   - Structured logs emitted with correlation IDs (`traceId`, `spanId`).

## Telemetry Architecture

```mermaid
flowchart LR
  subgraph MCP Server
    A[Transport\n(HTTP/WebSocket/SSE/STDIO)]
    B[Middleware Stack]
    C[Tool Execution]
  end

  A -->|Lifecycle hooks| B --> C
  C -->|trace + metrics| OTel[OpenTelemetry SDK]
  A -->|health/metrics endpoints| MetricsExporter
  OTel -->|OTLP/Jaeger| TraceBackend[(Tracing Backend)]
  MetricsExporter --> Prometheus[(Prometheus / Collector)]
  OTel -->|Structured logs| Logger[(Log Sink)]
```

- **Transport hooks** annotate spans when clients connect/disconnect or when messages arrive.
- **Middleware** records latency, error counts, and rate-limit verdicts.
- **Tools** emit custom events via `context.logger` and `context.telemetry`.

## Metrics Surfaces

| Component | Endpoint / Signal | Notes |
|-----------|------------------|-------|
| HTTP transport | `/health`, `/metrics` | Exposes liveness + readiness, Prometheus metrics. |
| WebSocket, SSE | OpenTelemetry metrics | Counters for connected clients, broadcast size, retry loops. |
| Rate limit middleware | `rate_limit_*` metrics | Counts allow/block decisions and bucket saturation. |
| Auth middleware | `auth_success_total`, `auth_rejected_total` | Labeled by strategy (JWT, API key, custom). |

When Prometheus support is enabled, the helper logs a scrape target similar to:
```
Prometheus metrics available at http://127.0.0.1:9464/metrics
```

## Tracing Conventions

- Spans use names like `mcp.transport.request`, `mcp.middleware.rate_limit`, `mcp.tool.execute`.
- Attributes follow MCP vocabulary:
  - `mcp.client.id`, `mcp.tool.name`, `mcp.hook.phase`, `mcp.error.code`.
- Errors are recorded with `status.code = ERROR` and the exception message.
- A root span is opened when the transport receives a message; downstream spans follow hook execution order.

## Shutdown & Resilience

`applyDefaultSecurity` registers `HookPhase.OnStop` to flush telemetry providers. Ensure the process listens for `SIGINT`/`SIGTERM`, awaits `server.stop()`, and only exits afterward to avoid data loss.

```typescript
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

If an exporter fails to initialize, the helper falls back to no-op implementations and logs a warning so the MCP server remains available. Review logs periodically to confirm exporters stay healthy.
