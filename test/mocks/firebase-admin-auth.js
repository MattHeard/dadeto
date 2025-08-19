import { jest } from '@jest/globals';

export const mockVerifyIdToken = jest.fn();

/**
 *
 */
/**
 * Return a mocked auth instance.
 * @returns {{verifyIdToken: import('@jest/globals').Mock}} Mocked auth
 */
export function getAuth() {
  return { verifyIdToken: mockVerifyIdToken };
}
