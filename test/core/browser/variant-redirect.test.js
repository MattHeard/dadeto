import { describe, expect, it, jest } from '@jest/globals';
import { createVariantRedirectHandle } from '../../../src/core/browser/variant-redirect.js';

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
 * @returns {{readyState: string, listeners: Record<string, Function>, querySelectorAll: jest.Mock, addEventListener: jest.Mock}} Document stub.
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
});
