"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesystemResourceProvider = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
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
const MIME_OVERRIDES = {
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.csv': 'text/csv',
    '.ts': 'application/typescript',
    '.js': 'application/javascript',
};
class FilesystemResourceProvider {
    id;
    displayName;
    rootPath;
    maxDepth;
    includeExtensions;
    uriPrefix;
    entries = new Map();
    constructor(id, displayName, options) {
        this.id = id;
        this.displayName = displayName;
        this.rootPath = path.resolve(options.rootPath);
        this.maxDepth = options.maxDepth ?? 2;
        this.includeExtensions = options.includeExtensions
            ? new Set(options.includeExtensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)))
            : undefined;
        this.uriPrefix = options.uriPrefix ?? `resource://${id}/`;
    }
    async listResources(_context) {
        this.entries.clear();
        const resources = [];
        const walk = async (currentDir, depth) => {
            if (depth > this.maxDepth) {
                return;
            }
            const entries = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
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
                const stats = await fs_1.promises.stat(absolutePath);
                const uri = this.createUri(relativePath);
                const descriptor = {
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
    async readResource(uri, _context) {
        const entry = await this.ensureEntry(uri);
        const extension = path.extname(entry.descriptor.name).toLowerCase();
        const isText = DEFAULT_TEXT_EXTENSIONS.has(extension);
        if (isText) {
            const data = await fs_1.promises.readFile(entry.absolutePath, 'utf8');
            return {
                uri,
                mimeType: entry.descriptor.mimeType,
                data,
                encoding: 'utf-8',
            };
        }
        const buffer = await fs_1.promises.readFile(entry.absolutePath);
        return {
            uri,
            mimeType: entry.descriptor.mimeType,
            data: buffer.toString('base64'),
            encoding: 'base64',
        };
    }
    async canHandle(uri) {
        if (uri.startsWith(this.uriPrefix)) {
            return true;
        }
        if (this.entries.has(uri)) {
            return true;
        }
        return false;
    }
    async ensureEntry(uri) {
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
        const stats = await fs_1.promises.stat(absolutePath);
        if (!stats.isFile()) {
            throw new Error(`Resource is not a file: ${uri}`);
        }
        const descriptor = {
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
        const entry = {
            uri,
            absolutePath,
            descriptor,
        };
        this.entries.set(uri, entry);
        return entry;
    }
    guessMimeType(fileName) {
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
    createUri(relativePath) {
        const normalized = relativePath.split(path.sep).join('/');
        return `${this.uriPrefix}${normalized}`;
    }
}
exports.FilesystemResourceProvider = FilesystemResourceProvider;
//# sourceMappingURL=filesystem-provider.js.map