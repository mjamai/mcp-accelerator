import { Logger as MCPLogger } from '@mcp-accelerator/core';
/**
 * OpenTelemetry Logger Implementation
 *
 * Integrates MCP logging with OpenTelemetry for centralized log management
 */
export interface OTelLoggerOptions {
    /** Service name */
    serviceName?: string;
    /** Minimum log level */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Additional attributes */
    attributes?: Record<string, string | number | boolean>;
}
export declare class OTelLogger implements MCPLogger {
    private logger;
    private level;
    private attributes;
    constructor(options?: OTelLoggerOptions);
    private shouldLog;
    private getSeverityNumber;
    private emit;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: Error, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
/**
 * Create an OpenTelemetry-enabled logger
 *
 * @example
 * ```typescript
 * import { createOTelLogger } from '@mcp-accelerator/middleware-observability';
 *
 * const logger = createOTelLogger({
 *   serviceName: 'my-mcp-server',
 *   level: 'debug'
 * });
 *
 * const server = new MCPServer({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   logger
 * });
 * ```
 */
export declare function createOTelLogger(options?: OTelLoggerOptions): MCPLogger;
//# sourceMappingURL=logger.d.ts.map