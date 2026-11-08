import {
  normalizeImpactPath,
  classifyImpactPath,
  parseRelatedImpactPaths,
} from '../../../../src/logic/boundary/local/impact-paths.js';

describe('impact path boundary', () => {
  it.each([
    undefined,
    null,
    true,
    42,
    1n,
    Symbol('path'),
    {},
    [],
    () => 'path',
  ])('rejects non-string candidate %p without coercion', value => {
    expect(normalizeImpactPath(value)).toBe('');
  });
  it.each(['/absolute.js', 'a/../b.js', 'a\0b.js', 'a\nb.js', 'a\rb.js'])(
    'rejects unsafe string %p',
    value => {
      expect(normalizeImpactPath(value)).toBe('');
    }
  );
  it.each([
    ['', ''],
    ['./test\\core\\a.test.js', 'test/core/a.test.js'],
    ['src/core/a.js', 'src/core/a.js'],
    ['a..b.js', 'a..b.js'],
  ])('normalizes %p', (value, expected) => {
    expect(normalizeImpactPath(value)).toBe(expected);
  });
  it.each([
    ['src/a.js', 'source'],
    ['src/a.ts', ''],
    ['other/a.js', ''],
    ['test/a.test.js', 'test'],
    ['else/a.test.js', ''],
    ['test/a.js', ''],
    ['test/e2e/a.test.js', ''],
    ['test/e2extra/a.test.js', 'test'],
    ['', ''],
  ])('classifies normalized %p', (value, expected) => {
    expect(classifyImpactPath(value)).toBe(expected);
  });
  it('defines absence and unsupported candidates as an empty unit selection', () => {
    expect(parseRelatedImpactPaths(undefined)).toEqual({ ok: true, paths: [] });
    expect(parseRelatedImpactPaths([])).toEqual({ ok: true, paths: [] });
    expect(
      parseRelatedImpactPaths([
        undefined,
        null,
        42,
        '',
        'src/core/a.js',
        'test/e2e/a.test.js',
      ])
    ).toEqual({ ok: true, paths: [] });
  });
  it('returns the original sparse-list structural error explicitly', () => {
    const parsed = parseRelatedImpactPaths(new Array(2));
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeInstanceOf(TypeError);
    expect(parsed.error.message).toBe(
      "Cannot read properties of undefined (reading 'startsWith')"
    );
  });
  it('normalizes and deduplicates supported unit candidates in first occurrence order', () => {
    expect(
      parseRelatedImpactPaths([
        './test\\core\\z.test.js',
        'test/core/a.test.js',
        'test/core/z.test.js',
      ])
    ).toEqual({
      ok: true,
      paths: ['test/core/z.test.js', 'test/core/a.test.js'],
    });
  });
});
