import { describe, expect, it, jest } from '@jest/globals';
import { createMobileMenuToggleHandle } from '../../../src/core/browser/menu-toggle.js';

/**
 * Create an element stub for the mobile menu tests.
 * @param {Record<string, unknown>} [overrides] Optional element overrides.
 * @returns {Record<string, unknown>} Element-like stub.
 */
function createElement(overrides = {}) {
  const listeners = {};
  return {
    hidden: false,
    style: {},
    listeners,
    focus: jest.fn(),
    setAttribute: jest.fn(),
    addEventListener: jest.fn((eventName, listener) => {
      listeners[eventName] = listener;
    }),
    querySelector: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

describe('createMobileMenuToggleHandle', () => {
  it('wires open, close, overlay, and escape interactions', () => {
    const first = createElement();
    const sheet = createElement({
      querySelector: jest.fn().mockReturnValue(first),
    });
    const closeBtn = createElement();
    const overlay = createElement({
      hidden: true,
      querySelector: jest.fn(selector => {
        if (selector === '.menu-sheet') {
          return sheet;
        }
        if (selector === '.menu-close') {
          return closeBtn;
        }
        return null;
      }),
    });
    const toggle = createElement();
    const documentObj = {
      body: { style: {} },
      querySelector: jest.fn().mockReturnValue(toggle),
      getElementById: jest.fn().mockReturnValue(overlay),
    };
    let keydownListener;
    const handle = createMobileMenuToggleHandle({
      documentObj,
      addKeydownListener: listener => {
        keydownListener = listener;
      },
      setTimeoutFn: listener => listener(),
    });

    handle();
    toggle.listeners.click();

    expect(overlay.hidden).toBe(false);
    expect(overlay.setAttribute).toHaveBeenCalledWith('aria-hidden', 'false');
    expect(toggle.setAttribute).toHaveBeenCalledWith('aria-expanded', 'true');
    expect(documentObj.body.style.overflow).toBe('hidden');
    expect(first.focus).toHaveBeenCalledTimes(1);

    toggle.listeners.click();

    expect(overlay.hidden).toBe(true);
    expect(toggle.focus).toHaveBeenCalledTimes(1);

    toggle.listeners.click();
    keydownListener({ key: 'Escape' });

    expect(overlay.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
    expect(toggle.setAttribute).toHaveBeenCalledWith('aria-expanded', 'false');
    expect(documentObj.body.style.overflow).toBe('');
    expect(overlay.hidden).toBe(true);
    expect(toggle.focus).toHaveBeenCalledTimes(2);

    overlay.hidden = false;
    overlay.listeners.click({ target: overlay });
    closeBtn.listeners.click();

    expect(toggle.focus).toHaveBeenCalledTimes(4);
  });

  it('handles optional menu pieces and ignores unrelated events', () => {
    const overlay = createElement({
      hidden: true,
      querySelector: jest.fn().mockReturnValue(null),
    });
    const toggle = createElement();
    const documentObj = {
      body: { style: {} },
      querySelector: jest.fn().mockReturnValue(toggle),
      getElementById: jest.fn().mockReturnValue(overlay),
    };
    let keydownListener;
    const handle = createMobileMenuToggleHandle({
      documentObj,
      addKeydownListener: listener => {
        keydownListener = listener;
      },
      setTimeoutFn: listener => listener(),
    });

    handle();
    toggle.listeners.click();
    overlay.listeners.click({ target: createElement() });
    keydownListener({ key: 'Enter' });

    expect(overlay.hidden).toBe(false);
    expect(toggle.focus).not.toHaveBeenCalled();
  });

  it('does nothing when required menu elements are missing', () => {
    const documentObj = {
      querySelector: jest.fn().mockReturnValue(null),
      getElementById: jest.fn().mockReturnValue(null),
    };
    const addKeydownListener = jest.fn();
    const handle = createMobileMenuToggleHandle({
      documentObj,
      addKeydownListener,
      setTimeoutFn: jest.fn(),
    });

    handle();

    expect(addKeydownListener).not.toHaveBeenCalled();
  });
});
