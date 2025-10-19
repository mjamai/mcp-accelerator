"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryResourceProvider = void 0;
class InMemoryResourceProvider {
    id;
    displayName;
    resources = new Map();
    constructor(id, displayName, items = []) {
        this.id = id;
        this.displayName = displayName;
        items.forEach((item) => this.resources.set(item.uri, item));
    }
    addResource(resource) {
        this.resources.set(resource.uri, resource);
    }
    async listResources(_context) {
        return Array.from(this.resources.values()).map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            tags: resource.tags,
            createdAt: resource.createdAt,
            updatedAt: resource.updatedAt,
        }));
    }
    async readResource(uri, _context) {
        const resource = this.resources.get(uri);
        if (!resource) {
            throw new Error(`Resource not found: ${uri}`);
        }
        return {
            uri: resource.uri,
            mimeType: resource.mimeType,
            data: resource.data,
            encoding: resource.encoding ?? 'utf-8',
        };
    }
    async canHandle(uri) {
        return this.resources.has(uri);
    }
}
exports.InMemoryResourceProvider = InMemoryResourceProvider;
//# sourceMappingURL=in-memory-provider.js.map