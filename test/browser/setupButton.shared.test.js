import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton, setupRemoveButton } from '../../src/browser/toys.js';

// Combined coverage from the former setupAddButton and setupRemoveButton tests
// Ensures both button helpers share consistent behavior

describe.each([
  [
    'setupAddButton',
    setupAddButton,
    (dom, button, rows, render, key, disposers) =>
      setupAddButton(dom, button, rows, render, disposers),
  ],
  [
    'setupRemoveButton',
    setupRemoveButton,
    (dom, button, rows, render, key, disposers) =>
      setupRemoveButton(dom, button, rows, render, key, disposers),
  ],
])('%s common behaviour', (_name, _setup, invoke) => {
  let dom;
  let button;
  let rows;
  let render;
  let disposers;
  const rowKey = 'k';

  beforeEach(() => {
    dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    button = {};
    rows = {};
    render = jest.fn();
    disposers = [];
  });

  it('adds a click event listener to the button', () => {
    invoke(dom, button, rows, render, rowKey, disposers);

    expect(dom.addEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });

  it('adds a disposer function to the disposers array', () => {
    invoke(dom, button, rows, render, rowKey, disposers);

    expect(disposers).toHaveLength(1);
    expect(disposers[0]).toBeInstanceOf(Function);
  });

  it('cleanup function removes the event listener', () => {
    invoke(dom, button, rows, render, rowKey, disposers);

    const cleanup = disposers[0];
    cleanup();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });

  it('cleanup can be called multiple times', () => {
    invoke(dom, button, rows, render, rowKey, disposers);

    const cleanup = disposers[0];
    cleanup();
    cleanup();

    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('cleanup removes the same handler that was added', () => {
    let addedHandler;
    dom.addEventListener.mockImplementation((_, event, handler) => {
      if (event === 'click') {
        addedHandler = handler;
      }
    });

    invoke(dom, button, rows, render, rowKey, disposers);

    const cleanup = disposers[0];
    cleanup();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      addedHandler
    );
  });
});
