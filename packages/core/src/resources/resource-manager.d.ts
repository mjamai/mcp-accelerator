import { Logger, ResourceContent, ResourceDescriptor, ResourceProvider, StrictMetadata } from '../types';
/**
 * Manages resource providers and resolves list/read operations.
 */
export declare class ResourceManager<TMetadata extends StrictMetadata = StrictMetadata> {
    private logger;
    private providers;
    private uriToProvider;
    constructor(logger: Logger);
    registerProvider(provider: ResourceProvider): void;
    listProviders(): ResourceProvider[];
    listResources(metadata: TMetadata): Promise<ResourceDescriptor[]>;
    readResource(uri: string, metadata: TMetadata, providerId?: string): Promise<ResourceContent>;
    private resolveProvider;
}
//# sourceMappingURL=resource-manager.d.ts.map