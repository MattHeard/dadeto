import { describe, expect, test } from '@jest/globals';
import { readExemptions } from '../../../src/core/scripts/read-exemptions.js';

describe('readExemptions', () => {
  test('reads object-shaped exemption payloads', () => {
    const exemptions = readExemptions({
      readFileSync: filePath =>
        filePath === '/repo/overexposed-exports-exemptions.json'
          ? JSON.stringify({
              exemptions: {
                'src/core/payment-webhook-core.js': 'baseline',
              },
            })
          : '',
      rootDir: '/repo',
      configPath: 'overexposed-exports-exemptions.json',
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
    });

    expect([...exemptions]).toEqual(['src/core/payment-webhook-core.js']);
  });

  test('treats non-object payloads as empty', () => {
    const exemptions = readExemptions({
      readFileSync: () => JSON.stringify('nope'),
      rootDir: '/repo',
      configPath: 'overexposed-exports-exemptions.json',
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
    });

    expect([...exemptions]).toEqual([]);
  });

  test('treats objects without an exemptions map as empty', () => {
    const exemptions = readExemptions({
      readFileSync: () => JSON.stringify({}),
      rootDir: '/repo',
      configPath: 'overexposed-exports-exemptions.json',
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
    });

    expect([...exemptions]).toEqual([]);
  });

  test('treats invalid json as empty', () => {
    const exemptions = readExemptions({
      readFileSync: () => '{',
      rootDir: '/repo',
      configPath: 'overexposed-exports-exemptions.json',
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
    });

    expect([...exemptions]).toEqual([]);
  });

  test('treats read errors as empty', () => {
    const exemptions = readExemptions({
      readFileSync: () => {
        throw new Error('missing');
      },
      rootDir: '/repo',
      configPath: 'overexposed-exports-exemptions.json',
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
    });

    expect([...exemptions]).toEqual([]);
  });
});
