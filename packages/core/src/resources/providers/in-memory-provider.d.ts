import { ResourceContent, ResourceDescriptor, ResourceProvider, ResourceProviderContext } from '../../types';
export interface InMemoryResource {
    uri: string;
    name: string;
    description?: string;
    mimeType: string;
    data: string;
    encoding?: 'utf-8' | 'base64';
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
}
export declare class InMemoryResourceProvider implements ResourceProvider {
    readonly id: string;
    readonly displayName: string;
    private readonly resources;
    constructor(id: string, displayName: string, items?: InMemoryResource[]);
    addResource(resource: InMemoryResource): void;
    listResources(_context: ResourceProviderContext): Promise<ResourceDescriptor[]>;
    readResource(uri: string, _context: ResourceProviderContext): Promise<ResourceContent>;
    canHandle(uri: string): Promise<boolean>;
}
//# sourceMappingURL=in-memory-provider.d.ts.map