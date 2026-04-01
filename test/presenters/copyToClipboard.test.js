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
  return {
    button,
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
    createCopyToClipboardButtonElement('{"foo":"bar"}', dom);
    const handler = dom.addEventListener.mock.calls[0][2];
    const preventDefault = jest.fn();

    await handler({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(dom.globalThis.navigator.clipboard.writeText).toHaveBeenCalledWith(
      '{"foo":"bar"}'
    );
    expect(dom.logError).not.toHaveBeenCalled();
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
  });
});
