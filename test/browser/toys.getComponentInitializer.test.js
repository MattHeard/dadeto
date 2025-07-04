import { describe, test, expect, jest } from '@jest/globals';
import { getComponentInitializer } from '../../src/browser/toys.js';

describe('getComponentInitializer', () => {
  test('returns a function that initializes a component', () => {
    // Mock dependencies
    const mockGetElement = jest.fn().mockImplementation(id => ({
      id,
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
    }));

    const mockLogWarning = jest.fn();

    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockCreateIntersectionObserver = jest
      .fn()
      .mockReturnValue(mockObserver);

    // Create the initializer function
    const initializeComponent = getComponentInitializer(
      mockGetElement,
      mockLogWarning,
      mockCreateIntersectionObserver
    );

    // Define a test component
    const testComponent = {
      id: 'test-component',
      modulePath: '/path/to/module.js',
      functionName: 'initFunction',
    };

    // Call the initializer
    initializeComponent(testComponent);

    // Verify the element was retrieved
    expect(mockGetElement).toHaveBeenCalledWith('test-component');

    // Verify the observer was created and started observing
    expect(mockCreateIntersectionObserver).toHaveBeenCalled();
    expect(mockObserver.observe).toHaveBeenCalled();

    // No warnings should be logged
    expect(mockLogWarning).not.toHaveBeenCalled();
  });

  test('logs a warning if the element is not found', () => {
    // Mock dependencies
    const mockGetElement = jest.fn().mockReturnValue(null);
    const mockLogWarning = jest.fn();
    const mockCreateIntersectionObserver = jest.fn();

    // Create the initializer function
    const initializeComponent = getComponentInitializer(
      mockGetElement,
      mockLogWarning,
      mockCreateIntersectionObserver
    );

    // Define a test component with non-existent ID
    const testComponent = {
      id: 'non-existent-component',
      modulePath: '/path/to/module.js',
      functionName: 'initFunction',
    };

    // Call the initializer
    initializeComponent(testComponent);

    // Verify the element was attempted to be retrieved
    expect(mockGetElement).toHaveBeenCalledWith('non-existent-component');

    // Verify a warning was logged
    expect(mockLogWarning).toHaveBeenCalledWith(
      'Could not find article element with ID: non-existent-component for component initialization.'
    );

    // No observer should be created
    expect(mockCreateIntersectionObserver).not.toHaveBeenCalled();
  });

  test('passes the correct parameters to createIntersectionObserver', () => {
    // Mock dependencies
    const mockArticle = {
      id: 'test-article',
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
    };

    const mockGetElement = jest.fn().mockReturnValue(mockArticle);
    const mockLogWarning = jest.fn();
    const mockCreateIntersectionObserver = jest.fn().mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });

    // Create the initializer function
    const initializeComponent = getComponentInitializer(
      mockGetElement,
      mockLogWarning,
      mockCreateIntersectionObserver
    );

    // Define a test component
    const testComponent = {
      id: 'test-article',
      modulePath: '/path/to/specific/module.js',
      functionName: 'specificInitFunction',
    };

    // Call the initializer
    initializeComponent(testComponent);

    // Verify the observer was created with the correct parameters
    expect(mockCreateIntersectionObserver).toHaveBeenCalledWith(
      mockArticle,
      '/path/to/specific/module.js',
      'specificInitFunction'
    );
  });
});
