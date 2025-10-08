"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = void 0;
/**
 * Default console logger implementation
 */
class ConsoleLogger {
    level;
    constructor(level = 'info') {
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    info(message, meta) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
    warn(message, meta) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
    error(message, error, meta) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, error?.message || '', meta ? JSON.stringify(meta) : '');
            if (error?.stack) {
                console.error(error.stack);
            }
        }
    }
    debug(message, meta) {
        if (this.shouldLog('debug')) {
            console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
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