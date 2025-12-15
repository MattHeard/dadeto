import {
  normalizeRatingEntry,
  serializeRatingRows,
  moderatorRatingsHandler,
} from '../../src/core/browser/inputHandlers/moderatorRatings.js';
import { clearInputValue } from '../../src/core/browser/inputValueStore.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('normalizeRatingEntry', () => {
  test('returns defaults for invalid or missing entries', () => {
    expect(normalizeRatingEntry(null)).toEqual({
      moderatorId: '',
      variantId: '',
      ratedAt: '',
      isApproved: false,
    });
    expect(
      normalizeRatingEntry({
        moderatorId: '  mod-alpha ',
        variantId: ' variant ',
        ratedAt: '2025-01-01T00:00:00Z',
        isApproved: 'true',
      })
    ).toEqual({
      moderatorId: 'mod-alpha',
      variantId: 'variant',
      ratedAt: '2025-01-01T00:00:00Z',
      isApproved: true,
    });
    expect(
      normalizeRatingEntry({
        moderatorId: 'mod-beta',
        variantId: 'variant',
        ratedAt: '',
        isApproved: false,
      })
    ).toEqual({
      moderatorId: 'mod-beta',
      variantId: 'variant',
      ratedAt: '',
      isApproved: false,
    });
  });
});

describe('serializeRatingRows', () => {
  test('applies normalization to every row', () => {
    const rows = [
      {
        moderatorId: ' mod-a ',
        variantId: 'variant',
        ratedAt: '2025-02-02T00:00:00Z',
        isApproved: 'true',
      },
      {
        moderatorId: 'mod-b',
        variantId: null,
        ratedAt: undefined,
        isApproved: false,
      },
    ];

    expect(serializeRatingRows(rows)).toEqual([
      {
        moderatorId: 'mod-a',
        variantId: 'variant',
        ratedAt: '2025-02-02T00:00:00Z',
        isApproved: true,
      },
      {
        moderatorId: 'mod-b',
        variantId: '',
        ratedAt: '',
        isApproved: false,
      },
    ]);
  });
});

/**
 *
 */
function createFakeDom() {
  const created = [];
  return {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
    createElement: jest.fn(tag => {
      const element = { tag, children: [], value: '', attributes: {} };
      created.push(element);
      return element;
    }),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children = parent.children ?? [];
      parent.children.push(child);
    }),
    insertBefore: jest.fn(),
    getNextSibling: jest.fn(() => null),
    setType: jest.fn((element, type) => {
      element.type = type;
    }),
    setPlaceholder: jest.fn((element, placeholder) => {
      element.placeholder = placeholder;
    }),
    setValue: jest.fn((element, value) => {
      element.value = value;
    }),
    getValue: jest.fn(element => element.value),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    reveal: jest.fn(),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    enable: jest.fn(),
  };
}

describe('moderatorRatingsHandler', () => {
  test('initializes a form and persists a default row', () => {
    const textInput = { value: '' };
    const dom = createFakeDom();
    const container = {};

    moderatorRatingsHandler(dom, container, textInput);

    const setValueCalls = dom.setValue.mock.calls.filter(
      ([element]) => element === textInput
    );
    expect(setValueCalls.length).toBeGreaterThanOrEqual(1);

    const lastValue = setValueCalls[setValueCalls.length - 1][1];
    expect(lastValue).toBe(
      '[{"moderatorId":"","variantId":"","ratedAt":"","isApproved":false}]'
    );

    clearInputValue(textInput);
  });
});
