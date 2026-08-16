import { describe, expect, test } from '@jest/globals';
import { readExemptions } from '../../../src/core/scripts/read-exemptions.js';

const deps = readFileSync => ({
  readFileSync,
  rootDir: '/repo',
  configPath: 'exemptions.json',
  pathModule: { resolve: (...segments) => segments.join('/') },
});

describe('readExemptions', () => {
  test('reads object-shaped exemption payloads', () => {
    expect([
      ...readExemptions(
        deps(() => JSON.stringify({ exemptions: { 'src/a.js': 'baseline' } }))
      ),
    ]).toEqual(['src/a.js']);
  });

  test('treats non-object payloads as empty', () => {
    expect([...readExemptions(deps(() => JSON.stringify('nope')))]).toEqual([]);
  });

  test('treats objects without an exemptions map as empty', () => {
    expect([...readExemptions(deps(() => JSON.stringify({})))]).toEqual([]);
  });

  test('treats invalid json as empty', () => {
    expect([...readExemptions(deps(() => '{'))]).toEqual([]);
  });

  test('treats read errors as empty', () => {
    expect([
      ...readExemptions(
        deps(() => {
          throw new Error('missing');
        })
      ),
    ]).toEqual([]);
  });
});
