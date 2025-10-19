import {
  Logger,
  ResourceContent,
  ResourceDescriptor,
  ResourceProvider,
  ResourceProviderContext,
  StrictMetadata,
} from '../types';
import { createMCPError, MCPErrorCode } from '../core/error-handler';

interface ResourceLookup {
  providerId: string;
  descriptor: ResourceDescriptor;
}

/**
 * Manages resource providers and resolves list/read operations.
 */
export class ResourceManager<TMetadata extends StrictMetadata = StrictMetadata> {
  private providers: Map<string, ResourceProvider> = new Map();
  private uriToProvider: Map<string, ResourceLookup> = new Map();

  constructor(private logger: Logger) {}

  registerProvider(provider: ResourceProvider): void {
    if (this.providers.has(provider.id)) {
      this.logger.warn(`Resource provider "${provider.id}" already registered. Overwriting.`);
    }

    this.providers.set(provider.id, provider);
    this.logger.info(`Resource provider registered: ${provider.displayName} (${provider.id})`);
  }

  listProviders(): ResourceProvider[] {
    return Array.from(this.providers.values());
  }

  async listResources(
    metadata: TMetadata,
  ): Promise<ResourceDescriptor[]> {
    const context: ResourceProviderContext<TMetadata> = {
      logger: this.logger,
      metadata,
    };

    this.uriToProvider.clear();
    const resources: ResourceDescriptor[] = [];

    for (const provider of this.providers.values()) {
      try {
        const providerResources = await provider.listResources(context);
        for (const descriptor of providerResources) {
          const normalized: ResourceDescriptor = {
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
      } catch (error) {
        this.logger.error(`Failed to list resources for provider ${provider.id}`, error as Error);
      }
    }

    return resources;
  }

  async readResource(
    uri: string,
    metadata: TMetadata,
    providerId?: string,
  ): Promise<ResourceContent> {
    const context: ResourceProviderContext<TMetadata> = {
      logger: this.logger,
      metadata,
    };

    const provider = await this.resolveProvider(uri, providerId);
    const content = await provider.readResource(uri, context);

    return content;
  }

  private async resolveProvider(
    uri: string,
    explicitProviderId?: string,
  ): Promise<ResourceProvider> {
    if (explicitProviderId) {
      const provider = this.providers.get(explicitProviderId);
      if (!provider) {
        throw createMCPError(
          MCPErrorCode.INVALID_PARAMS,
          `Unknown resource provider: ${explicitProviderId}`,
        );
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
      } catch (error) {
        this.logger.error(
          `Resource provider ${provider.id} failed during canHandle`,
          error as Error,
        );
      }
    }

    throw createMCPError(
      MCPErrorCode.METHOD_NOT_FOUND,
      `No resource provider can handle URI: ${uri}`,
    );
  }
}
