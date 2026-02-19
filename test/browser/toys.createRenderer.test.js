import { jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createRenderer } = toys;

const makeDom = () => ({
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
  addClass: jest.fn(),
  hide: jest.fn(),
});

describe('createRenderer', () => {
  it('should create a renderer function', () => {
    const dom = makeDom();
    const disposers = [];
    const container = undefined;
    const rows = { foo: 'bar' };
    const textInput = undefined;
    const syncHiddenField = jest.fn();
    const rowTypes = {};
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      rowTypes,
      textInput,
      syncHiddenField,
    });
    render();
    expect(syncHiddenField).toHaveBeenCalled();
  });

  it('adds an empty row when no rows exist', () => {
    const dom = makeDom();
    const disposers = [];
    const container = {};
    const rows = {};
    const textInput = {};
    const syncHiddenField = jest.fn();
    const rowTypes = {};
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      rowTypes,
      textInput,
      syncHiddenField,
    });
    render();
    expect(rows).toEqual({ '': '' });
  });

  it('does not add an empty row when rows already contain values', () => {
    const dom = makeDom();
    const disposers = [];
    const container = {};
    const rows = { existing: 'val' };
    const textInput = {};
    const syncHiddenField = jest.fn();
    const rowTypes = {};
    const render = createRenderer({
      dom,
      disposersArray: disposers,
      container,
      rows,
      rowTypes,
      textInput,
      syncHiddenField,
    });
    render();
    expect(rows).toEqual({ existing: 'val' });
  });
});
