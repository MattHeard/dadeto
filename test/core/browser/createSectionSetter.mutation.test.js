import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/core/browser/common.js', () => ({
  isObject: value =>
    value !== null && typeof value === 'object' && !Array.isArray(value),
}));

jest.unstable_mockModule('../../../src/core/browser/browser-core.js', () => ({
  safeJsonParse: input => {
    try {
      return { ok: true, data: JSON.parse(input) };
    } catch {
      return { ok: false, message: 'invalid JSON' };
    }
  },
  deepClone: value => structuredClone(value),
  deepMerge: (target, source) => {
    if (target === undefined) {
      throw new Error('merge target is required');
    }
    return { ...target, ...source };
  },
}));

const { createSectionSetter } = await import(
  '../../../src/core/browser/createSectionSetter.js'
);

describe('createSectionSetter mutation contract', () => {
  it('rejects invalid and non-object input', () => {
    const setter = createSectionSetter('section');
    const env = new Map();

    expect(setter('{', env)).toBe('invalid JSON');
    expect(setter('null', env)).toBe(
      'Error: Input JSON must be a plain object.'
    );
  });

  it('deep-merges valid input and reports success', () => {
    const setLocalTemporaryData = jest.fn();
    const setter = createSectionSetter('section');
    const result = setter(
      '{"newValue":true}',
      new Map([
        ['getData', () => ({ section: { oldValue: true } })],
        ['setLocalTemporaryData', setLocalTemporaryData],
      ])
    );

    expect(result).toBe('Success: Section data deep merged.');
    expect(setLocalTemporaryData).toHaveBeenCalledWith({
      section: { oldValue: true, newValue: true },
    });
  });

  it('uses fallback environment functions when helpers are absent', () => {
    expect(createSectionSetter('section')('{"newValue":true}', new Map())).toBe(
      'Success: Section data deep merged.'
    );
  });

  it('creates the section object when current data omits it', () => {
    const setLocalTemporaryData = jest.fn();

    createSectionSetter('section')(
      '{"newValue":true}',
      new Map([
        ['getData', () => ({})],
        ['setLocalTemporaryData', setLocalTemporaryData],
      ])
    );

    expect(setLocalTemporaryData).toHaveBeenCalledWith({
      section: { newValue: true },
    });
  });

  it.each([new Error('boom'), 'boom'])(
    'formats thrown values from the merge path: %p', thrown => {
      const setter = createSectionSetter('section');
      const result = setter(
        '{}',
        new Map([
          ['getData', () => ({ section: {} })],
          ['setLocalTemporaryData', () => { throw thrown; }],
        ])
      );

      expect(result).toBe(
        thrown instanceof Error
          ? 'Error updating section data: boom'
          : 'Error updating section data: An unexpected error occurred.'
      );
    }
  );
});
