import { Logger } from '../types';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Default console logger implementation
 */
export declare class ConsoleLogger implements Logger {
    private level;
    private static readonly orderedLevels;
    constructor(level?: LogLevel);
    /**
     * Dynamically change the logger level to honor logging/setLevel requests.
     */
    setLevel(level: LogLevel): void;
    /**
     * Expose current level for observability and testing purposes.
     */
    getLevel(): LogLevel;
    private shouldLog;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: Error, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
/**
 * Silent logger for testing or when logging is disabled
 */
export declare class SilentLogger implements Logger {
    info(): void;
    warn(): void;
    error(): void;
    debug(): void;
}
//# sourceMappingURL=logger.d.ts.map