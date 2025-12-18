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
});
