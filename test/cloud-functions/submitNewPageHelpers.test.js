import { describe, test, expect, jest } from '@jest/globals';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from '../../src/cloud/submit-new-page/helpers.js';

describe('parseIncomingOption', () => {
  test('parses valid string', () => {
    const result = parseIncomingOption('1.a.0');
    expect(result).toEqual({
      pageNumber: 1,
      variantName: 'a',
      optionNumber: 0,
    });
  });

  test('returns null for invalid', () => {
    expect(parseIncomingOption('bad')).toBeNull();
  });
});

describe('findExistingPage', () => {
  test('returns page path when variant exists', async () => {
    const pagePath = 'stories/s1/pages/p1';
    const pageRef = {
      path: pagePath,
      collection: jest.fn(() => ({
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: false }),
      })),
    };
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: pageRef }] }),
      })),
    };
    const result = await findExistingPage(db, 1);
    expect(result).toBe(pagePath);
  });

  test('returns null when no variant exists', async () => {
    const pageRef = {
      collection: jest.fn(() => ({
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      })),
    };
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: pageRef }] }),
      })),
    };
    const result = await findExistingPage(db, 1);
    expect(result).toBeNull();
  });
});

describe('findExistingOption', () => {
  test('returns option path when found', async () => {
    const optionPath = 'stories/s1/pages/p1/variants/v1/options/opt1';
    const variantRef = {
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ ref: { path: optionPath } }],
        }),
      })),
    };
    const pageRef = {
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: variantRef }] }),
      })),
    };
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: pageRef }] }),
      })),
    };
    const result = await findExistingOption(db, {
      pageNumber: 1,
      variantName: 'a',
      optionNumber: 0,
    });
    expect(result).toBe(optionPath);
  });

  test('returns null when option missing', async () => {
    const variantRef = {
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      })),
    };
    const pageRef = {
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: variantRef }] }),
      })),
    };
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest
          .fn()
          .mockResolvedValue({ empty: false, docs: [{ ref: pageRef }] }),
      })),
    };
    const result = await findExistingOption(db, {
      pageNumber: 1,
      variantName: 'a',
      optionNumber: 0,
    });
    expect(result).toBeNull();
  });
});
