"use strict";
/**
 * Observability Middleware for MCP Accelerator
 *
 * Full-stack observability with OpenTelemetry:
 * - Distributed tracing
 * - Metrics collection
 * - Structured logging
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.presets = exports.shutdownObservability = exports.initializeObservability = exports.OTelLogger = exports.createOTelLogger = exports.MCPMetrics = exports.createMetricsHooks = exports.createTracingHooks = exports.createTracingMiddleware = void 0;
// Tracing
var tracing_1 = require("./tracing");
Object.defineProperty(exports, "createTracingMiddleware", { enumerable: true, get: function () { return tracing_1.createTracingMiddleware; } });
Object.defineProperty(exports, "createTracingHooks", { enumerable: true, get: function () { return tracing_1.createTracingHooks; } });
// Metrics
var metrics_1 = require("./metrics");
Object.defineProperty(exports, "createMetricsHooks", { enumerable: true, get: function () { return metrics_1.createMetricsHooks; } });
Object.defineProperty(exports, "MCPMetrics", { enumerable: true, get: function () { return metrics_1.MCPMetrics; } });
// Logging
var logger_1 = require("./logger");
Object.defineProperty(exports, "createOTelLogger", { enumerable: true, get: function () { return logger_1.createOTelLogger; } });
Object.defineProperty(exports, "OTelLogger", { enumerable: true, get: function () { return logger_1.OTelLogger; } });
// Setup
var setup_1 = require("./setup");
Object.defineProperty(exports, "initializeObservability", { enumerable: true, get: function () { return setup_1.initializeObservability; } });
Object.defineProperty(exports, "shutdownObservability", { enumerable: true, get: function () { return setup_1.shutdownObservability; } });
Object.defineProperty(exports, "presets", { enumerable: true, get: function () { return setup_1.presets; } });
//# sourceMappingURL=index.js.map