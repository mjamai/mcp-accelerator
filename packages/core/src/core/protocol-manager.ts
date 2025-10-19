import {
  ProtocolManagerOptions,
  ProtocolVersionDefinition,
  ServerCapabilities,
} from '../types';

/**
 * Error thrown when protocol negotiation fails in strict mode.
 */
export class UnsupportedProtocolVersionError extends Error {
  public readonly requestedVersion: string;

  constructor(requestedVersion: string, supportedVersions: string[]) {
    super(
      `Unsupported protocol version: ${requestedVersion}. Supported versions: ${supportedVersions.join(
        ', ',
      )}`,
    );
    this.name = 'UnsupportedProtocolVersionError';
    this.requestedVersion = requestedVersion;
  }
}

export interface ProtocolNegotiationResult extends ProtocolVersionDefinition {}

/**
 * Manages protocol version negotiation and capability exposure.
 */
export class ProtocolManager {
  private static readonly DEFAULT_VERSIONS: ProtocolVersionDefinition[] = [
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

  private static readonly DEFAULT_VERSION = '2024-11-05';

  private readonly versions: Map<string, ProtocolVersionDefinition>;
  private readonly strictMode: boolean;
  private readonly allowBackwardCompatibility: boolean;
  private readonly defaultVersion: string;

  constructor(options: ProtocolManagerOptions = {}) {
    const definedVersions = options.versions ?? ProtocolManager.DEFAULT_VERSIONS;
    this.strictMode = options.strictMode ?? false;
    this.allowBackwardCompatibility = options.allowBackwardCompatibility ?? true;
    this.defaultVersion =
      options.defaultVersion ??
      ProtocolManager.chooseDefaultVersion(definedVersions, ProtocolManager.DEFAULT_VERSION);

    this.versions = new Map(
      definedVersions.map((definition) => [definition.version, definition]),
    );

    if (!this.versions.has(this.defaultVersion)) {
      throw new Error(
        `Default protocol version "${this.defaultVersion}" is not present in known versions`,
      );
    }
  }

  /**
   * Negotiate the protocol version to use for a given client version.
   */
  negotiate(clientVersion?: string | null): ProtocolNegotiationResult {
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
  getCapabilities(version: string): ServerCapabilities {
    return this.getVersionDefinition(version).capabilities;
  }

  /**
   * Returns true when a version is explicitly supported.
   */
  isSupported(version: string): boolean {
    return this.versions.has(version);
  }

  /**
   * Returns every known protocol version.
   */
  getSupportedVersions(): string[] {
    return Array.from(this.versions.keys()).sort((a, b) => this.compareVersions(a, b));
  }

  private getVersionDefinition(version: string): ProtocolVersionDefinition {
    const definition = this.versions.get(version);
    if (!definition) {
      throw new UnsupportedProtocolVersionError(version, this.getSupportedVersions());
    }
    return definition;
  }

  private findBackwardCompatibleVersion(
    clientVersion: string,
  ): ProtocolVersionDefinition | undefined {
    const clientTimestamp = this.toTimestamp(clientVersion);
    if (clientTimestamp === undefined) {
      return undefined;
    }

    const sortedVersions = [...this.versions.values()].sort((a, b) =>
      this.compareVersions(b.version, a.version),
    );

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

  private toTimestamp(version: string): number | undefined {
    const parsed = new Date(version);
    const timestamp = parsed.getTime();
    return Number.isNaN(timestamp) ? undefined : timestamp;
  }

  private compareVersions(a: string, b: string): number {
    const aTimestamp = this.toTimestamp(a);
    const bTimestamp = this.toTimestamp(b);

    if (aTimestamp === undefined || bTimestamp === undefined) {
      return a.localeCompare(b);
    }

    return aTimestamp - bTimestamp;
  }

  private static chooseDefaultVersion(
    versions: ProtocolVersionDefinition[],
    preferred: string,
  ): string {
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
