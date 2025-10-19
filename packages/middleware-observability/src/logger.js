"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOTelLogger = exports.OTelLogger = void 0;
const api_logs_1 = require("@opentelemetry/api-logs");
class OTelLogger {
    logger;
    level;
    attributes;
    constructor(options = {}) {
        const { serviceName = 'mcp-server', level = 'info', attributes = {}, } = options;
        this.level = level;
        this.attributes = {
            'service.name': serviceName,
            ...attributes,
        };
        const loggerProvider = api_logs_1.logs.getLoggerProvider();
        this.logger = loggerProvider.getLogger(serviceName);
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    getSeverityNumber(level) {
        switch (level) {
            case 'debug':
                return api_logs_1.SeverityNumber.DEBUG;
            case 'info':
                return api_logs_1.SeverityNumber.INFO;
            case 'warn':
                return api_logs_1.SeverityNumber.WARN;
            case 'error':
                return api_logs_1.SeverityNumber.ERROR;
            default:
                return api_logs_1.SeverityNumber.UNSPECIFIED;
        }
    }
    emit(level, message, meta, error) {
        if (!this.shouldLog(level))
            return;
        // Convert meta to LogAttributes (only primitives)
        const logAttributes = {};
        if (meta) {
            for (const [key, value] of Object.entries(meta)) {
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    logAttributes[key] = value;
                }
                else if (value !== null && value !== undefined) {
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
    info(message, meta) {
        this.emit('info', message, meta);
    }
    warn(message, meta) {
        this.emit('warn', message, meta);
    }
    error(message, error, meta) {
        this.emit('error', message, { ...meta, error: error?.message, stack: error?.stack }, error);
    }
    debug(message, meta) {
        this.emit('debug', message, meta);
    }
}
exports.OTelLogger = OTelLogger;
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
function createOTelLogger(options = {}) {
    return new OTelLogger(options);
}
exports.createOTelLogger = createOTelLogger;
//# sourceMappingURL=logger.js.map