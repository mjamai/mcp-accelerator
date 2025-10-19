"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = void 0;
/**
 * Default console logger implementation
 */
class ConsoleLogger {
    level;
    static orderedLevels = ['debug', 'info', 'warn', 'error'];
    constructor(level = 'info') {
        this.level = level;
    }
    /**
     * Dynamically change the logger level to honor logging/setLevel requests.
     */
    setLevel(level) {
        if (!ConsoleLogger.orderedLevels.includes(level)) {
            throw new Error(`Invalid log level: ${level}`);
        }
        this.level = level;
    }
    /**
     * Expose current level for observability and testing purposes.
     */
    getLevel() {
        return this.level;
    }
    shouldLog(level) {
        return (ConsoleLogger.orderedLevels.indexOf(level) >=
            ConsoleLogger.orderedLevels.indexOf(this.level));
    }
    info(message, meta) {
        if (this.shouldLog('info')) {
            // Use stderr for all logs to comply with MCP STDIO specification
            process.stderr.write(`[INFO] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
        }
    }
    warn(message, meta) {
        if (this.shouldLog('warn')) {
            // Use stderr for all logs to comply with MCP STDIO specification
            process.stderr.write(`[WARN] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
        }
    }
    error(message, error, meta) {
        if (this.shouldLog('error')) {
            // Use stderr for all logs to comply with MCP STDIO specification
            process.stderr.write(`[ERROR] ${message}${error?.message ? ' ' + error.message : ''}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
            if (error?.stack) {
                process.stderr.write(error.stack + '\n');
            }
        }
    }
    debug(message, meta) {
        if (this.shouldLog('debug')) {
            // Use stderr for all logs to comply with MCP STDIO specification
            process.stderr.write(`[DEBUG] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/**
 * Silent logger for testing or when logging is disabled
 */
class SilentLogger {
    info() { }
    warn() { }
    error() { }
    debug() { }
}
exports.SilentLogger = SilentLogger;
//# sourceMappingURL=logger.js.map