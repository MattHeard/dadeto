import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createValueInputHandler } = toys;

describe('createValueInputHandler', () => {
  let dom;
  let valueEl;
  let textInput;
  let rowData;
  let syncHiddenField;
  let handler;
  let event;

  beforeEach(() => {
    // Mock DOM utilities
    dom = {
      getDataAttribute: jest.fn(),
      getCurrentTarget: jest.fn(inputEvent => inputEvent.currentTarget),
      getTargetValue: jest.fn(() => 'newValue'),
    };

    // Mock elements
    valueEl = {};
    textInput = {};

    // Initial rowData state
    rowData = {
      rows: {
        existingKey: 'oldValue',
        anotherKey: 'anotherValue',
      },
      rowTypes: {},
    };

    // Mock sync function
    syncHiddenField = jest.fn();

    // Create the handler
    handler = createValueInputHandler({
      dom,
      textInput,
      rowData,
      syncHiddenField,
    });

    // Mock event
    event = { target: { value: 'newValue' }, currentTarget: valueEl };
  });

  it('should update the value for an existing key and sync hidden field', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('existingKey');
    dom.getTargetValue.mockReturnValue('newValue');

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({
      existingKey: 'newValue',
      anotherKey: 'anotherValue',
    });
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it('should handle updating a different key', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('anotherKey');
    dom.getTargetValue.mockReturnValue('updatedAnotherValue');
    event.target.value = 'updatedAnotherValue';

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({
      existingKey: 'oldValue',
      anotherKey: 'updatedAnotherValue',
    });
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it('should handle empty string values', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('existingKey');
    dom.getTargetValue.mockReturnValue('');
    event.target.value = '';

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({
      existingKey: '',
      anotherKey: 'anotherValue',
    });
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it("calls getDataAttribute with 'prevKey'", () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('existingKey');

    // Act
    handler(event);

    // Assert
    expect(dom.getCurrentTarget).toHaveBeenCalledWith(event);
    expect(dom.getDataAttribute).toHaveBeenCalledWith(valueEl, 'prevKey');
  });

  it('should update the value even if the key is not in rows', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('nonExistentKey');
    dom.getTargetValue.mockReturnValue('newValue');

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({
      existingKey: 'oldValue',
      anotherKey: 'anotherValue',
      nonExistentKey: 'newValue',
    });
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });
});
