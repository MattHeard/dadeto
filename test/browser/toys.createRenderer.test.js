import { jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createRenderer } = toys;

describe('createRenderer', () => {
  it('should create a renderer function', () => {
    // Test case without assertions to verify the function can be called
    const removeAllChildren = jest.fn();
    const createElement = jest.fn();
    const setClassName = jest.fn();
    const setType = jest.fn();
    const setPlaceholder = jest.fn();
    const setValue = jest.fn();
    const setDataAttribute = jest.fn();
    const addEventListener = jest.fn();
    const setTextContent = jest.fn();
    const appendChild = jest.fn();
    const dom = {
      removeAllChildren,
      createElement,
      setClassName,
      setType,
      setPlaceholder,
      setValue,
      setDataAttribute,
      addEventListener,
      setTextContent,
      appendChild,
    };
    const disposers = [];
    const container = undefined;
    const rows = { foo: 'bar' };
    const textInput = undefined;
    const syncHiddenField = jest.fn();
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      textInput,
      syncHiddenField,
    });
    render();
    expect(syncHiddenField).toHaveBeenCalled();
  });

  it('adds an empty row when no rows exist', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn(),
      setClassName: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
    };
    const disposers = [];
    const container = {};
    const rows = {};
    const textInput = {};
    const syncHiddenField = jest.fn();
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      textInput,
      syncHiddenField,
    });
    render();
    expect(rows).toEqual({ '': '' });
  });

  it('does not add an empty row when rows already contain values', () => {
    const dom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn(),
      setClassName: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
    };
    const disposers = [];
    const container = {};
    const rows = { existing: 'val' };
    const textInput = {};
    const syncHiddenField = jest.fn();
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      textInput,
      syncHiddenField,
    });
    render();
    expect(rows).toEqual({ existing: 'val' });
  });
});
