import { describe, expect, it, jest } from '@jest/globals';
import {
  createVariantRedirectHandle,
  pickThresholdSlug,
  sumPositiveWeights,
  parseVariants,
  parseJsonVariants,
  pickWeighted,
} from '../../../src/core/browser/variant-redirect.js';

/**
 * Create a link stub.
 * @param {Record<string, string | null>} attrs Initial attributes.
 * @returns {{attrs: Record<string, string | null>, getAttribute: jest.Mock, setAttribute: jest.Mock}} Link stub.
 */
function createLink(attrs) {
  return {
    attrs,
    getAttribute: jest.fn(name => attrs[name] ?? null),
    setAttribute: jest.fn((name, value) => {
      attrs[name] = value;
    }),
  };
}

/**
 * Create a document stub for variant redirect tests.
 * @param {Array<unknown>} links Links returned by querySelectorAll.
 * @param {string} readyState Document ready state.
 * @returns {{readyState: string, listeners: Record<string, (...args: never[]) => unknown>, querySelectorAll: jest.Mock, addEventListener: jest.Mock}} Document stub.
 */
function createDocument(links, readyState = 'complete') {
  const listeners = {};
  return {
    readyState,
    listeners,
    querySelectorAll: jest.fn().mockReturnValue(links),
    addEventListener: jest.fn((eventName, listener) => {
      listeners[eventName] = listener;
    }),
  };
}

describe('createVariantRedirectHandle', () => {
  it('rewrites links from comma variant data', () => {
    const link = createLink({
      'data-variants': 'alpha:1,beta:3',
      href: '/stories/original.html',
    });
    const documentObj = createDocument([link]);
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj: { getRandomValues: values => values.fill(0) },
      URLCtor: URL,
    });

    handle();

    expect(documentObj.querySelectorAll).toHaveBeenCalledWith(
      'a.variant-link[data-variants]'
    );
    expect(link.attrs.href).toBe('https://example.test/stories/alpha.html');
    expect(link.attrs['data-chosen-variant']).toBe('alpha');
  });

  it('rewrites links from JSON variant data after DOMContentLoaded', () => {
    const link = createLink({
      'data-variants': '[{"slug":"alpha","w":1},{"slug":"beta","w":3}]',
      href: '/stories/original.html',
    });
    const documentObj = createDocument([link], 'loading');
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj: { getRandomValues: values => values.fill(4294967295) },
      URLCtor: URL,
    });

    handle();
    documentObj.listeners.DOMContentLoaded();

    expect(link.attrs.href).toBe('https://example.test/stories/beta.html');
    expect(link.attrs['data-chosen-variant']).toBe('beta');
  });

  it('skips rewriting when a variant link has no href', () => {
    const link = createLink({
      'data-variants': 'alpha:1',
    });
    const documentObj = createDocument([link]);
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj: { getRandomValues: values => values.fill(0) },
      URLCtor: URL,
    });

    handle();

    expect(link.setAttribute).not.toHaveBeenCalled();
  });

  it('ignores invalid, empty, and unwriteable variant links', () => {
    const invalidJsonLink = createLink({
      'data-variants': '{bad json',
      href: '/stories/original.html',
    });
    const emptyLink = createLink({
      'data-variants': '   ',
      href: '/stories/original.html',
    });
    const missingAttributeLink = createLink({
      href: '/stories/original.html',
    });
    const zeroWeightLink = createLink({
      'data-variants': 'alpha:0,beta:-1',
      href: '/stories/original.html',
    });
    const badUrlLink = createLink({
      'data-variants': 'alpha:1',
      href: '/stories/original.html',
    });
    const objectJsonLink = createLink({
      'data-variants': '{"slug":"alpha","w":1}',
      href: '/stories/original.html',
    });
    const documentObj = createDocument([
      invalidJsonLink,
      emptyLink,
      missingAttributeLink,
      zeroWeightLink,
      badUrlLink,
      objectJsonLink,
    ]);
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj: { getRandomValues: values => values.fill(0) },
      URLCtor: class {
        constructor() {
          throw new Error('bad url');
        }
      },
    });

    handle();

    expect(invalidJsonLink.setAttribute).not.toHaveBeenCalled();
    expect(emptyLink.setAttribute).not.toHaveBeenCalled();
    expect(missingAttributeLink.setAttribute).not.toHaveBeenCalled();
    expect(zeroWeightLink.setAttribute).not.toHaveBeenCalled();
    expect(badUrlLink.setAttribute).not.toHaveBeenCalled();
    expect(objectJsonLink.setAttribute).not.toHaveBeenCalled();
  });

  it('skips invalid weights while selecting from mixed pairs', () => {
    const link = createLink({
      'data-variants': 'skip:0,also-skip:nope,beta',
      href: '/stories/original.html',
    });
    const documentObj = createDocument([link]);
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj: { getRandomValues: values => values.fill(0) },
      URLCtor: URL,
    });

    handle();

    expect(link.attrs.href).toBe('https://example.test/stories/beta.html');
    expect(link.attrs['data-chosen-variant']).toBe('beta');
  });

  it('returns null when a threshold runs past the available positive weights', () => {
    expect(pickThresholdSlug([{ slug: 'alpha', w: 1 }], 2)).toBeNull();
  });
});

describe('variant redirect helpers', () => {
  it('parses empty, comma, JSON array, and invalid JSON variants', () => {
    expect(parseVariants(null)).toEqual([]);
    expect(parseVariants('   ')).toEqual([]);
    expect(parseVariants(' alpha , beta:2 ')).toEqual([
      { slug: 'alpha', w: 1 },
      { slug: 'beta', w: 2 },
    ]);
    expect(parseVariants(' alpha ')).toEqual([{ slug: 'alpha', w: 1 }]);
    expect(parseVariants('\t alpha \n')).toEqual([{ slug: 'alpha', w: 1 }]);
    expect(parseVariants('alpha:12')).toEqual([{ slug: 'alpha', w: 12 }]);
    expect(parseVariants('alpha,')).toEqual([{ slug: 'alpha', w: 1 }]);
    expect(parseVariants('alpha,[beta:2')).toEqual([
      { slug: 'alpha', w: 1 },
      { slug: '[beta', w: 2 },
    ]);
    expect(parseVariants('[{"slug":"alpha","w":2}]')).toEqual([
      { slug: 'alpha', w: 2 },
    ]);
    expect(parseVariants('  [{"slug":"alpha","w":2}]')).toEqual([
      { slug: 'alpha', w: 2 },
    ]);
    expect(parseVariants('{"slug":"alpha"}')).toEqual([]);
    expect(parseJsonVariants('[{"slug":"alpha","w":2}]')).toEqual([
      { slug: 'alpha', w: 2 },
    ]);
    expect(parseJsonVariants('{"slug":"alpha"}')).toEqual([]);
    expect(parseJsonVariants('{bad')).toEqual([]);
    expect(parseJsonVariants('null')).toEqual([]);
  });

  it('sums positive finite weights and selects weighted thresholds', () => {
    const pairs = [
      { slug: 'zero', w: 0 },
      { slug: 'bad', w: 'nope' },
      { slug: 'alpha', w: 2 },
      { slug: 'beta', w: 3 },
    ];
    expect(sumPositiveWeights(pairs)).toBe(5);
    expect(pickThresholdSlug(pairs, 1)).toBe('alpha');
    expect(pickThresholdSlug(pairs, 2)).toBe('alpha');
    expect(pickThresholdSlug(pairs, 2.1)).toBe('beta');
    expect(
      pickThresholdSlug([{ slug: 'negative', w: -1 }, ...pairs], 5.5)
    ).toBeNull();
    expect(
      pickWeighted(pairs, { getRandomValues: values => values.fill(0) })
    ).toBe('alpha');
    const noRandomForZeroWeights = { getRandomValues: jest.fn() };
    expect(
      pickWeighted([{ slug: 'none', w: 0 }], noRandomForZeroWeights)
    ).toBeNull();
    expect(noRandomForZeroWeights.getRandomValues).not.toHaveBeenCalled();
    expect(sumPositiveWeights([{ slug: 'negative', w: -1 }])).toBe(0);
    expect(sumPositiveWeights([{ slug: 'infinite', w: Infinity }])).toBe(0);
  });

  it('does not select or rewrite links without usable variants', () => {
    const link = createLink({
      'data-variants': '   ',
      href: '/stories/original.html',
    });
    const documentObj = createDocument([link]);
    const cryptoObj = { getRandomValues: jest.fn() };
    const handle = createVariantRedirectHandle({
      documentObj,
      locationObj: { href: 'https://example.test/stories/index.html' },
      cryptoObj,
      URLCtor: URL,
    });

    handle();

    expect(cryptoObj.getRandomValues).not.toHaveBeenCalled();
    expect(link.setAttribute).not.toHaveBeenCalled();
  });
});
