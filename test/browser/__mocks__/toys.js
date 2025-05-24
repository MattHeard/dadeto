// Mock implementation of the toys module

export const createValueInputHandler = jest.fn((dom, keyEl, textInput, rows, syncHiddenField) => {
  return (event) => {
    const key = keyEl.value;
    const newValue = dom.getTargetValue(event);
    rows[key] = newValue;
    syncHiddenField(textInput, rows, dom);
  };
});

// Re-export the actual implementation for other functions
import * as actualToys from '../../../src/browser/toys.js';

export const {
  createKeyElement,
  createKeyInputHandler,
  createKeyValuePairEditor,
  createKeyValuePairRow,
  createValueElement,
  syncHiddenField,
  // Add other exports as needed
} = actualToys;
