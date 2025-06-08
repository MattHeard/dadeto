import { describe, test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler', () => {
  test('returns a function when invoked', () => {
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn();
    const mockDom = {};

    const handler = createOutputDropdownHandler(
      mockHandleDropdownChange,
      mockGetData,
      mockDom
    );

    expect(typeof handler).toBe('function');
  });

  test('should create a handler that calls handleDropdownChange with correct arguments', () => {
    // Mock dependencies
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn().mockReturnValue({ some: 'data' });
    const mockDom = { querySelector: jest.fn() };

    // Create the handler
    const handler = createOutputDropdownHandler(
      mockHandleDropdownChange,
      mockGetData,
      mockDom
    );

    // Simulate a dropdown change event
    const mockEvent = {
      currentTarget: {
        value: 'test-value',
        parentNode: 'test-parent-node',
      },
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

  test('returns a function that accepts an event object', () => {
    const handler = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
  });

  test('should work with different event targets', () => {
    const mockHandleDropdownChange = jest.fn();
    const mockGetData = jest.fn().mockReturnValue({});
    const mockDom = { querySelector: jest.fn() };

    const handler = createOutputDropdownHandler(
      mockHandleDropdownChange,
      mockGetData,
      mockDom
    );

    const testEvent = {
      currentTarget: {
        value: 'different-value',
        parentNode: 'different-parent',
      },
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
      someUtility: jest.fn(),
    };

    const handler = createOutputDropdownHandler(
      mockHandleDropdownChange,
      mockGetData,
      mockDom
    );

    const testTarget = {
      value: 'test',
      parentNode: 'parent',
    };

    handler({ currentTarget: testTarget });

    // Verify the target and dom utilities were passed through
    expect(mockHandleDropdownChange).toHaveBeenCalledWith(
      testTarget,
      mockGetData,
      expect.objectContaining({
        someUtility: expect.any(Function),
        querySelector: expect.any(Function),
      })
    );
  });

  test('returns the value from handleDropdownChange', () => {
    const expected = 'result';
    const mockHandleDropdownChange = jest.fn().mockReturnValue(expected);
    const mockGetData = jest.fn();
    const handler = createOutputDropdownHandler(
      mockHandleDropdownChange,
      mockGetData,
      {}
    );

    const result = handler({ currentTarget: {} });
    expect(result).toBe(expected);
  });

  test('returns a new handler instance on each call', () => {
    const handler1 = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    const handler2 = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    expect(handler1).not.toBe(handler2);
  });

  test('expects three arguments and returns a unary function', () => {
    const handler = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    expect(createOutputDropdownHandler.length).toBe(3);
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
  });

  test('returns a new handler instance on each invocation', () => {
    const handler1 = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    const handler2 = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
    expect(handler1).not.toBe(handler2);
  });

  test('each returned handler calls its own dropdown change function', () => {
    const handle1 = jest.fn();
    const handle2 = jest.fn();
    const getData = jest.fn();
    const dom = {};

    const event1 = { currentTarget: { value: 'a' } };
    const event2 = { currentTarget: { value: 'b' } };

    const handler1 = createOutputDropdownHandler(handle1, getData, dom);
    const handler2 = createOutputDropdownHandler(handle2, getData, dom);

    handler1(event1);
    handler2(event2);

    expect(handle1).toHaveBeenCalledWith(event1.currentTarget, getData, dom);
    expect(handle2).toHaveBeenCalledWith(event2.currentTarget, getData, dom);
    expect(handle1).toHaveBeenCalledTimes(1);
    expect(handle2).toHaveBeenCalledTimes(1);
  });
});
