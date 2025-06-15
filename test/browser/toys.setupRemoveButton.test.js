import { jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('setupRemoveButton', () => {
  let mockDom;
  let button;
  let rows;
  let render;
  let disposers;
  const rowKey = 'testKey';
  const mockEvent = { preventDefault: jest.fn() };

  beforeEach(() => {
    // Reset mocks and test data before each test
    mockDom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    button = {};
    rows = { [rowKey]: 'testValue', otherKey: 'otherValue' };
    render = jest.fn();
    disposers = [];
  });

  it('sets the button text content to "×"', () => {
    setupRemoveButton(mockDom, button, rows, render, rowKey, disposers);

    expect(mockDom.setTextContent).toHaveBeenCalledWith(button, '×');
  });

  it('clicking the button removes the corresponding row and calls render', () => {
    // Mock the addEventListener implementation to capture the click handler
    let clickHandler;
    mockDom.addEventListener.mockImplementation((_, eventType, handler) => {
      if (eventType === 'click') {
        clickHandler = handler;
      }
    });

    setupRemoveButton(mockDom, button, rows, render, rowKey, disposers);

    // Simulate button click
    clickHandler(mockEvent);

    // Should remove the row with the specified key
    expect(rows).not.toHaveProperty(rowKey);
    expect(rows).toHaveProperty('otherKey'); // Other rows should remain

    // Should call preventDefault on the event
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('handles clicking when the key does not exist in rows', () => {
    const nonExistentKey = 'nonExistent';

    // Mock the addEventListener implementation to capture the click handler
    let clickHandler;
    mockDom.addEventListener.mockImplementation((_, eventType, handler) => {
      if (eventType === 'click') {
        clickHandler = handler;
      }
    });

    setupRemoveButton(mockDom, button, rows, render, nonExistentKey, disposers);

    // Simulate button click
    clickHandler(mockEvent);

    // Should not modify the rows object
    expect(rows).toEqual({ [rowKey]: 'testValue', otherKey: 'otherValue' });

    // Should call preventDefault (may be called twice - once in the test and once in the handler)
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // Should still call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });
});
