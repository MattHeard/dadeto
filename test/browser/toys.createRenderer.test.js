import { jest } from '@jest/globals';
import { createRenderer } from '../../src/browser/toys.js';

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
    const render = createRenderer(
      dom,
      disposers,
      container,
      rows,
      textInput,
      syncHiddenField
    );
    render();
    expect(syncHiddenField).toHaveBeenCalled();
  });
});
