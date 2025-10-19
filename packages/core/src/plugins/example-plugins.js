"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsPlugin = exports.LoggingPlugin = void 0;
const types_1 = require("../types");
/**
 * Plugin de logging des événements serveur
 */
class LoggingPlugin {
    name = 'logging-plugin';
    version = '1.0.0';
    async initialize(server) {
        server.logger.info('LoggingPlugin initialized');
        // Log client connections
        server.registerHook({
            name: 'log-client-connect',
            phase: types_1.HookPhase.OnClientConnect,
            handler: async (ctx) => {
                server.logger.info('Client connected', {
                    clientId: ctx.clientId,
                });
            },
        });
        // Log client disconnections
        server.registerHook({
            name: 'log-client-disconnect',
            phase: types_1.HookPhase.OnClientDisconnect,
            handler: async (ctx) => {
                server.logger.info('Client disconnected', {
                    clientId: ctx.clientId,
                });
            },
        });
        // Log errors
        server.registerHook({
            name: 'log-errors',
            phase: types_1.HookPhase.OnError,
            handler: async (ctx) => {
                if (ctx.error) {
                    server.logger.error('Error occurred', ctx.error, {
                        clientId: ctx.clientId,
                        toolName: ctx.toolName,
                    });
                }
            },
        });
    }
}
exports.LoggingPlugin = LoggingPlugin;
/**
 * Plugin de métriques basiques
 */
class MetricsPlugin {
    name = 'metrics-plugin';
    version = '1.0.0';
    metrics = {
        totalRequests: 0,
        totalErrors: 0,
        totalDuration: 0,
        toolCalls: new Map(),
    };
    async initialize(server) {
        server.logger.info('MetricsPlugin initialized');
        // Track tool executions (before)
        server.registerHook({
            name: 'metrics-before-tool',
            phase: types_1.HookPhase.BeforeToolExecution,
            handler: async (ctx) => {
                if (ctx.toolName) {
                    this.metrics.totalRequests++;
                    const currentCount = this.metrics.toolCalls.get(ctx.toolName) || 0;
                    this.metrics.toolCalls.set(ctx.toolName, currentCount + 1);
                }
            },
        });
        // Track tool executions (after)
        server.registerHook({
            name: 'metrics-after-tool',
            phase: types_1.HookPhase.AfterToolExecution,
            handler: async (ctx) => {
                if (ctx.duration !== undefined) {
                    this.metrics.totalDuration += ctx.duration;
                }
                if (ctx.error) {
                    this.metrics.totalErrors++;
                }
            },
        });
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            totalRequests: this.metrics.totalRequests,
            totalErrors: this.metrics.totalErrors,
            averageDuration: this.metrics.totalRequests > 0
                ? this.metrics.totalDuration / this.metrics.totalRequests
                : 0,
            toolCalls: Object.fromEntries(this.metrics.toolCalls),
        };
    }
    async cleanup() {
        this.metrics = {
            totalRequests: 0,
            totalErrors: 0,
            totalDuration: 0,
            toolCalls: new Map(),
        };
    }
}
exports.MetricsPlugin = MetricsPlugin;
//# sourceMappingURL=example-plugins.js.map