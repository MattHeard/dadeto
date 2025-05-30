import { jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove', () => {
  let rows;
  let render;
  let handler;
  let mockEvent;
  const keyToRemove = 'key1';

  beforeEach(() => {
    mockEvent = { preventDefault: jest.fn() };
  });

  // Initialize test data before each test
  beforeEach(() => {
    rows = {
      [keyToRemove]: 'value1',
      key2: 'value2',
      key3: 'value3'
    };
    render = jest.fn();
    handler = createOnRemove(rows, render, keyToRemove);
  });

  it('removes the specified key from the rows object', () => {
    // Verify the key exists initially
    expect(rows).toHaveProperty(keyToRemove);

    // Call the handler with the mock event
    handler(mockEvent);

    // The key should be removed
    expect(rows).not.toHaveProperty(keyToRemove);
    expect(rows).toEqual({
      key2: 'value2',
      key3: 'value3'
    });
  });

  it('calls preventDefault on the event', () => {
    // Call the handler with the mock event
    handler(mockEvent);

    // Should prevent default behavior
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('calls the render function after removing the key', () => {
    // Call the handler with the mock event
    handler(mockEvent);

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does nothing if the key does not exist', () => {
    const nonExistentKey = 'nonExistent';
    const handlerForNonExistent = createOnRemove(rows, render, nonExistentKey);

    // Call the handler with the mock event
    handlerForNonExistent(mockEvent);

    // Should not modify the rows object
    expect(rows).toEqual({
      [keyToRemove]: 'value1',
      key2: 'value2',
      key3: 'value3'
    });

    // Should still call preventDefault and render
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('works with empty rows object', () => {
    const emptyRows = {};
    const emptyHandler = createOnRemove(emptyRows, render, 'anyKey');

    // Call the handler with the mock event
    emptyHandler(mockEvent);

    // Should not throw and should call preventDefault and render
    expect(emptyRows).toEqual({});
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('can remove the last remaining key', () => {
    const singleRow = { lastKey: 'lastValue' };
    const singleHandler = createOnRemove(singleRow, render, 'lastKey');

    // Call the handler with the mock event
    singleHandler(mockEvent);

    // Should remove the last key
    expect(singleRow).toEqual({});
    expect(render).toHaveBeenCalledTimes(1);
  });
});
