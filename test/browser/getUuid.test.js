import { describe, it, expect, jest, beforeEach } from '@jest/globals';

let getUuid;

beforeEach(async () => {
  global.document = {
    getElementById: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    createElement: jest.fn(),
    createTextNode: jest.fn(),
    getElementsByTagName: jest.fn().mockReturnValue([]),
  };
  global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  global.navigator = {
    getGamepads: jest.fn().mockReturnValue([]),
  };
  ({ getUuid } = await import('../../src/browser/document.js'));
});

describe('getUuid', () => {
  it('returns a valid uuid', () => {
    const id = getUuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('returns unique values', () => {
    const first = getUuid();
    const second = getUuid();
    expect(first).not.toBe(second);
  });
});
