import { jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createValueElement', () => {
  let mockDom;
  let valueEl;
  let onValue;
  let disposers;

  beforeEach(() => {
    // Set up mock DOM utilities
    mockDom = {
      createElement: jest.fn().mockReturnValue({}),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    onValue = jest.fn();
    disposers = [];
  });

  it('creates a value input element with the correct initial properties', () => {
    const initialValue = 'testValue';

    valueEl = createValueElement({
      dom: mockDom,
      value: initialValue,
      onValue,
      disposers,
    });

    // Verify element creation
    expect(mockDom.createElement).toHaveBeenCalledWith('input');

    // Verify element properties
    expect(mockDom.setType).toHaveBeenCalledWith(valueEl, 'text');
    expect(mockDom.setPlaceholder).toHaveBeenCalledWith(valueEl, 'Value');
    expect(mockDom.setValue).toHaveBeenCalledWith(valueEl, initialValue);
    // Verify event listener was added
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      valueEl,
      'input',
      onValue
    );

    // Verify disposer was added
    expect(disposers).toHaveLength(1);
    expect(disposers[0]).toBeInstanceOf(Function);
  });

  it('registers the supplied value handler', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'initialValue',
      onValue,
      disposers,
    });

    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      valueEl,
      'input',
      onValue
    );
  });

  it('cleans up event listeners when disposer is called', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'testValue',
      onValue,
      disposers,
    });

    // Get the disposer function
    const disposer = disposers[0];

    // Call the disposer
    disposer();

    // Verify removeEventListener was called with the correct arguments
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      valueEl,
      'input',
      expect.any(Function)
    );
  });

  it('uses the same handler for add and remove listener', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'testValue',
      onValue,
      disposers,
    });

    // Capture the handler passed to addEventListener
    const [el, eventName, handler] = mockDom.addEventListener.mock.calls[0];

    // Call the disposer returned from createValueElement
    const disposer = disposers[0];
    disposer();

    // Ensure removeEventListener was called with the same handler
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      el,
      eventName,
      handler
    );
  });

  it('cleanup can be called multiple times', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'multi',
      onValue,
      disposers,
    });

    const disposer = disposers[0];
    disposer();
    disposer();

    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
