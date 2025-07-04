import { jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createHandleSubmit } = toys;

describe('createHandleSubmit', () => {
  it('expects three parameters', () => {
    expect(createHandleSubmit.length).toBe(3);
  });
  it('should handle being called without arguments', () => {
    // This test verifies that the function can be called without throwing
    // and that it returns a handler function
    let handler;
    expect(() => {
      handler = createHandleSubmit();
    }).not.toThrow();
    expect(typeof handler).toBe('function');
  });

  it('handles errors from the processing function', () => {
    const errorFn = jest.fn();
    const addWarning = jest.fn();
    const stopDefault = jest.fn();
    const removeAllChildren = jest.fn();
    const appendChild = jest.fn();
    const createElement = jest.fn(() => ({}));
    const setTextContent = jest.fn();

    const dom = {
      stopDefault,
      addWarning,
      removeAllChildren,
      appendChild,
      createElement,
      setTextContent,
    };

    const env = {
      errorFn,
      dom,
      createEnv: jest.fn(() => ({})),
      fetchFn: jest.fn(),
    };

    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };

    const processingError = new Error('boom');
    const processingFunction = jest.fn(() => {
      throw processingError;
    });

    const handler = createHandleSubmit(elements, processingFunction, env);
    const event = {};

    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(errorFn).toHaveBeenCalledWith(
      'Error processing input:',
      expect.any(Error)
    );
    expect(addWarning).toHaveBeenCalledWith(elements.outputParentElement);
    expect(removeAllChildren).toHaveBeenCalledWith(
      elements.outputParentElement
    );
    expect(appendChild).toHaveBeenCalled();
    expect(setTextContent).toHaveBeenCalledWith(
      expect.anything(),
      `Error: ${processingError.message}`
    );
  });

  it('returns a handler that stops default behaviour', () => {
    const stopDefault = jest.fn();
    const dom = {
      stopDefault,
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', jest.fn()],
    ]);
    const env = {
      dom,
      createEnv: jest.fn(() => toyEnv),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
      ),
    };
    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const json = '{"request":{"url":"https://example.com"}}';
    const processingFunction = jest.fn(() => json);

    const handler = createHandleSubmit(elements, processingFunction, env);

    expect(typeof handler).toBe('function');

    const event = {};
    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(processingFunction).toHaveBeenCalledWith('', toyEnv);
  });

  it('invokes processInputAndSetOutput with the provided arguments', () => {
    const stopDefault = jest.fn();
    const dom = {
      stopDefault,
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const env = {
      dom,
      createEnv: jest.fn(
        () =>
          new Map([
            ['getData', jest.fn()],
            ['setData', jest.fn()],
          ])
      ),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
      ),
    };
    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn(() => 'result');

    const handler = createHandleSubmit(elements, processingFunction, env);
    handler({});

    expect(stopDefault).toHaveBeenCalledWith({});
    expect(env.createEnv).toHaveBeenCalled();
  });

  it('fetches a URL when the processing function returns a request object', () => {
    const stopDefault = jest.fn();
    const fetchFn = jest.fn(() =>
      Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
    );
    const dom = {
      stopDefault,
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const env = {
      dom,
      createEnv: jest.fn(() => new Map()),
      errorFn: jest.fn(),
      fetchFn,
    };
    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const json = '{"request":{"url":"https://example.com"}}';
    const processingFunction = jest.fn(() => json);

    const handler = createHandleSubmit(elements, processingFunction, env);
    handler({});

    expect(stopDefault).toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledWith('https://example.com');
  });

  it('returns undefined after handling submit', () => {
    const stopDefault = jest.fn();
    const dom = {
      stopDefault,
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const env = {
      dom,
      createEnv: jest.fn(() => new Map()),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
      ),
    };
    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn(() => 'res');

    const handler = createHandleSubmit(elements, processingFunction, env);
    const result = handler({});

    expect(result).toBeUndefined();
    expect(stopDefault).toHaveBeenCalledWith({});
    expect(processingFunction).toHaveBeenCalledWith('x', expect.any(Map));
  });
});
