import { jest } from '@jest/globals';
import { createSectionSetter } from '../../../src/core/browser/createSectionSetter.js';

describe('createSectionSetter', () => {
  const getData = () => ({ some: 'value' });
  const setLocalTemporaryData = jest.fn();
  const env = new Map([
    ['getData', getData],
    ['setLocalTemporaryData', setLocalTemporaryData],
  ]);

  beforeEach(() => {
    setLocalTemporaryData.mockClear();
  });

  it('returns the JSON parse failure message when input is invalid', () => {
    const setter = createSectionSetter('section');
    const result = setter('{ invalid json }', env);

    expect(result).toMatch(/^Error: Invalid JSON input\./);
    expect(setLocalTemporaryData).not.toHaveBeenCalled();
  });

  it('rejects non-object JSON values', () => {
    const setter = createSectionSetter('section');
    const result = setter('null', env);

    expect(result).toBe('Error: Input JSON must be a plain object.');
    expect(setLocalTemporaryData).not.toHaveBeenCalled();
  });

  it('deep merges valid JSON into the selected section', () => {
    const setter = createSectionSetter('section');
    const mergeEnv = new Map([
      ['getData', () => ({ section: { existing: true } })],
      ['setLocalTemporaryData', jest.fn()],
    ]);

    const result = setter('{"new":true}', mergeEnv);

    const expectedData = {
      section: { existing: true, new: true },
    };

    expect(result).toBe('Success: Section data deep merged.');
    expect(mergeEnv.get('setLocalTemporaryData')).toHaveBeenCalledWith(
      expectedData
    );
  });

  it('creates a missing section before merging', () => {
    const setter = createSectionSetter('section');
    const mergeEnv = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);

    const result = setter('{"new":true}', mergeEnv);

    expect(result).toBe('Success: Section data deep merged.');
    expect(mergeEnv.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      section: { new: true },
    });
  });

  it('reports a friendly message when merge throws a non-error value', () => {
    const setter = createSectionSetter('section');
    const envWithThrow = new Map([
      ['getData', () => ({ section: {} })],
      [
        'setLocalTemporaryData',
        () => {
          throw 'boom';
        },
      ],
    ]);

    const result = setter('{}', envWithThrow);

    expect(result).toBe(
      'Error updating section data: An unexpected error occurred.'
    );
  });

  it('reports the underlying error message when merge throws an Error', () => {
    const setter = createSectionSetter('section');
    const envWithThrow = new Map([
      ['getData', () => ({ section: {} })],
      [
        'setLocalTemporaryData',
        () => {
          throw new Error('boom');
        },
      ],
    ]);

    const result = setter('{}', envWithThrow);

    expect(result).toBe('Error updating section data: boom');
  });

  it('uses fallback env functions when helpers are missing', () => {
    const setter = createSectionSetter('section');
    const envWithoutHelpers = new Map();

    const result = setter('{"new":true}', envWithoutHelpers);

    expect(result).toBe('Success: Section data deep merged.');
  });
});
