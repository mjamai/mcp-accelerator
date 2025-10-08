import { logs, SeverityNumber } from '@opentelemetry/api-logs';
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

export class OTelLogger implements MCPLogger {
  private logger;
  private level: string;
  private attributes: Record<string, string | number | boolean>;

  constructor(options: OTelLoggerOptions = {}) {
    const {
      serviceName = 'mcp-server',
      level = 'info',
      attributes = {},
    } = options;

    this.level = level;
    this.attributes = {
      'service.name': serviceName,
      ...attributes,
    };

    const loggerProvider = logs.getLoggerProvider();
    this.logger = loggerProvider.getLogger(serviceName);
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private getSeverityNumber(level: string): SeverityNumber {
    switch (level) {
      case 'debug':
        return SeverityNumber.DEBUG;
      case 'info':
        return SeverityNumber.INFO;
      case 'warn':
        return SeverityNumber.WARN;
      case 'error':
        return SeverityNumber.ERROR;
      default:
        return SeverityNumber.UNSPECIFIED;
    }
  }

  private emit(level: string, message: string, meta?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return;

    // Convert meta to LogAttributes (only primitives)
    const logAttributes: Record<string, string | number | boolean> = {};
    if (meta) {
      for (const [key, value] of Object.entries(meta)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          logAttributes[key] = value;
        } else if (value !== null && value !== undefined) {
          logAttributes[key] = JSON.stringify(value);
        }
      }
    }

    this.logger.emit({
      severityNumber: this.getSeverityNumber(level),
      severityText: level.toUpperCase(),
      body: message,
      attributes: {
        ...this.attributes,
        ...logAttributes,
      },
      timestamp: Date.now(),
    });

    // Also log to console for development
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, meta || '', error || '');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.emit('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.emit('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.emit('error', message, { ...meta, error: error?.message, stack: error?.stack }, error);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.emit('debug', message, meta);
  }
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
export function createOTelLogger(options: OTelLoggerOptions = {}): MCPLogger {
  return new OTelLogger(options);
}
