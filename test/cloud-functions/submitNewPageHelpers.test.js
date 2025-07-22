import { describe, test, expect, jest } from '@jest/globals';
import {
  parseIncomingOption,
  findExistingOption,
} from '../../infra/cloud-functions/submit-new-page/helpers.js';

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

describe('findExistingOption', () => {
  test('returns option id when found', async () => {
    const optionId = 'opt1';
    const variantRef = {
      collection: jest.fn(() => ({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ size: 1, docs: [{ id: optionId }] }),
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
    expect(result).toBe(optionId);
  });

  test('returns null when option missing', async () => {
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
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
