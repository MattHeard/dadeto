import { describe, expect, it } from '@jest/globals';
import {
  invokeCapability,
  listCapabilities,
} from '../../../src/core/capabilities/index.js';

describe('JSON1 capability registry', () => {
  it('lists JSON1 metadata without exposing its implementation', () => {
    expect(listCapabilities()).toEqual([
      {
        id: 'JSON1',
        name: 'JSON Canonicalizer',
        description:
          'Canonicalize valid JSON by recursively sorting object keys while preserving array order.',
        inputType: 'string',
        outputType: 'string',
      },
    ]);
  });

  it('invokes the existing canonicalizer through the allowlist', () => {
    expect(
      invokeCapability({
        capabilityId: 'JSON1',
        input: '{"b":2,"a":{"d":4,"c":3}}',
      })
    ).toBe('{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "b": 2\n}');
  });

  it('preserves JSON1 malformed-input behavior', () => {
    expect(
      invokeCapability({ capabilityId: 'JSON1', input: '{bad json' })
    ).toBe('{"error":"Invalid JSON input: malformed JSON"}');
  });

  it.each(['toString', '__proto__', '../jsonCanonicalizer', '/etc/passwd'])(
    'rejects unregistered capability ID %s without resolving it as executable input',
    capabilityId => {
      expect(() => invokeCapability({ capabilityId, input: '{}' })).toThrow(
        expect.objectContaining({
          name: 'CapabilityInvocationError',
          code: 'UNKNOWN_CAPABILITY',
          message: 'Unknown capability ID.',
        })
      );
    }
  );

  it('rejects malformed invocation shapes with a structured code', () => {
    expect(() => invokeCapability({ capabilityId: 'JSON1', input: 7 })).toThrow(
      expect.objectContaining({
        name: 'CapabilityInvocationError',
        code: 'INVALID_INVOCATION',
      })
    );
  });
});
