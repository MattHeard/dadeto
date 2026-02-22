import { jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

describe('setupAddButton', () => {
  let mockDom;
  let button;
  let rowData;
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
    rowData = { rows: {}, rowTypes: {} };
    render = jest.fn();
    disposers = [];
  });

  it('sets the button text content to "+"', () => {
    setupAddButton({ dom: mockDom, button, rowData, render, disposers });

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

    setupAddButton({ dom: mockDom, button, rowData, render, disposers });

    // Simulate button click
    clickHandler();

    // Should add a new empty row
    expect(rowData.rows).toHaveProperty('');
    expect(rowData.rows['']).toBe('');

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not add a new empty row if one already exists', () => {
    // Add an existing empty row
    rowData.rows[''] = 'existing';

    // Mock the addEventListener implementation to capture the click handler
    let clickHandler;
    mockDom.addEventListener.mockImplementation((_, eventType, handler) => {
      if (eventType === 'click') {
        clickHandler = handler;
      }
    });

    setupAddButton({ dom: mockDom, button, rowData, render, disposers });

    // Simulate button click
    clickHandler();

    // Should not modify the rows object
    expect(rowData.rows).toEqual({ '': 'existing' });

    // Should not call render
    expect(render).not.toHaveBeenCalled();
  });

  it('returns a unique disposer for each setup call', () => {
    setupAddButton({ dom: mockDom, button, rowData, render, disposers });
    const firstCleanup = disposers[0];

    setupAddButton({ dom: mockDom, button: {}, rowData, render, disposers });
    const secondCleanup = disposers[1];

    expect(firstCleanup).not.toBe(secondCleanup);

    firstCleanup();
    secondCleanup();

    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
