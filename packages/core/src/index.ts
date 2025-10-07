/**
 * MCP Accelerator Core - Framework de base pour serveurs MCP
 * @packageDocumentation
 */

// Core exports
export * from './types';
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

// Base transport export
export { BaseTransport } from './transports/base-transport';

// Plugin exports
export * from './plugins';

// Re-export zod for convenience
export { z } from 'zod';

// Explicitly export HookPhase for better discoverability
export { HookPhase } from './types';

