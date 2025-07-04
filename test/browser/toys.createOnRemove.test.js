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
      key3: 'value3',
    };
    render = jest.fn();
    handler = createOnRemove(rows, render, keyToRemove);
  });

  it('exposes expected arity for factory and handler', () => {
    expect(createOnRemove.length).toBe(3);
    const fn = createOnRemove(rows, render, keyToRemove);
    expect(typeof fn).toBe('function');
    expect(fn.length).toBe(1);
  });

  it('returns an event handler function', () => {
    const result = createOnRemove(rows, render, keyToRemove);
    expect(typeof result).toBe('function');
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
      key3: 'value3',
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
      key3: 'value3',
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

  it('removes a key when called directly', () => {
    const localRows = { a: 1, b: 2 };
    const localRender = jest.fn();
    const evt = { preventDefault: jest.fn() };

    const fn = createOnRemove(localRows, localRender, 'a');
    expect(typeof fn).toBe('function');

    const result = fn(evt);

    expect(result).toBeUndefined();
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(localRows).toEqual({ b: 2 });
    expect(localRender).toHaveBeenCalled();
  });

  it('can be called multiple times safely', () => {
    const rowsMap = { x: 1 };
    const renderFn = jest.fn();
    const evt = { preventDefault: jest.fn() };
    const handler = createOnRemove(rowsMap, renderFn, 'x');

    handler(evt);
    handler(evt);

    expect(rowsMap).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(2);
    expect(evt.preventDefault).toHaveBeenCalledTimes(2);
  });

  it('returns undefined after removing the key', () => {
    const rowsMap = { a: 1 };
    const renderFn = jest.fn();
    const evt = { preventDefault: jest.fn() };
    const result = createOnRemove(rowsMap, renderFn, 'a')(evt);
    expect(result).toBeUndefined();
    expect(rowsMap).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('creates independent handlers for different keys', () => {
    const rowsMap = { a: '1', b: '2' };
    const renderFn = jest.fn();
    const evtA = { preventDefault: jest.fn() };
    const evtB = { preventDefault: jest.fn() };
    const handlerA = createOnRemove(rowsMap, renderFn, 'a');
    const handlerB = createOnRemove(rowsMap, renderFn, 'b');
    expect(handlerA).not.toBe(handlerB);
    handlerA(evtA);
    handlerB(evtB);
    expect(rowsMap).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(2);
    expect(evtA.preventDefault).toHaveBeenCalledTimes(1);
    expect(evtB.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('creates independent handlers when called repeatedly with same arguments', () => {
    const rowsA = { a: 1 };
    const rowsB = { a: 1 };
    const renderA = jest.fn();
    const renderB = jest.fn();
    const evtA = { preventDefault: jest.fn() };
    const evtB = { preventDefault: jest.fn() };

    const handlerA = createOnRemove(rowsA, renderA, 'a');
    const handlerB = createOnRemove(rowsB, renderB, 'a');

    expect(handlerA).not.toBe(handlerB);

    handlerA(evtA);
    handlerB(evtB);

    expect(rowsA).toEqual({});
    expect(rowsB).toEqual({});
    expect(renderA).toHaveBeenCalledTimes(1);
    expect(renderB).toHaveBeenCalledTimes(1);
    expect(evtA.preventDefault).toHaveBeenCalledTimes(1);
    expect(evtB.preventDefault).toHaveBeenCalledTimes(1);
  });
});
