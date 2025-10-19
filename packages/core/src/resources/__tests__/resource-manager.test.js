"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resource_manager_1 = require("../resource-manager");
const in_memory_provider_1 = require("../providers/in-memory-provider");
const logger_1 = require("../../core/logger");
const error_handler_1 = require("../../core/error-handler");
const createManager = () => new resource_manager_1.ResourceManager(new logger_1.SilentLogger());
describe('ResourceManager', () => {
    it('lists resources across providers and enriches provider metadata', async () => {
        const manager = createManager();
        const provider = new in_memory_provider_1.InMemoryResourceProvider('memory', 'In-memory catalog', [
            {
                uri: 'memory://docs/readme',
                name: 'readme.md',
                mimeType: 'text/markdown',
                data: '# Hello',
                description: 'Sample document',
            },
        ]);
        manager.registerProvider(provider);
        const resources = await manager.listResources({});
        expect(resources).toHaveLength(1);
        expect(resources[0]).toMatchObject({
            uri: 'memory://docs/readme',
            name: 'readme.md',
            provider: {
                id: 'memory',
                displayName: 'In-memory catalog',
            },
        });
    });
    it('reads resource content by uri', async () => {
        const manager = createManager();
        const provider = new in_memory_provider_1.InMemoryResourceProvider('memory', 'In-memory catalog', [
            {
                uri: 'memory://docs/spec',
                name: 'spec.md',
                mimeType: 'text/markdown',
                data: '# Spec',
            },
        ]);
        manager.registerProvider(provider);
        await manager.listResources({});
        const content = await manager.readResource('memory://docs/spec', {});
        expect(content).toMatchObject({
            uri: 'memory://docs/spec',
            mimeType: 'text/markdown',
            data: '# Spec',
            encoding: 'utf-8',
        });
    });
    it('throws MCP error when no provider can handle uri', async () => {
        const manager = createManager();
        await expect(manager.readResource('memory://missing', {})).rejects.toMatchObject((0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.METHOD_NOT_FOUND, 'No resource provider can handle URI: memory://missing'));
    });
});
//# sourceMappingURL=resource-manager.test.js.map