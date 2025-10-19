/**
 * MCP Accelerator Core - Framework de base pour serveurs MCP
 * @packageDocumentation
 */

// Core exports
export * from './types';
export { MCPServer } from './core/server';
export { ConsoleLogger, SilentLogger } from './core/logger';
export { ToolManager } from './core/tool-manager';
export { ProtocolManager, UnsupportedProtocolVersionError } from './core/protocol-manager';
export {
  MCPErrorCode,
  createMCPError,
  toMCPError,
  isMCPError,
  ErrorHandler,
  formatValidationError,
} from './core/error-handler';
export { ResourceManager } from './resources/resource-manager';
export {
  InMemoryResourceProvider,
  InMemoryResource,
} from './resources/providers/in-memory-provider';
export {
  FilesystemResourceProvider,
  FilesystemResourceProviderOptions,
} from './resources/providers/filesystem-provider';
export { PromptManager } from './prompts/prompt-manager';
export {
  InMemoryPromptProvider,
  InMemoryPrompt,
} from './prompts/providers/in-memory-provider';
export { applyDefaultSecurity } from './server/default-security';

// Safe handler utilities
export {
  safeHandler,
  executeWithTimeout,
  executeWithTimeoutAndSignal,
  withRetry,
  withCircuitBreaker,
  SafeHandlerOptions,
} from './core/safe-handler';

// Base transport export
export { BaseTransport } from './transports/base-transport';

// Plugin exports
export * from './plugins';

// Re-export zod for convenience
export { z } from 'zod';

// Explicitly export HookPhase for better discoverability
export { HookPhase } from './types';
