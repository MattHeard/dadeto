import { describe, test, expect, jest } from '@jest/globals';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from '../../src/cloud/submit-new-page/helpers.js';

describe('parseIncomingOption additional branches', () => {
  test('returns null for empty string', () => {
    expect(parseIncomingOption('')).toBeNull();
  });

  test('returns null for non-integer page number', () => {
    expect(parseIncomingOption('a.b.c')).toBeNull();
  });

  test('returns null for empty variant name', () => {
    expect(parseIncomingOption('1..2')).toBeNull();
  });

  test('returns null for empty variant name with spaces', () => {
    expect(parseIncomingOption('1. .2')).toBeNull();
  });

  test('returns null for invalid variant name', () => {
    expect(parseIncomingOption('1.2.3')).toBeNull();
  });

  test('returns null for missing variant name', () => {
    expect(parseIncomingOption('1..3')).toBeNull();
  });

  test('returns null for missing option number', () => {
    expect(parseIncomingOption('1.a')).toBeNull();
  });

  test('returns null for missing page number', () => {
    expect(parseIncomingOption('.a.1')).toBeNull();
  });

  test('returns null for non-numeric option number', () => {
    expect(parseIncomingOption('1.a.b')).toBeNull();
  });

  test('returns null when variantName is empty after parsing', () => {
    expect(parseIncomingOption('1..1')).toBeNull();
  });
});

describe('findExistingOption additional branches', () => {
  test('returns null for null db', async () => {
    expect(await findExistingOption(null, {})).toBeNull();
  });

  test('returns null for null info', async () => {
    expect(await findExistingOption({}, null)).toBeNull();
  });

  test('returns null when pageSnap is empty', async () => {
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      })),
    };
    expect(await findExistingOption(db, {})).toBeNull();
  });

  test('returns null when variantSnap is empty', async () => {
    const pageRef = {
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
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
    expect(await findExistingOption(db, {})).toBeNull();
  });
});

describe('findExistingPage additional branches', () => {
  test('returns null for null db', async () => {
    expect(await findExistingPage(null, 1)).toBeNull();
  });

  test('returns null for non-integer page number', async () => {
    expect(await findExistingPage({}, 'a')).toBeNull();
  });

  test('returns null when pageSnap is empty', async () => {
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      })),
    };
    expect(await findExistingPage(db, 1)).toBeNull();
  });
});
