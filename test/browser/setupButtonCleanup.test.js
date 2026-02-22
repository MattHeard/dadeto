import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton, setupRemoveButton } from '../../src/browser/toys.js';

describe('button cleanup helpers', () => {
  it('setupAddButton disposer removes event listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rowData = { rows: {}, rowTypes: {} };
    const render = jest.fn();
    const disposers = [];
    setupAddButton({ dom, button, rowData, render, disposers });
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });

  it('setupAddButton disposer removes the specific listener that was added', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rowData = { rows: {}, rowTypes: {} };
    const render = jest.fn();
    const disposers = [];

    setupAddButton({ dom, button, rowData, render, disposers });

    const [, , onAdd] = dom.addEventListener.mock.calls[0];
    const dispose = disposers[0];
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      onAdd
    );
  });

  it('setupRemoveButton disposer removes event listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rowData = { rows: { k: 'v' }, rowTypes: {} };
    const render = jest.fn();
    const disposers = [];
    setupRemoveButton({
      dom,
      button,
      rowData,
      render,
      key: 'k',
      disposers,
    });
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });

  it('setupAddButton disposer prevents further clicks from modifying rows', () => {
    const handlers = [];
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn((_, event, handler) => {
        if (event === 'click') {
          handlers.push(handler);
        }
      }),

      removeEventListener: jest.fn((_, event, handler) => {
        if (event === 'click') {
          handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        }
      }),
    };
    const button = {};
    const rowData = { rows: {}, rowTypes: {} };
    const render = jest.fn();
    const disposers = [];

    setupAddButton({ dom, button, rowData, render, disposers });

    // Capture the click handler
    const clickHandler = handlers[0];
    expect(typeof clickHandler).toBe('function');

    // Trigger the click once
    clickHandler();
    expect(rowData.rows).toHaveProperty('');
    expect(render).toHaveBeenCalledTimes(1);

    // Dispose and simulate another click
    const dispose = disposers[0];
    dispose();
    expect(handlers).toHaveLength(0);

    if (clickHandler) {
      clickHandler();
    }

    // Rows and render should remain unchanged after dispose
    expect(Object.keys(rowData.rows)).toHaveLength(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('setupAddButton disposer is idempotent', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rowData = { rows: {}, rowTypes: {} };
    const render = jest.fn();
    const disposers = [];

    setupAddButton({ dom, button, rowData, render, disposers });

    const dispose = disposers[0];
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledTimes(1);

    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
  });
});
