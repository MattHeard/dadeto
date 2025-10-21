import { jest } from '@jest/globals';

export const FieldValue = { delete: () => {} };

export const mockDoc = jest.fn();

/**
 * Provide a mocked Firestore instance exposing the doc helper.
 * @returns {{ doc: jest.Mock }} Firestore stub wired to the shared doc mock.
 */
export function getFirestore() {
  return { doc: mockDoc };
}
