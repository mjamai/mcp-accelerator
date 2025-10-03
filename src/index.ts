/**
 * MCP Accelerator - Modern framework for building MCP servers
 * @packageDocumentation
 */

// Core exports
export * from './types';
export * from './factory';
export { MCPServer } from './core/server';
export { ConsoleLogger, SilentLogger } from './core/logger';
export { ToolManager } from './core/tool-manager';
export {
  MCPErrorCode,
  createMCPError,
  toMCPError,
  isMCPError,
  ErrorHandler,
} from './core/error-handler';

// Transport exports
export * from './transports';

// Plugin exports
export * from './plugins';

// Re-export zod for convenience
export { z } from 'zod';

