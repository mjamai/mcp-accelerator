import { NodeSDK } from '@opentelemetry/sdk-node';
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
export declare function initializeObservability(config: OTelConfig): Promise<NodeSDK>;
/**
 * Shutdown OpenTelemetry SDK
 */
export declare function shutdownObservability(): Promise<void>;
/**
 * Quick setup for common configurations
 */
export declare const presets: {
    /**
     * Development: Console output only
     */
    development: (serviceName: string) => OTelConfig;
    /**
     * Production: OTLP (for Grafana, Honeycomb, etc.)
     */
    production: (serviceName: string, otlpEndpoint: string) => OTelConfig;
    /**
     * Self-hosted: Jaeger + Prometheus
     */
    selfHosted: (serviceName: string) => OTelConfig;
};
//# sourceMappingURL=setup.d.ts.map