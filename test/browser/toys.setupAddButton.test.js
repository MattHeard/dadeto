import { jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

describe('setupAddButton', () => {
  let mockDom;
  let button;
  let rows;
  let render;
  let disposers;

  beforeEach(() => {
    // Reset mocks and test data before each test
    mockDom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    button = {};
    rows = {};
    render = jest.fn();
    disposers = [];
  });

  it('sets the button text content to "+"', () => {
    setupAddButton({ dom: mockDom, button, rows, render, disposers });

    expect(mockDom.setTextContent).toHaveBeenCalledWith(button, '+');
  });

  it('clicking the button adds a new empty row and calls render', () => {
    // Mock the addEventListener implementation to capture the click handler
    let clickHandler;
    mockDom.addEventListener.mockImplementation((_, eventType, handler) => {
      if (eventType === 'click') {
        clickHandler = handler;
      }
    });

    setupAddButton({ dom: mockDom, button, rows, render, disposers });

    // Simulate button click
    clickHandler();

    // Should add a new empty row
    expect(rows).toHaveProperty('');
    expect(rows['']).toBe('');

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not add a new empty row if one already exists', () => {
    // Add an existing empty row
    rows[''] = 'existing';

    // Mock the addEventListener implementation to capture the click handler
    let clickHandler;
    mockDom.addEventListener.mockImplementation((_, eventType, handler) => {
      if (eventType === 'click') {
        clickHandler = handler;
      }
    });

    setupAddButton({ dom: mockDom, button, rows, render, disposers });

    // Simulate button click
    clickHandler();

    // Should not modify the rows object
    expect(rows).toEqual({ '': 'existing' });

    // Should not call render
    expect(render).not.toHaveBeenCalled();
  });

  it('returns a unique disposer for each setup call', () => {
    setupAddButton({ dom: mockDom, button, rows, render, disposers });
    const firstCleanup = disposers[0];

    setupAddButton({ dom: mockDom, button: {}, rows, render, disposers });
    const secondCleanup = disposers[1];

    expect(firstCleanup).not.toBe(secondCleanup);

    firstCleanup();
    secondCleanup();

    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
