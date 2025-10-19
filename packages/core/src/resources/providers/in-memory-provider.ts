import {
  ResourceContent,
  ResourceDescriptor,
  ResourceProvider,
  ResourceProviderContext,
} from '../../types';

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

export class InMemoryResourceProvider implements ResourceProvider {
  public readonly id: string;
  public readonly displayName: string;

  private readonly resources: Map<string, InMemoryResource> = new Map();

  constructor(id: string, displayName: string, items: InMemoryResource[] = []) {
    this.id = id;
    this.displayName = displayName;
    items.forEach((item) => this.resources.set(item.uri, item));
  }

  addResource(resource: InMemoryResource): void {
    this.resources.set(resource.uri, resource);
  }

  async listResources(
    _context: ResourceProviderContext,
  ): Promise<ResourceDescriptor[]> {
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

  async readResource(
    uri: string,
    _context: ResourceProviderContext,
  ): Promise<ResourceContent> {
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

  async canHandle(uri: string): Promise<boolean> {
    return this.resources.has(uri);
  }
}
