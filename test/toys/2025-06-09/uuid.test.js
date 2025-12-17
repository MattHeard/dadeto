import { uuidToy } from '../../../src/core/browser/toys/2025-06-09/uuid.js';
import { jest } from '@jest/globals';

describe('uuidToy', () => {
  it('returns the uuid from the environment', () => {
    const mockUuid = '84f8e1f2-3e9d-4fd1-b1a2-d9c2bd34fdba';
    const getUuid = jest.fn(() => mockUuid);
    const get = key => {
      if (key === 'getUuid') {
        return getUuid;
      }
      return undefined;
    };
    const env = { get };
    expect(uuidToy(undefined, env)).toBe(mockUuid);
  });

  it('throws when the uuid helper is missing', () => {
    const env = { get: () => undefined };
    expect(() => uuidToy(undefined, env)).toThrow('getUuid helper is missing');
  });
});
