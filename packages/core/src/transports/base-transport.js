"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransport = void 0;
/**
 * Abstract base class for transports providing common functionality
 */
class BaseTransport {
    messageHandlers = [];
    connectHandlers = [];
    disconnectHandlers = [];
    isStarted = false;
    /**
     * Register message handler
     */
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    /**
     * Register connect handler
     */
    onConnect(handler) {
        this.connectHandlers.push(handler);
    }
    /**
     * Register disconnect handler
     */
    onDisconnect(handler) {
        this.disconnectHandlers.push(handler);
    }
    /**
     * Emit message event to all handlers
     */
    async emitMessage(clientId, message) {
        for (const handler of this.messageHandlers) {
            await handler(clientId, message);
        }
    }
    /**
     * Emit connect event to all handlers
     */
    async emitConnect(clientId) {
        for (const handler of this.connectHandlers) {
            await handler(clientId);
        }
    }
    /**
     * Emit disconnect event to all handlers
     */
    async emitDisconnect(clientId) {
        for (const handler of this.disconnectHandlers) {
            await handler(clientId);
        }
    }
    /**
     * Check if transport is started
     */
    getIsStarted() {
        return this.isStarted;
    }
}
exports.BaseTransport = BaseTransport;
//# sourceMappingURL=base-transport.js.map