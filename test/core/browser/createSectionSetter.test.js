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
});
