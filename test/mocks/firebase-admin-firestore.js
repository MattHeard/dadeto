import { jest } from '@jest/globals';

export const FieldValue = { delete: () => {} };

export const mockDoc = jest.fn();

/**
 *
 */
export function getFirestore() {
  return { doc: mockDoc };
}
