"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolManager = exports.UnsupportedProtocolVersionError = void 0;
/**
 * Error thrown when protocol negotiation fails in strict mode.
 */
class UnsupportedProtocolVersionError extends Error {
    requestedVersion;
    constructor(requestedVersion, supportedVersions) {
        super(`Unsupported protocol version: ${requestedVersion}. Supported versions: ${supportedVersions.join(', ')}`);
        this.name = 'UnsupportedProtocolVersionError';
        this.requestedVersion = requestedVersion;
    }
}
exports.UnsupportedProtocolVersionError = UnsupportedProtocolVersionError;
/**
 * Manages protocol version negotiation and capability exposure.
 */
class ProtocolManager {
    static DEFAULT_VERSIONS = [
        {
            version: '2024-11-05',
            capabilities: {
                tools: { listChanged: true },
                logging: {},
            },
            features: ['tools', 'logging'],
        },
        {
            version: '2025-06-18',
            capabilities: {
                tools: { listChanged: true },
                logging: {},
                resources: { subscribe: true, listChanged: true },
                prompts: { listChanged: true },
            },
            features: ['tools', 'logging', 'resources', 'prompts'],
        },
    ];
    static DEFAULT_VERSION = '2024-11-05';
    versions;
    strictMode;
    allowBackwardCompatibility;
    defaultVersion;
    constructor(options = {}) {
        const definedVersions = options.versions ?? ProtocolManager.DEFAULT_VERSIONS;
        this.strictMode = options.strictMode ?? false;
        this.allowBackwardCompatibility = options.allowBackwardCompatibility ?? true;
        this.defaultVersion =
            options.defaultVersion ??
                ProtocolManager.chooseDefaultVersion(definedVersions, ProtocolManager.DEFAULT_VERSION);
        this.versions = new Map(definedVersions.map((definition) => [definition.version, definition]));
        if (!this.versions.has(this.defaultVersion)) {
            throw new Error(`Default protocol version "${this.defaultVersion}" is not present in known versions`);
        }
    }
    /**
     * Negotiate the protocol version to use for a given client version.
     */
    negotiate(clientVersion) {
        if (!clientVersion) {
            return this.getVersionDefinition(this.defaultVersion);
        }
        if (this.versions.has(clientVersion)) {
            return this.getVersionDefinition(clientVersion);
        }
        if (this.allowBackwardCompatibility) {
            const fallback = this.findBackwardCompatibleVersion(clientVersion);
            if (fallback) {
                return fallback;
            }
        }
        if (this.strictMode) {
            throw new UnsupportedProtocolVersionError(clientVersion, this.getSupportedVersions());
        }
        return this.getVersionDefinition(this.defaultVersion);
    }
    /**
     * Returns the capabilities associated with a protocol version.
     */
    getCapabilities(version) {
        return this.getVersionDefinition(version).capabilities;
    }
    /**
     * Returns true when a version is explicitly supported.
     */
    isSupported(version) {
        return this.versions.has(version);
    }
    /**
     * Returns every known protocol version.
     */
    getSupportedVersions() {
        return Array.from(this.versions.keys()).sort((a, b) => this.compareVersions(a, b));
    }
    getVersionDefinition(version) {
        const definition = this.versions.get(version);
        if (!definition) {
            throw new UnsupportedProtocolVersionError(version, this.getSupportedVersions());
        }
        return definition;
    }
    findBackwardCompatibleVersion(clientVersion) {
        const clientTimestamp = this.toTimestamp(clientVersion);
        if (clientTimestamp === undefined) {
            return undefined;
        }
        const sortedVersions = [...this.versions.values()].sort((a, b) => this.compareVersions(b.version, a.version));
        for (const definition of sortedVersions) {
            const definitionTimestamp = this.toTimestamp(definition.version);
            if (definitionTimestamp === undefined) {
                continue;
            }
            if (definitionTimestamp <= clientTimestamp) {
                return definition;
            }
        }
        return undefined;
    }
    toTimestamp(version) {
        const parsed = new Date(version);
        const timestamp = parsed.getTime();
        return Number.isNaN(timestamp) ? undefined : timestamp;
    }
    compareVersions(a, b) {
        const aTimestamp = this.toTimestamp(a);
        const bTimestamp = this.toTimestamp(b);
        if (aTimestamp === undefined || bTimestamp === undefined) {
            return a.localeCompare(b);
        }
        return aTimestamp - bTimestamp;
    }
    static chooseDefaultVersion(versions, preferred) {
        if (versions.some((definition) => definition.version === preferred)) {
            return preferred;
        }
        const sorted = [...versions].sort((a, b) => {
            const aTimestamp = new Date(a.version).getTime();
            const bTimestamp = new Date(b.version).getTime();
            if (Number.isNaN(aTimestamp) || Number.isNaN(bTimestamp)) {
                return a.version.localeCompare(b.version);
            }
            return bTimestamp - aTimestamp;
        });
        return sorted[0]?.version ?? preferred;
    }
}
exports.ProtocolManager = ProtocolManager;
//# sourceMappingURL=protocol-manager.js.map