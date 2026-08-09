import { describe, expect, it, jest } from '@jest/globals';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from '../../../../src/core/cloud/submit-new-page/submit-new-page-core.js';

describe('parseIncomingOption', () => {
  it('parses a valid incoming option string', () => {
    expect(parseIncomingOption('12-Alpha-34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
  });

  it('rejects variant tokens that start with a non-letter', () => {
    expect(parseIncomingOption('12-1Alpha-34')).toBeNull();
  });

  it('rejects three-part options with invalid numeric fields', () => {
    expect(parseIncomingOption('12-Alpha-3.4')).toBeNull();
    expect(parseIncomingOption('12-Alpha-xx')).toBeNull();
  });

  it('rejects malformed option strings with repeated separators', () => {
    expect(parseIncomingOption('12--Alpha-34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
    expect(parseIncomingOption('12___Alpha--34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
  });

  it('rejects option strings with too many parts', () => {
    expect(parseIncomingOption('12-Alpha-34-extra')).toBeNull();
  });
});

describe('existing page and option lookups', () => {
  const makeDb = ({
    pageEmpty = false,
    variantEmpty = false,
    optionEmpty = false,
    variantsEmpty = false,
  } = {}) => {
    const optionRef = { path: 'options/1' };
    const variantRef = {
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              empty: optionEmpty,
              docs: [{ ref: optionRef }],
            }),
          })),
        })),
      })),
    };
    const pageRef = {
      path: 'pages/1',
      collection: jest.fn(name =>
        name === 'variants'
          ? {
              where: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue({
                    empty: variantEmpty,
                    docs: [{ ref: variantRef }],
                  }),
                })),
              })),
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: variantsEmpty }),
              })),
            }
          : {
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: variantsEmpty }),
              })),
            }
      ),
    };
    return {
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              empty: pageEmpty,
              docs: [{ ref: pageRef }],
            }),
          })),
        })),
      })),
      pageRef,
      variantRef,
      optionRef,
    };
  };

  it('resolves existing option and page paths and handles missing records', async () => {
    await expect(findExistingOption(null, null)).resolves.toBeNull();
    await expect(findExistingPage(null, 1)).resolves.toBeNull();

    const db = makeDb();
    await expect(
      findExistingOption(db, {
        pageNumber: 1,
        variantName: 'Alpha',
        optionNumber: 1,
      })
    ).resolves.toBe('options/1');
    await expect(findExistingPage(db, 1)).resolves.toBe('pages/1');

    await expect(
      findExistingOption(makeDb({ pageEmpty: true }), {
        pageNumber: 1,
        variantName: 'Alpha',
        optionNumber: 1,
      })
    ).resolves.toBeNull();
    await expect(
      findExistingOption(makeDb({ variantEmpty: true }), {
        pageNumber: 1,
        variantName: 'Alpha',
        optionNumber: 1,
      })
    ).resolves.toBeNull();
    await expect(
      findExistingOption(makeDb({ optionEmpty: true }), {
        pageNumber: 1,
        variantName: 'Alpha',
        optionNumber: 1,
      })
    ).resolves.toBeNull();
    await expect(
      findExistingPage(makeDb({ pageEmpty: true }), 1)
    ).resolves.toBeNull();
    await expect(
      findExistingPage(makeDb({ variantsEmpty: true }), 1)
    ).resolves.toBeNull();
  });
});
