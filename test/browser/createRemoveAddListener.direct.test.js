import { test, expect, jest } from '@jest/globals';
import { createOnAddHandler, setupAddButton } from '../../src/browser/toys.js';

test('createRemoveAddListener returns disposer that removes click handler', () => {
  const dom = {
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const btn = {};
  const rowData = { rows: {}, rowTypes: {} };
  const render = jest.fn();
  const disposers = [];
  const onAdd = createOnAddHandler(rowData, render);

  setupAddButton({ dom, button: btn, onAdd, disposers });

  expect(disposers).toHaveLength(1);
  const dispose = disposers[0];
  expect(typeof dispose).toBe('function');

  const [, , handler] = dom.addEventListener.mock.calls[0];
  const result = dispose();
  expect(result).toBeUndefined();
  dispose();

  expect(dom.removeEventListener).toHaveBeenNthCalledWith(
    1,
    btn,
    'click',
    handler
  );
  expect(dom.removeEventListener).toHaveBeenNthCalledWith(
    2,
    btn,
    'click',
    handler
  );
});
