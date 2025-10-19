import { ProtocolManagerOptions, ProtocolVersionDefinition, ServerCapabilities } from '../types';
/**
 * Error thrown when protocol negotiation fails in strict mode.
 */
export declare class UnsupportedProtocolVersionError extends Error {
    readonly requestedVersion: string;
    constructor(requestedVersion: string, supportedVersions: string[]);
}
export interface ProtocolNegotiationResult extends ProtocolVersionDefinition {
}
/**
 * Manages protocol version negotiation and capability exposure.
 */
export declare class ProtocolManager {
    private static readonly DEFAULT_VERSIONS;
    private static readonly DEFAULT_VERSION;
    private readonly versions;
    private readonly strictMode;
    private readonly allowBackwardCompatibility;
    private readonly defaultVersion;
    constructor(options?: ProtocolManagerOptions);
    /**
     * Negotiate the protocol version to use for a given client version.
     */
    negotiate(clientVersion?: string | null): ProtocolNegotiationResult;
    /**
     * Returns the capabilities associated with a protocol version.
     */
    getCapabilities(version: string): ServerCapabilities;
    /**
     * Returns true when a version is explicitly supported.
     */
    isSupported(version: string): boolean;
    /**
     * Returns every known protocol version.
     */
    getSupportedVersions(): string[];
    private getVersionDefinition;
    private findBackwardCompatibleVersion;
    private toTimestamp;
    private compareVersions;
    private static chooseDefaultVersion;
}
//# sourceMappingURL=protocol-manager.d.ts.map