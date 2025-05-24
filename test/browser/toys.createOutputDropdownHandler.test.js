import { describe, test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler', () => {
  test('should create a handler that calls handleDropdownChange with correct arguments', () => {
    // Mock dependencies
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn().mockReturnValue({ some: 'data' });
    const mockDom = { querySelector: jest.fn() };

    // Create the handler
    const handler = createOutputDropdownHandler(mockHandleDropdownChange, mockGetData, mockDom);

    // Simulate a dropdown change event
    const mockEvent = {
      currentTarget: {
        value: 'test-value',
        parentNode: 'test-parent-node'
      }
    };
    handler(mockEvent);

    // Verify handleDropdownChange was called with correct arguments
    expect(mockHandleDropdownChange).toHaveBeenCalledTimes(1);
    expect(mockHandleDropdownChange).toHaveBeenCalledWith(
      mockEvent.currentTarget,
      mockGetData,
      mockDom
    );
  });

  test('should work with different event targets', () => {
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn().mockReturnValue({});
    const mockDom = { querySelector: jest.fn() };

    const handler = createOutputDropdownHandler(mockHandleDropdownChange, mockGetData, mockDom);

    const testEvent = {
      currentTarget: {
        value: 'different-value',
        parentNode: 'different-parent'
      }
    };

    handler(testEvent);

    expect(mockHandleDropdownChange).toHaveBeenCalledWith(
      testEvent.currentTarget,
      mockGetData,
      mockDom
    );
  });

  test('should pass through the event target and dom utilities to handleDropdownChange', () => {
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn().mockReturnValue({});
    const mockDom = {
      querySelector: jest.fn(),
      someUtility: jest.fn()
    };

    const handler = createOutputDropdownHandler(mockHandleDropdownChange, mockGetData, mockDom);

    const testTarget = {
      value: 'test',
      parentNode: 'parent'
    };

    handler({ currentTarget: testTarget });

    // Verify the target and dom utilities were passed through
    expect(mockHandleDropdownChange).toHaveBeenCalledWith(
      testTarget,
      mockGetData,
      expect.objectContaining({
        someUtility: expect.any(Function),
        querySelector: expect.any(Function)
      })
    );
  });
});
