import {
  Logger,
  PromptDefinition,
  PromptProvider,
  PromptProviderContext,
  StrictMetadata,
} from '../types';

/**
 * Manages prompt providers and resolves list/get operations.
 */
export class PromptManager<TMetadata extends StrictMetadata = StrictMetadata> {
  private providers: Map<string, PromptProvider> = new Map();

  constructor(private logger: Logger) {}

  registerProvider(provider: PromptProvider): void {
    if (this.providers.has(provider.id)) {
      this.logger.warn(`Prompt provider "${provider.id}" already registered. Overwriting.`);
    }

    this.providers.set(provider.id, provider);
    this.logger.info(`Prompt provider registered: ${provider.displayName} (${provider.id})`);
  }

  listProviders(): PromptProvider[] {
    return Array.from(this.providers.values());
  }

  async listPrompts(metadata: TMetadata): Promise<PromptDefinition[]> {
    const context: PromptProviderContext<TMetadata> = {
      logger: this.logger,
      metadata,
    };

    const results: PromptDefinition[] = [];

    for (const provider of this.providers.values()) {
      try {
        const prompts = await provider.listPrompts(context);
        results.push(
          ...prompts.map((prompt) => ({
            ...prompt,
            metadata: {
              ...prompt.metadata,
              provider: {
                id: provider.id,
                displayName: provider.displayName,
              },
            },
          })),
        );
      } catch (error) {
        this.logger.error(`Failed to list prompts for provider ${provider.id}`, error as Error);
      }
    }

    return results;
  }

  async getPrompt(id: string, metadata: TMetadata): Promise<PromptDefinition | null> {
    const context: PromptProviderContext<TMetadata> = {
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
      } catch (error) {
        this.logger.error(`Prompt provider ${provider.id} failed during getPrompt`, error as Error);
      }
    }

    return null;
  }
}
