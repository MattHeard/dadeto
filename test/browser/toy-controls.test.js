import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { enableInteractiveControls } from '../../src/browser/toy-controls.js'; // Adjust path as needed

describe('enableInteractiveControls', () => {
  let inputElement;
  let submitButton;
  let outputElement;
  let parentElement;
  let mockParentClassList;

  beforeEach(() => {
    // Mock input element
    inputElement = { disabled: true };

    // Mock submit button
    submitButton = { disabled: true };

    // Mock parent element with classList mock
    mockParentClassList = {
      containsWarning: true, // Simple state to track the class
      add: jest.fn(), // Not strictly needed for this test, but good practice
      remove: jest.fn((className) => {
        if (className === 'warning') {
          mockParentClassList.containsWarning = false;
        }
      }),
      contains: jest.fn((className) => {
        return className === 'warning' && mockParentClassList.containsWarning;
      })
    };
    parentElement = { 
      classList: mockParentClassList,
      appendChild: jest.fn() // Not needed, but completes the mock
    };

    // Mock output element and link its parent
    outputElement = { 
      textContent: '',
      parentElement: parentElement
    };
    
  });

  it('enables input and submit button', () => {
    enableInteractiveControls(inputElement, submitButton, outputElement);
    expect(inputElement.disabled).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('sets output textContent to "Ready for input"', () => {
    enableInteractiveControls(inputElement, submitButton, outputElement);
    expect(outputElement.textContent).toBe('Ready for input');
  });

  it('removes "warning" class from parent element', () => {
    // Check initial state using the mock
    expect(parentElement.classList.contains('warning')).toBe(true);
    enableInteractiveControls(inputElement, submitButton, outputElement);
    // Check that remove was called
    expect(parentElement.classList.remove).toHaveBeenCalledWith('warning');
    // Check final state using the mock
    expect(parentElement.classList.contains('warning')).toBe(false);
  });
});
