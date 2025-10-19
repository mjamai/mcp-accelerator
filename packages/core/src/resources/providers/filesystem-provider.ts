import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ResourceContent,
  ResourceDescriptor,
  ResourceProvider,
  ResourceProviderContext,
} from '../../types';

export interface FilesystemResourceProviderOptions {
  rootPath: string;
  maxDepth?: number;
  includeExtensions?: string[];
  uriPrefix?: string;
}

interface ResourceEntry {
  uri: string;
  absolutePath: string;
  descriptor: ResourceDescriptor;
}

const DEFAULT_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.ts',
  '.js',
  '.html',
  '.css',
]);

const MIME_OVERRIDES: Record<string, string> = {
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.csv': 'text/csv',
  '.ts': 'application/typescript',
  '.js': 'application/javascript',
};

export class FilesystemResourceProvider implements ResourceProvider {
  public readonly id: string;
  public readonly displayName: string;

  private readonly rootPath: string;
  private readonly maxDepth: number;
  private readonly includeExtensions?: Set<string>;
  private readonly uriPrefix: string;
  private readonly entries: Map<string, ResourceEntry> = new Map();

  constructor(
    id: string,
    displayName: string,
    options: FilesystemResourceProviderOptions,
  ) {
    this.id = id;
    this.displayName = displayName;
    this.rootPath = path.resolve(options.rootPath);
    this.maxDepth = options.maxDepth ?? 2;
    this.includeExtensions = options.includeExtensions
      ? new Set(options.includeExtensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)))
      : undefined;
    this.uriPrefix = options.uriPrefix ?? `resource://${id}/`;
  }

  async listResources(
    _context: ResourceProviderContext,
  ): Promise<ResourceDescriptor[]> {
    this.entries.clear();
    const resources: ResourceDescriptor[] = [];

    const walk = async (currentDir: string, depth: number): Promise<void> => {
      if (depth > this.maxDepth) {
        return;
      }

      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const absolutePath = path.join(currentDir, entry.name);
        const relativePath = path.relative(this.rootPath, absolutePath);

        if (relativePath.startsWith('..')) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(absolutePath, depth + 1);
          continue;
        }

        if (this.includeExtensions && !this.includeExtensions.has(path.extname(entry.name))) {
          continue;
        }

        const stats = await fs.stat(absolutePath);
        const uri = this.createUri(relativePath);
        const descriptor: ResourceDescriptor = {
          uri,
          name: entry.name,
          mimeType: this.guessMimeType(entry.name),
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          provider: {
            id: this.id,
            displayName: this.displayName,
          },
        };

        resources.push(descriptor);
        this.entries.set(uri, {
          uri,
          absolutePath,
          descriptor,
        });
      }
    };

    await walk(this.rootPath, 0);
    return resources;
  }

  async readResource(
    uri: string,
    _context: ResourceProviderContext,
  ): Promise<ResourceContent> {
    const entry = await this.ensureEntry(uri);
    const extension = path.extname(entry.descriptor.name).toLowerCase();
    const isText = DEFAULT_TEXT_EXTENSIONS.has(extension);

    if (isText) {
      const data = await fs.readFile(entry.absolutePath, 'utf8');
      return {
        uri,
        mimeType: entry.descriptor.mimeType,
        data,
        encoding: 'utf-8',
      };
    }

    const buffer = await fs.readFile(entry.absolutePath);
    return {
      uri,
      mimeType: entry.descriptor.mimeType,
      data: buffer.toString('base64'),
      encoding: 'base64',
    };
  }

  async canHandle(uri: string): Promise<boolean> {
    if (uri.startsWith(this.uriPrefix)) {
      return true;
    }

    if (this.entries.has(uri)) {
      return true;
    }

    return false;
  }

  private async ensureEntry(uri: string): Promise<ResourceEntry> {
    const cached = this.entries.get(uri);
    if (cached) {
      return cached;
    }

    if (!uri.startsWith(this.uriPrefix)) {
      throw new Error(`Unsupported resource URI: ${uri}`);
    }

    const relativePath = uri.slice(this.uriPrefix.length);
    const absolutePath = path.resolve(this.rootPath, relativePath);

    if (!absolutePath.startsWith(this.rootPath)) {
      throw new Error('Resource access outside of provider root is forbidden');
    }

    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Resource is not a file: ${uri}`);
    }

    const descriptor: ResourceDescriptor = {
      uri,
      name: path.basename(relativePath),
      mimeType: this.guessMimeType(relativePath),
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      provider: {
        id: this.id,
        displayName: this.displayName,
      },
    };

    const entry: ResourceEntry = {
      uri,
      absolutePath,
      descriptor,
    };

    this.entries.set(uri, entry);
    return entry;
  }

  private guessMimeType(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    if (MIME_OVERRIDES[extension]) {
      return MIME_OVERRIDES[extension];
    }

    if (DEFAULT_TEXT_EXTENSIONS.has(extension)) {
      return 'text/plain';
    }

    switch (extension) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }

  private createUri(relativePath: string): string {
    const normalized = relativePath.split(path.sep).join('/');
    return `${this.uriPrefix}${normalized}`;
  }
}
