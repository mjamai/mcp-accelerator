"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptManager = void 0;
/**
 * Manages prompt providers and resolves list/get operations.
 */
class PromptManager {
    logger;
    providers = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    registerProvider(provider) {
        if (this.providers.has(provider.id)) {
            this.logger.warn(`Prompt provider "${provider.id}" already registered. Overwriting.`);
        }
        this.providers.set(provider.id, provider);
        this.logger.info(`Prompt provider registered: ${provider.displayName} (${provider.id})`);
    }
    listProviders() {
        return Array.from(this.providers.values());
    }
    async listPrompts(metadata) {
        const context = {
            logger: this.logger,
            metadata,
        };
        const results = [];
        for (const provider of this.providers.values()) {
            try {
                const prompts = await provider.listPrompts(context);
                results.push(...prompts.map((prompt) => ({
                    ...prompt,
                    metadata: {
                        ...prompt.metadata,
                        provider: {
                            id: provider.id,
                            displayName: provider.displayName,
                        },
                    },
                })));
            }
            catch (error) {
                this.logger.error(`Failed to list prompts for provider ${provider.id}`, error);
            }
        }
        return results;
    }
    async getPrompt(id, metadata) {
        const context = {
            logger: this.logger,
            metadata,
        };
        for (const provider of this.providers.values()) {
            try {
                const prompt = await provider.getPrompt(id, context);
                if (prompt) {
                    return {
                        ...prompt,
                        metadata: {
                            ...prompt.metadata,
                            provider: {
                                id: provider.id,
                                displayName: provider.displayName,
                            },
                        },
                    };
                }
            }
            catch (error) {
                this.logger.error(`Prompt provider ${provider.id} failed during getPrompt`, error);
            }
        }
        return null;
    }
}
exports.PromptManager = PromptManager;
//# sourceMappingURL=prompt-manager.js.map