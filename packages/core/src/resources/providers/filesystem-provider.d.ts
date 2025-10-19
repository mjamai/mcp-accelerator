import { ResourceContent, ResourceDescriptor, ResourceProvider, ResourceProviderContext } from '../../types';
export interface FilesystemResourceProviderOptions {
    rootPath: string;
    maxDepth?: number;
    includeExtensions?: string[];
    uriPrefix?: string;
}
export declare class FilesystemResourceProvider implements ResourceProvider {
    readonly id: string;
    readonly displayName: string;
    private readonly rootPath;
    private readonly maxDepth;
    private readonly includeExtensions?;
    private readonly uriPrefix;
    private readonly entries;
    constructor(id: string, displayName: string, options: FilesystemResourceProviderOptions);
    listResources(_context: ResourceProviderContext): Promise<ResourceDescriptor[]>;
    readResource(uri: string, _context: ResourceProviderContext): Promise<ResourceContent>;
    canHandle(uri: string): Promise<boolean>;
    private ensureEntry;
    private guessMimeType;
    private createUri;
}
//# sourceMappingURL=filesystem-provider.d.ts.map