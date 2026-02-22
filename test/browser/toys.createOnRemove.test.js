import { jest } from '@jest/globals';
import { createOnRemove } from '../../src/browser/toys.js';

describe('createOnRemove', () => {
  let rowData;
  let render;
  let handler;
  let mockEvent;
  const keyToRemove = 'key1';

  beforeEach(() => {
    mockEvent = { preventDefault: jest.fn() };
  });

  // Initialize test data before each test
  beforeEach(() => {
    rowData = {
      rows: {
        [keyToRemove]: 'value1',
        key2: 'value2',
        key3: 'value3',
      },
      rowTypes: {
        [keyToRemove]: 'string',
        key2: 'number',
        key3: 'boolean',
      },
    };
    render = jest.fn();
    handler = createOnRemove(rowData, render, keyToRemove);
  });

  it('exposes expected arity for factory and handler', () => {
    expect(createOnRemove.length).toBe(3);
    const fn = createOnRemove(rowData, render, keyToRemove);
    expect(typeof fn).toBe('function');
    expect(fn.length).toBe(1);
  });

  it('returns an event handler function', () => {
    const result = createOnRemove(rowData, render, keyToRemove);
    expect(typeof result).toBe('function');
  });

  it('removes the specified key from the rows object', () => {
    // Verify the key exists initially
    expect(rowData.rows).toHaveProperty(keyToRemove);

    // Call the handler with the mock event
    handler(mockEvent);

    // The key should be removed
    expect(rowData.rows).not.toHaveProperty(keyToRemove);
    expect(rowData.rows).toEqual({
      key2: 'value2',
      key3: 'value3',
    });
  });

  it('removes the specified key from rowTypes', () => {
    handler(mockEvent);
    expect(rowData.rowTypes).not.toHaveProperty(keyToRemove);
    expect(rowData.rowTypes).toEqual({ key2: 'number', key3: 'boolean' });
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
    const handlerForNonExistent = createOnRemove(
      rowData,
      render,
      nonExistentKey
    );

    // Call the handler with the mock event
    handlerForNonExistent(mockEvent);

    // Should not modify the rows object
    expect(rowData.rows).toEqual({
      [keyToRemove]: 'value1',
      key2: 'value2',
      key3: 'value3',
    });

    // Should still call preventDefault and render
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('works with empty rows object', () => {
    const emptyRowData = { rows: {}, rowTypes: {} };
    const emptyHandler = createOnRemove(
      emptyRowData,
      render,
      'anyKey'
    );

    // Call the handler with the mock event
    emptyHandler(mockEvent);

    // Should not throw and should call preventDefault and render
    expect(emptyRowData.rows).toEqual({});
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('can remove the last remaining key', () => {
    const singleRowData = { rows: { lastKey: 'lastValue' }, rowTypes: { lastKey: 'string' } };
    const singleHandler = createOnRemove(
      singleRowData,
      render,
      'lastKey'
    );

    // Call the handler with the mock event
    singleHandler(mockEvent);

    // Should remove the last key
    expect(singleRowData.rows).toEqual({});
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('removes a key when called directly', () => {
    const localRowData = { rows: { a: 1, b: 2 }, rowTypes: { a: 'number', b: 'number' } };
    const localRender = jest.fn();
    const evt = { preventDefault: jest.fn() };

    const fn = createOnRemove(localRowData, localRender, 'a');
    expect(typeof fn).toBe('function');

    const result = fn(evt);

    expect(result).toBeUndefined();
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(localRowData.rows).toEqual({ b: 2 });
    expect(localRender).toHaveBeenCalled();
  });

  it('can be called multiple times safely', () => {
    const multiRowData = { rows: { x: 1 }, rowTypes: { x: 'number' } };
    const renderFn = jest.fn();
    const evt = { preventDefault: jest.fn() };
    const fn = createOnRemove(multiRowData, renderFn, 'x');

    fn(evt);
    fn(evt);

    expect(multiRowData.rows).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(2);
    expect(evt.preventDefault).toHaveBeenCalledTimes(2);
  });

  it('returns undefined after removing the key', () => {
    const rowDataMap = { rows: { a: 1 }, rowTypes: { a: 'string' } };
    const renderFn = jest.fn();
    const evt = { preventDefault: jest.fn() };
    const result = createOnRemove(rowDataMap, renderFn, 'a')(evt);
    expect(result).toBeUndefined();
    expect(rowDataMap.rows).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('creates independent handlers for different keys', () => {
    const rowDataMap = { rows: { a: '1', b: '2' }, rowTypes: { a: 'string', b: 'string' } };
    const renderFn = jest.fn();
    const evtA = { preventDefault: jest.fn() };
    const evtB = { preventDefault: jest.fn() };
    const handlerA = createOnRemove(rowDataMap, renderFn, 'a');
    const handlerB = createOnRemove(rowDataMap, renderFn, 'b');
    expect(handlerA).not.toBe(handlerB);
    handlerA(evtA);
    handlerB(evtB);
    expect(rowDataMap.rows).toEqual({});
    expect(renderFn).toHaveBeenCalledTimes(2);
    expect(evtA.preventDefault).toHaveBeenCalledTimes(1);
    expect(evtB.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('creates independent handlers when called repeatedly with same arguments', () => {
    const rowDataA = { rows: { a: 1 }, rowTypes: { a: 'string' } };
    const rowDataB = { rows: { a: 1 }, rowTypes: { a: 'string' } };
    const renderA = jest.fn();
    const renderB = jest.fn();
    const evtA = { preventDefault: jest.fn() };
    const evtB = { preventDefault: jest.fn() };

    const handlerA = createOnRemove(rowDataA, renderA, 'a');
    const handlerB = createOnRemove(rowDataB, renderB, 'a');

    expect(handlerA).not.toBe(handlerB);

    handlerA(evtA);
    handlerB(evtB);

    expect(rowDataA.rows).toEqual({});
    expect(rowDataB.rows).toEqual({});
    expect(renderA).toHaveBeenCalledTimes(1);
    expect(renderB).toHaveBeenCalledTimes(1);
    expect(evtA.preventDefault).toHaveBeenCalledTimes(1);
    expect(evtB.preventDefault).toHaveBeenCalledTimes(1);
  });
});
