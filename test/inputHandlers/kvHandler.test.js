import { describe, test, expect, jest } from '@jest/globals';
import {
  maybeRemoveDendrite,
  maybeRemoveNumber,
  maybeRemoveTextarea,
} from '../../src/core/browser/browser-core.js';

// kvHandler relies on ensureKeyValueInput which is complex to mock in ES modules.
// These tests focus on the removable helper functions to achieve full branch coverage.

describe('kv input handlers', () => {
  test('maybeRemoveNumber removes existing number input', () => {
    const numberInput = { _dispose: jest.fn() };
    const dom = {
      querySelector: jest.fn(() => numberInput),
      removeChild: jest.fn(),
    };

    maybeRemoveNumber({}, dom);

    expect(numberInput._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, numberInput);
  });

  test('maybeRemoveNumber does nothing when element missing', () => {
    const dom = {
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };

    maybeRemoveNumber({}, dom);

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('maybeRemoveDendrite removes existing form', () => {
    const dendriteForm = { _dispose: jest.fn() };
    const dom = {
      querySelector: jest.fn(() => dendriteForm),
      removeChild: jest.fn(),
    };

    maybeRemoveDendrite({}, dom);

    expect(dendriteForm._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, dendriteForm);
  });

  test('maybeRemoveDendrite does nothing when element missing', () => {
    const dom = {
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };

    maybeRemoveDendrite({}, dom);

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('maybeRemoveNumber ignores element without dispose', () => {
    const numberInput = {};
    const dom = {
      querySelector: jest.fn(() => numberInput),
      removeChild: jest.fn(),
    };

    maybeRemoveNumber({}, dom);

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('maybeRemoveDendrite ignores element without dispose', () => {
    const dendriteForm = {};
    const dom = {
      querySelector: jest.fn(() => dendriteForm),
      removeChild: jest.fn(),
    };

    maybeRemoveDendrite({}, dom);

    expect(dom.removeChild).not.toHaveBeenCalled();
  });

  test('maybeRemoveDendrite queries for the dendrite form selector', () => {
    const dom = {
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };

    maybeRemoveDendrite({}, dom);

    expect(dom.querySelector).toHaveBeenCalledWith({}, '.dendrite-form');
  });

  test('maybeRemoveTextarea removes existing textarea', () => {
    const textarea = { _dispose: jest.fn() };
    const dom = {
      querySelector: jest.fn(() => textarea),
      removeChild: jest.fn(),
    };

    maybeRemoveTextarea({}, dom);

    expect(textarea._dispose).toHaveBeenCalled();
    expect(dom.removeChild).toHaveBeenCalledWith({}, textarea);
  });

  test('maybeRemoveTextarea does nothing when textarea missing', () => {
    const dom = {
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };

    maybeRemoveTextarea({}, dom);

    expect(dom.removeChild).not.toHaveBeenCalled();
  });
});
