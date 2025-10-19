import { ProtocolManager, UnsupportedProtocolVersionError } from '../protocol-manager';

describe('ProtocolManager', () => {
  it('returns exact version when supported', () => {
    const manager = new ProtocolManager();

    const negotiated = manager.negotiate('2024-11-05');

    expect(negotiated.version).toBe('2024-11-05');
    expect(negotiated.capabilities.tools).toBeDefined();
    expect(manager.isSupported('2024-11-05')).toBe(true);
  });

  it('falls back to latest supported version with backward compatibility enabled', () => {
    const manager = new ProtocolManager({
      allowBackwardCompatibility: true,
    });

    const negotiated = manager.negotiate('2026-01-01');

    expect(negotiated.version).toBe('2025-06-18');
    expect(negotiated.features).toContain('prompts');
  });

  it('throws when strict mode is enabled and version is unsupported', () => {
    const manager = new ProtocolManager({
      strictMode: true,
      allowBackwardCompatibility: false,
    });

    expect(() => manager.negotiate('2023-01-01')).toThrow(UnsupportedProtocolVersionError);
  });

  it('returns default version when client does not specify a version', () => {
    const manager = new ProtocolManager();

    const negotiated = manager.negotiate(undefined);

    expect(negotiated.version).toBe('2024-11-05');
  });
});
