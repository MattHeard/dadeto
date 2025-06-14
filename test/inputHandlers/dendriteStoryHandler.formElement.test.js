import { dendriteStoryHandler } from '../../src/inputHandlers/dendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('dendriteStoryHandler form element', () => {
  test('creates form container using a div element', () => {
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      setValue: jest.fn(),
    };
    const container = {};
    const textInput = { value: '{}' };

    dendriteStoryHandler(dom, container, textInput);

    expect(dom.createElement).toHaveBeenCalled();
    const firstCall = dom.createElement.mock.calls[0][0];
    expect(firstCall).toBe('div');
  });

  test('uses a div wrapper for each form field', () => {
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      setValue: jest.fn(),
    };
    const container = {};
    const textInput = { value: '{}' };

    dendriteStoryHandler(dom, container, textInput);

    const divCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'div'
    );
    expect(divCalls).toHaveLength(7);
  });

  test('creates a label element for each form field', () => {
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => ({})),
      insertBefore: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      setValue: jest.fn(),
    };
    const container = {};
    const textInput = { value: '{}' };

    dendriteStoryHandler(dom, container, textInput);

    const labelCalls = dom.createElement.mock.calls.filter(
      ([tag]) => tag === 'label'
    );
    expect(labelCalls).toHaveLength(6);
  });
});
