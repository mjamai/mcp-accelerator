import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

/**
 * OpenTelemetry Setup and Configuration
 */

export interface OTelConfig {
  /** Service name */
  serviceName: string;
  /** Service version */
  serviceVersion?: string;
  /** Environment (dev, staging, prod) */
  environment?: string;
  /** Trace exporter type */
  traceExporter?: 'otlp' | 'jaeger' | 'console' | 'none';
  /** Metrics exporter type */
  metricsExporter?: 'otlp' | 'prometheus' | 'console' | 'none';
  /** OTLP endpoint for traces */
  otlpTraceEndpoint?: string;
  /** OTLP endpoint for metrics */
  otlpMetricsEndpoint?: string;
  /** Jaeger endpoint */
  jaegerEndpoint?: string;
  /** Prometheus port */
  prometheusPort?: number;
  /** Enable auto instrumentation */
  autoInstrumentation?: boolean;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with configuration
 * 
 * Call this at the start of your application, before creating the MCP server
 * 
 * @example
 * ```typescript
 * import { initializeObservability } from '@mcp-accelerator/middleware-observability';
 * 
 * // Initialize OpenTelemetry
 * await initializeObservability({
 *   serviceName: 'my-mcp-server',
 *   serviceVersion: '1.0.0',
 *   environment: process.env.NODE_ENV,
 *   traceExporter: 'jaeger',
 *   metricsExporter: 'prometheus',
 *   prometheusPort: 9464
 * });
 * 
 * // Then create your MCP server
 * const server = new MCPServer({...});
 * ```
 */
export async function initializeObservability(config: OTelConfig): Promise<NodeSDK> {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = 'development',
    traceExporter = 'console',
    metricsExporter = 'console',
    otlpTraceEndpoint = 'http://localhost:4318/v1/traces',
    otlpMetricsEndpoint = 'http://localhost:4318/v1/metrics',
    jaegerEndpoint = 'http://localhost:14268/api/traces',
    prometheusPort = 9464,
    autoInstrumentation = true,
  } = config;

  // Create resource
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Configure trace exporter
  let traceExporterInstance;
  switch (traceExporter) {
    case 'otlp':
      traceExporterInstance = new OTLPTraceExporter({
        url: otlpTraceEndpoint,
      });
      break;
    case 'jaeger':
      traceExporterInstance = new JaegerExporter({
        endpoint: jaegerEndpoint,
      });
      break;
    case 'console':
      traceExporterInstance = new (require('@opentelemetry/sdk-trace-base').ConsoleSpanExporter)();
      break;
    case 'none':
      traceExporterInstance = undefined;
      break;
  }

  // Configure metrics exporter
  let metricReader;
  switch (metricsExporter) {
    case 'otlp':
      metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: otlpMetricsEndpoint,
        }),
        exportIntervalMillis: 60000, // 1 minute
      });
      break;
    case 'prometheus':
      metricReader = new PrometheusExporter({
        port: prometheusPort,
      });
      console.log(`📊 Prometheus metrics available at http://localhost:${prometheusPort}/metrics`);
      break;
    case 'console':
      metricReader = new PeriodicExportingMetricReader({
        exporter: new (require('@opentelemetry/sdk-metrics').ConsoleMetricExporter)(),
        exportIntervalMillis: 60000,
      });
      break;
    case 'none':
      metricReader = undefined;
      break;
  }

  // Create SDK
  sdk = new NodeSDK({
    resource,
    traceExporter: traceExporterInstance,
    metricReader,
    instrumentations: autoInstrumentation ? [getNodeAutoInstrumentations()] : [],
  });

  // Start SDK
  await sdk.start();

  console.log(`🔍 OpenTelemetry initialized: ${serviceName} (${environment})`);
  console.log(`   Traces: ${traceExporter}`);
  console.log(`   Metrics: ${metricsExporter}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
  });

  return sdk;
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownObservability(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log('🔍 OpenTelemetry shutdown complete');
  }
}

/**
 * Quick setup for common configurations
 */

export const presets = {
  /**
   * Development: Console output only
   */
  development: (serviceName: string): OTelConfig => ({
    serviceName,
    environment: 'development',
    traceExporter: 'console',
    metricsExporter: 'console',
  }),

  /**
   * Production: OTLP (for Grafana, Honeycomb, etc.)
   */
  production: (serviceName: string, otlpEndpoint: string): OTelConfig => ({
    serviceName,
    environment: 'production',
    traceExporter: 'otlp',
    metricsExporter: 'otlp',
    otlpTraceEndpoint: `${otlpEndpoint}/v1/traces`,
    otlpMetricsEndpoint: `${otlpEndpoint}/v1/metrics`,
  }),

  /**
   * Self-hosted: Jaeger + Prometheus
   */
  selfHosted: (serviceName: string): OTelConfig => ({
    serviceName,
    environment: 'production',
    traceExporter: 'jaeger',
    metricsExporter: 'prometheus',
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    prometheusPort: 9464,
  }),
};
