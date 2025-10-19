"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protocol_manager_1 = require("../protocol-manager");
describe('ProtocolManager', () => {
    it('returns exact version when supported', () => {
        const manager = new protocol_manager_1.ProtocolManager();
        const negotiated = manager.negotiate('2024-11-05');
        expect(negotiated.version).toBe('2024-11-05');
        expect(negotiated.capabilities.tools).toBeDefined();
        expect(manager.isSupported('2024-11-05')).toBe(true);
    });
    it('falls back to latest supported version with backward compatibility enabled', () => {
        const manager = new protocol_manager_1.ProtocolManager({
            allowBackwardCompatibility: true,
        });
        const negotiated = manager.negotiate('2026-01-01');
        expect(negotiated.version).toBe('2025-06-18');
        expect(negotiated.features).toContain('prompts');
    });
    it('throws when strict mode is enabled and version is unsupported', () => {
        const manager = new protocol_manager_1.ProtocolManager({
            strictMode: true,
            allowBackwardCompatibility: false,
        });
        expect(() => manager.negotiate('2023-01-01')).toThrow(protocol_manager_1.UnsupportedProtocolVersionError);
    });
    it('returns default version when client does not specify a version', () => {
        const manager = new protocol_manager_1.ProtocolManager();
        const negotiated = manager.negotiate(undefined);
        expect(negotiated.version).toBe('2024-11-05');
    });
});
//# sourceMappingURL=protocol-manager.test.js.map