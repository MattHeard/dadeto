import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createKeyInputHandler } = toys;

describe('createKeyInputHandler', () => {
  let dom;
  let keyEl;
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
      getTargetValue: jest.fn(),
      setDataAttribute: jest.fn(),
    };

    // Mock elements
    keyEl = {};
    textInput = {};

    // Initial rowData state
    rowData = { rows: { existingKey: 'value1' }, rowTypes: {} };

    // Mock sync function
    syncHiddenField = jest.fn();

    // Create the handler
    handler = createKeyInputHandler({
      dom,
      textInput,
      rowData,
      syncHiddenField,
    });

    // Mock event
    event = { target: keyEl, currentTarget: keyEl };
  });

  it('should sync hidden field when key does not change', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('existingKey');
    dom.getTargetValue.mockReturnValue('existingKey');

    // Act
    handler(event);

    // Assert
    expect(dom.getCurrentTarget).toHaveBeenCalledWith(event);
    expect(dom.getDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey');
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
  });

  it('should read previous key from the prevKey attribute', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('anyKey');
    dom.getTargetValue.mockReturnValue('anyKey');

    // Act
    handler(event);

    // Assert
    expect(dom.getDataAttribute).toHaveBeenCalledTimes(1);
    expect(dom.getDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey');
  });

  it('should update rows with new key when key is unique and non-empty', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('oldKey');
    dom.getTargetValue.mockReturnValue('newKey');
    rowData.rows.oldKey = 'someValue';
    rowData.rowTypes.oldKey = 'number';

    // Act
    handler(event);

    // Assert
    expect(dom.getDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey');
    expect(rowData.rows).toEqual({
      existingKey: 'value1',
      oldKey: undefined, // Should be deleted
      newKey: 'someValue', // New key with old value
    });
    expect(rowData.rowTypes).toEqual({ newKey: 'number' });
    expect(dom.setDataAttribute).toHaveBeenCalledWith(
      keyEl,
      'prevKey',
      'newKey'
    );
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it('uses the listener currentTarget when the event target differs', () => {
    const descendant = {};
    const listenerEvent = { target: descendant, currentTarget: keyEl };
    dom.getDataAttribute.mockReturnValue('same');
    dom.getTargetValue.mockReturnValue('same');

    handler(listenerEvent);

    expect(dom.getDataAttribute).toHaveBeenCalledWith(keyEl, 'prevKey');
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it('should not update rows when new key is empty', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('oldKey');
    dom.getTargetValue.mockReturnValue('');
    rowData.rows.oldKey = 'someValue';
    rowData.rowTypes.oldKey = 'boolean';

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({
      existingKey: 'value1',
      oldKey: 'someValue',
    }); // No change
    expect(rowData.rowTypes).toEqual({ oldKey: 'boolean' });
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });

  it('should not update rows when new key already exists', () => {
    // Arrange
    dom.getDataAttribute.mockReturnValue('key1');
    dom.getTargetValue.mockReturnValue('existingKey');
    const testRowData = {
      rows: {
        key1: 'value1',
        existingKey: 'value2',
      },
      rowTypes: { key1: 'number', existingKey: 'boolean' },
    };

    // Recreate handler with testRowData
    const localHandler = createKeyInputHandler({
      dom,
      textInput,
      rowData: testRowData,
      syncHiddenField,
    });

    // Act
    localHandler(event);

    // Assert
    expect(testRowData.rows).toEqual({
      key1: 'value1',
      existingKey: 'value2',
    }); // No change
    expect(testRowData.rowTypes).toEqual({
      key1: 'number',
      existingKey: 'boolean',
    });
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, testRowData, dom);
  });

  it('should ignore unchanged keys that are missing from rows', () => {
    // Arrange
    rowData = { rows: {}, rowTypes: {} };
    handler = createKeyInputHandler({
      dom,
      textInput,
      rowData,
      syncHiddenField,
    });
    dom.getDataAttribute.mockReturnValue('missingKey');
    dom.getTargetValue.mockReturnValue('missingKey');

    // Act
    handler(event);

    // Assert
    expect(rowData.rows).toEqual({});
    expect(dom.setDataAttribute).not.toHaveBeenCalled();
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, dom);
  });
});
