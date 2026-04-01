import { describe, expect, test, jest } from '@jest/globals';
import { createCopyToClipboardButtonElement } from '../../src/core/browser/presenters/copyToClipboard.js';

/**
 * Build a minimal DOM facade for the copy presenter tests.
 * @returns {object} Mock DOM helpers.
 */
function createMockDom() {
  const button = {
    tag: 'button',
    textContent: '',
    type: '',
  };
  const timeouts = [];
  return {
    button,
    timeouts,
    createElement: jest.fn(() => button),
    setType: jest.fn((node, type) => {
      node.type = type;
    }),
    setTextContent: jest.fn((node, text) => {
      node.textContent = text;
    }),
    addEventListener: jest.fn((node, eventName, handler) => {
      node[eventName] = handler;
    }),
    logError: jest.fn(),
    setTimeout: jest.fn((callback, delay) => {
      timeouts.push({ callback, delay });
      return timeouts.length;
    }),
    clearTimeout: jest.fn(handle => {
      timeouts[handle - 1] = null;
    }),
    globalThis: {
      navigator: {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      },
    },
  };
}

describe('createCopyToClipboardButtonElement', () => {
  test('renders a copy button with the expected label and listeners', () => {
    const dom = createMockDom();
    const element = createCopyToClipboardButtonElement('{"foo":"bar"}', dom);

    expect(dom.createElement).toHaveBeenCalledWith('button');
    expect(dom.setType).toHaveBeenCalledWith(element, 'button');
    expect(dom.setTextContent).toHaveBeenCalledWith(
      element,
      'Copy to clipboard'
    );
    expect(dom.addEventListener).toHaveBeenCalledWith(
      element,
      'click',
      expect.any(Function)
    );
  });

  test('writes the raw output to clipboard when clicked', async () => {
    const dom = createMockDom();
    const element = createCopyToClipboardButtonElement('{"foo":"bar"}', dom);
    const handler = dom.addEventListener.mock.calls[0][2];

    await handler({ preventDefault: jest.fn() });

    expect(dom.globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
      '{"foo":"bar"}'
    );
    expect(dom.setTextContent).toHaveBeenCalledWith(element, 'Copied!');
    expect(dom.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(dom.logError).not.toHaveBeenCalled();

    await handler({ preventDefault: jest.fn() });
    expect(dom.clearTimeout).toHaveBeenCalledWith(1);
    expect(dom.setTimeout).toHaveBeenCalledTimes(2);

    dom.timeouts[1].callback();
    expect(dom.setTextContent).toHaveBeenLastCalledWith(
      element,
      'Copy to clipboard'
    );
  });

  test('logs an error when clipboard writing fails', async () => {
    const dom = createMockDom();
    dom.globalThis.navigator.clipboard.writeText.mockRejectedValue(
      new Error('denied')
    );
    const element = createCopyToClipboardButtonElement('{"foo":"bar"}', dom);
    const handler = dom.addEventListener.mock.calls[0][2];

    await handler({ preventDefault: jest.fn() });

    expect(dom.logError).toHaveBeenCalledWith(
      'Failed to copy output to clipboard:',
      expect.any(Error)
    );
    expect(dom.setTextContent).not.toHaveBeenCalledWith(element, 'Copied!');
    expect(element.textContent).toBe('Copy to clipboard');
  });

  test('logs an error when clipboard API is missing', async () => {
    const dom = createMockDom();
    dom.globalThis = {};
    createCopyToClipboardButtonElement('{"foo":"bar"}', dom);
    const handler = dom.addEventListener.mock.calls[0][2];

    await handler({ preventDefault: jest.fn() });

    expect(dom.logError).toHaveBeenCalledWith(
      'Failed to copy output to clipboard:',
      expect.any(Error)
    );
    expect(dom.setTextContent).not.toHaveBeenCalledWith(
      expect.anything(),
      'Copied!'
    );
  });
});
