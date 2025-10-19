import { Logger } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements Logger {
  private static readonly orderedLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  constructor(private level: LogLevel = 'info') {}

  /**
   * Dynamically change the logger level to honor logging/setLevel requests.
   */
  setLevel(level: LogLevel): void {
    if (!ConsoleLogger.orderedLevels.includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.level = level;
  }

  /**
   * Expose current level for observability and testing purposes.
   */
  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      ConsoleLogger.orderedLevels.indexOf(level) >=
      ConsoleLogger.orderedLevels.indexOf(this.level)
    );
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      // Use stderr for all logs to comply with MCP STDIO specification
      process.stderr.write(`[INFO] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      // Use stderr for all logs to comply with MCP STDIO specification
      process.stderr.write(`[WARN] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      // Use stderr for all logs to comply with MCP STDIO specification
      process.stderr.write(`[ERROR] ${message}${error?.message ? ' ' + error.message : ''}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
      if (error?.stack) {
        process.stderr.write(error.stack + '\n');
      }
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      // Use stderr for all logs to comply with MCP STDIO specification
      process.stderr.write(`[DEBUG] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
    }
  }
}

/**
 * Silent logger for testing or when logging is disabled
 */
export class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug(): void {}
}
