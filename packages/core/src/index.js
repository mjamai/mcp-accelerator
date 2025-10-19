"use strict";
/**
 * MCP Accelerator Core - Framework de base pour serveurs MCP
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookPhase = exports.z = exports.BaseTransport = exports.withCircuitBreaker = exports.withRetry = exports.executeWithTimeoutAndSignal = exports.executeWithTimeout = exports.safeHandler = exports.applyDefaultSecurity = exports.InMemoryPromptProvider = exports.PromptManager = exports.FilesystemResourceProvider = exports.InMemoryResourceProvider = exports.ResourceManager = exports.formatValidationError = exports.ErrorHandler = exports.isMCPError = exports.toMCPError = exports.createMCPError = exports.MCPErrorCode = exports.UnsupportedProtocolVersionError = exports.ProtocolManager = exports.ToolManager = exports.SilentLogger = exports.ConsoleLogger = exports.MCPServer = void 0;
// Core exports
__exportStar(require("./types"), exports);
var server_1 = require("./core/server");
Object.defineProperty(exports, "MCPServer", { enumerable: true, get: function () { return server_1.MCPServer; } });
var logger_1 = require("./core/logger");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logger_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logger_1.SilentLogger; } });
var tool_manager_1 = require("./core/tool-manager");
Object.defineProperty(exports, "ToolManager", { enumerable: true, get: function () { return tool_manager_1.ToolManager; } });
var protocol_manager_1 = require("./core/protocol-manager");
Object.defineProperty(exports, "ProtocolManager", { enumerable: true, get: function () { return protocol_manager_1.ProtocolManager; } });
Object.defineProperty(exports, "UnsupportedProtocolVersionError", { enumerable: true, get: function () { return protocol_manager_1.UnsupportedProtocolVersionError; } });
var error_handler_1 = require("./core/error-handler");
Object.defineProperty(exports, "MCPErrorCode", { enumerable: true, get: function () { return error_handler_1.MCPErrorCode; } });
Object.defineProperty(exports, "createMCPError", { enumerable: true, get: function () { return error_handler_1.createMCPError; } });
Object.defineProperty(exports, "toMCPError", { enumerable: true, get: function () { return error_handler_1.toMCPError; } });
Object.defineProperty(exports, "isMCPError", { enumerable: true, get: function () { return error_handler_1.isMCPError; } });
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return error_handler_1.ErrorHandler; } });
Object.defineProperty(exports, "formatValidationError", { enumerable: true, get: function () { return error_handler_1.formatValidationError; } });
var resource_manager_1 = require("./resources/resource-manager");
Object.defineProperty(exports, "ResourceManager", { enumerable: true, get: function () { return resource_manager_1.ResourceManager; } });
var in_memory_provider_1 = require("./resources/providers/in-memory-provider");
Object.defineProperty(exports, "InMemoryResourceProvider", { enumerable: true, get: function () { return in_memory_provider_1.InMemoryResourceProvider; } });
var filesystem_provider_1 = require("./resources/providers/filesystem-provider");
Object.defineProperty(exports, "FilesystemResourceProvider", { enumerable: true, get: function () { return filesystem_provider_1.FilesystemResourceProvider; } });
var prompt_manager_1 = require("./prompts/prompt-manager");
Object.defineProperty(exports, "PromptManager", { enumerable: true, get: function () { return prompt_manager_1.PromptManager; } });
var in_memory_provider_2 = require("./prompts/providers/in-memory-provider");
Object.defineProperty(exports, "InMemoryPromptProvider", { enumerable: true, get: function () { return in_memory_provider_2.InMemoryPromptProvider; } });
var default_security_1 = require("./server/default-security");
Object.defineProperty(exports, "applyDefaultSecurity", { enumerable: true, get: function () { return default_security_1.applyDefaultSecurity; } });
// Safe handler utilities
var safe_handler_1 = require("./core/safe-handler");
Object.defineProperty(exports, "safeHandler", { enumerable: true, get: function () { return safe_handler_1.safeHandler; } });
Object.defineProperty(exports, "executeWithTimeout", { enumerable: true, get: function () { return safe_handler_1.executeWithTimeout; } });
Object.defineProperty(exports, "executeWithTimeoutAndSignal", { enumerable: true, get: function () { return safe_handler_1.executeWithTimeoutAndSignal; } });
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return safe_handler_1.withRetry; } });
Object.defineProperty(exports, "withCircuitBreaker", { enumerable: true, get: function () { return safe_handler_1.withCircuitBreaker; } });
// Base transport export
var base_transport_1 = require("./transports/base-transport");
Object.defineProperty(exports, "BaseTransport", { enumerable: true, get: function () { return base_transport_1.BaseTransport; } });
// Plugin exports
__exportStar(require("./plugins"), exports);
// Re-export zod for convenience
var zod_1 = require("zod");
Object.defineProperty(exports, "z", { enumerable: true, get: function () { return zod_1.z; } });
// Explicitly export HookPhase for better discoverability
var types_1 = require("./types");
Object.defineProperty(exports, "HookPhase", { enumerable: true, get: function () { return types_1.HookPhase; } });
//# sourceMappingURL=index.js.map