"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
const error_handler_1 = require("../core/error-handler");
/**
 * Manages resource providers and resolves list/read operations.
 */
class ResourceManager {
    logger;
    providers = new Map();
    uriToProvider = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    registerProvider(provider) {
        if (this.providers.has(provider.id)) {
            this.logger.warn(`Resource provider "${provider.id}" already registered. Overwriting.`);
        }
        this.providers.set(provider.id, provider);
        this.logger.info(`Resource provider registered: ${provider.displayName} (${provider.id})`);
    }
    listProviders() {
        return Array.from(this.providers.values());
    }
    async listResources(metadata) {
        const context = {
            logger: this.logger,
            metadata,
        };
        this.uriToProvider.clear();
        const resources = [];
        for (const provider of this.providers.values()) {
            try {
                const providerResources = await provider.listResources(context);
                for (const descriptor of providerResources) {
                    const normalized = {
                        ...descriptor,
                        provider: descriptor.provider ?? {
                            id: provider.id,
                            displayName: provider.displayName,
                        },
                    };
                    resources.push(normalized);
                    this.uriToProvider.set(normalized.uri, {
                        providerId: provider.id,
                        descriptor: normalized,
                    });
                }
            }
            catch (error) {
                this.logger.error(`Failed to list resources for provider ${provider.id}`, error);
            }
        }
        return resources;
    }
    async readResource(uri, metadata, providerId) {
        const context = {
            logger: this.logger,
            metadata,
        };
        const provider = await this.resolveProvider(uri, providerId);
        const content = await provider.readResource(uri, context);
        return content;
    }
    async resolveProvider(uri, explicitProviderId) {
        if (explicitProviderId) {
            const provider = this.providers.get(explicitProviderId);
            if (!provider) {
                throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, `Unknown resource provider: ${explicitProviderId}`);
            }
            return provider;
        }
        const lookup = this.uriToProvider.get(uri);
        if (lookup) {
            const provider = this.providers.get(lookup.providerId);
            if (provider) {
                return provider;
            }
        }
        for (const provider of this.providers.values()) {
            try {
                const canHandle = provider.canHandle
                    ? await provider.canHandle(uri)
                    : false;
                if (canHandle) {
                    return provider;
                }
            }
            catch (error) {
                this.logger.error(`Resource provider ${provider.id} failed during canHandle`, error);
            }
        }
        throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.METHOD_NOT_FOUND, `No resource provider can handle URI: ${uri}`);
    }
}
exports.ResourceManager = ResourceManager;
//# sourceMappingURL=resource-manager.js.map