/**
 * Observability Middleware for MCP Accelerator
 * 
 * Full-stack observability with OpenTelemetry:
 * - Distributed tracing
 * - Metrics collection
 * - Structured logging
 * 
 * @packageDocumentation
 */

// Tracing
export {
  createTracingMiddleware,
  createTracingHooks,
  TracingOptions,
} from './tracing';

// Metrics
export {
  createMetricsHooks,
  MCPMetrics,
  MetricsOptions,
} from './metrics';

// Logging
export {
  createOTelLogger,
  OTelLogger,
  OTelLoggerOptions,
} from './logger';

// Setup
export {
  initializeObservability,
  shutdownObservability,
  presets,
  OTelConfig,
} from './setup';
