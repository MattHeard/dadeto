/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createKeyInputHandler } = toys;

describe('createKeyInputHandler', () => {
  let dom;
  let keyEl;
  let textInput;
  let rows;
  let syncHiddenField;
  let handler;
  let event;

  beforeEach(() => {
    // Mock DOM utilities
    dom = {
      getDataAttribute: jest.fn(),
      getTargetValue: jest.fn(),
      setDataAttribute: jest.fn()
    };

    // Mock elements
    keyEl = document.createElement('input');
    textInput = document.createElement('input');

    // Initial rows state
    rows = { existingKey: 'value1' };

    // Mock sync function
    syncHiddenField = jest.fn();

    // Create the handler
    handler = createKeyInputHandler(dom, keyEl, textInput, rows, syncHiddenField);

    // Mock event
    event = { target: keyEl };
  });

  it('should sync hidden field when key does not change', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('existingKey');
    dom.getTargetValue.mockReturnValue('existingKey');

    // Act
    handler(event);

    // Assert
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
  });

  it('should update rows with new key when key is unique and non-empty', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('oldKey');
    dom.getTargetValue.mockReturnValue('newKey');
    rows.oldKey = 'someValue';

    // Act
    handler(event);

    // Assert
    expect(rows).toEqual({
      existingKey: 'value1',
      oldKey: undefined, // Should be deleted
      newKey: 'someValue' // New key with old value
    });
    expect(dom.setDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey', 'newKey');
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
  });

  it('should not update rows when new key is empty', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('oldKey');
    dom.getTargetValue.mockReturnValue('');
    rows.oldKey = 'someValue';

    // Act
    handler(event);

    // Assert
    expect(rows).toEqual({
      existingKey: 'value1',
      oldKey: 'someValue'
    }); // No change
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, dom);
  });

  it('should not update rows when new key already exists', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('key1');
    dom.getTargetValue.mockReturnValue('existingKey');
    const testRows = {
      key1: 'value1',
      existingKey: 'value2'
    };

    // Recreate handler with testRows
    const localHandler = createKeyInputHandler(dom, keyEl, textInput, testRows, syncHiddenField);

    // Act
    localHandler(event);

    // Assert
    expect(testRows).toEqual({
      key1: 'value1',
      existingKey: 'value2'
    }); // No change
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, testRows, dom);
  });
});
