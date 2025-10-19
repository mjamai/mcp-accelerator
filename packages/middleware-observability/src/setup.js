"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presets = exports.shutdownObservability = exports.initializeObservability = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
let sdk = null;
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
async function initializeObservability(config) {
    const { serviceName, serviceVersion = '1.0.0', environment = 'development', traceExporter = 'console', metricsExporter = 'console', otlpTraceEndpoint = 'http://localhost:4318/v1/traces', otlpMetricsEndpoint = 'http://localhost:4318/v1/metrics', jaegerEndpoint = 'http://localhost:14268/api/traces', prometheusPort = 9464, autoInstrumentation = true, } = config;
    // Create resource
    const resource = new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    });
    // Configure trace exporter
    let traceExporterInstance;
    switch (traceExporter) {
        case 'otlp':
            traceExporterInstance = new exporter_trace_otlp_http_1.OTLPTraceExporter({
                url: otlpTraceEndpoint,
            });
            break;
        case 'jaeger':
            traceExporterInstance = new exporter_jaeger_1.JaegerExporter({
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
            metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
                    url: otlpMetricsEndpoint,
                }),
                exportIntervalMillis: 60000, // 1 minute
            });
            break;
        case 'prometheus':
            metricReader = new exporter_prometheus_1.PrometheusExporter({
                port: prometheusPort,
            });
            console.log(`📊 Prometheus metrics available at http://localhost:${prometheusPort}/metrics`);
            break;
        case 'console':
            metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: new (require('@opentelemetry/sdk-metrics').ConsoleMetricExporter)(),
                exportIntervalMillis: 60000,
            });
            break;
        case 'none':
            metricReader = undefined;
            break;
    }
    // Create SDK
    sdk = new sdk_node_1.NodeSDK({
        resource,
        traceExporter: traceExporterInstance,
        metricReader,
        instrumentations: autoInstrumentation ? [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()] : [],
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
exports.initializeObservability = initializeObservability;
/**
 * Shutdown OpenTelemetry SDK
 */
async function shutdownObservability() {
    if (sdk) {
        await sdk.shutdown();
        sdk = null;
        console.log('🔍 OpenTelemetry shutdown complete');
    }
}
exports.shutdownObservability = shutdownObservability;
/**
 * Quick setup for common configurations
 */
exports.presets = {
    /**
     * Development: Console output only
     */
    development: (serviceName) => ({
        serviceName,
        environment: 'development',
        traceExporter: 'console',
        metricsExporter: 'console',
    }),
    /**
     * Production: OTLP (for Grafana, Honeycomb, etc.)
     */
    production: (serviceName, otlpEndpoint) => ({
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
    selfHosted: (serviceName) => ({
        serviceName,
        environment: 'production',
        traceExporter: 'jaeger',
        metricsExporter: 'prometheus',
        jaegerEndpoint: 'http://localhost:14268/api/traces',
        prometheusPort: 9464,
    }),
};
//# sourceMappingURL=setup.js.map