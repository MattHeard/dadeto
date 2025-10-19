import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { processInputAndSetOutput } from '../../src/browser/toys.js';
import { setInputValue } from '../../src/core/browser/inputValueStore.js';

let elements;
let env;
let toyEnv;
let processingFunction;

beforeEach(() => {
  elements = {
    inputElement: { value: 'input' },
    outputParentElement: {},
    outputSelect: { value: 'text' },
    article: { id: 'post1' },
  };
  toyEnv = new Map([
    ['getData', () => ({ output: {} })],
    ['setLocalTemporaryData', jest.fn()],
  ]);
  env = {
    createEnv: jest.fn(() => toyEnv),
    fetchFn: jest.fn(() =>
      Promise.resolve({ text: jest.fn(() => Promise.resolve('')) })
    ),
    dom: {
      setTextContent: jest.fn(),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      addWarning: jest.fn(),
      removeWarning: jest.fn(),
    },
    errorFn: jest.fn(),
    loggers: {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    },
  };
  processingFunction = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('processInputAndSetOutput', () => {
  it('does not set text when handleParsedResult returns true', () => {
    const json = '{"request":{"url":"https://example.com"}}';
    processingFunction.mockReturnValue(json);
    const parseSpy = jest.spyOn(JSON, 'parse');

    processInputAndSetOutput(elements, processingFunction, env);

    expect(parseSpy).toHaveBeenCalledWith(json);
    expect(env.dom.appendChild).not.toHaveBeenCalled();

    parseSpy.mockRestore();
  });

  it('sets text content when parsed result is invalid', () => {
    const invalid = 'not json';
    processingFunction.mockReturnValue(invalid);

    processInputAndSetOutput(elements, processingFunction, env);

    expect(env.dom.appendChild).toHaveBeenCalledWith(
      elements.outputParentElement,
      expect.anything()
    );
  });

  it('sets text content when parsed result lacks request url', () => {
    const json = JSON.stringify({ request: {} });
    processingFunction.mockReturnValue(json);

    processInputAndSetOutput(elements, processingFunction, env);

    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(env.dom.appendChild).toHaveBeenCalledWith(
      elements.outputParentElement,
      expect.anything()
    );
  });

  it('stores the result keyed by article id', () => {
    const result = 'ok';
    processingFunction.mockReturnValue(result);

    processInputAndSetOutput(elements, processingFunction, env);

    const setData = toyEnv.get('setLocalTemporaryData');
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toEqual({ [elements.article.id]: result });
  });

  it('uses the presenter matching the outputSelect value', () => {
    elements.outputSelect.value = 'pre';
    processingFunction.mockReturnValue('line1\nline2');

    const created = { tagName: 'pre', textContent: '' };
    env.dom.createElement.mockImplementation(() => created);

    processInputAndSetOutput(elements, processingFunction, env);

    expect(env.dom.createElement).toHaveBeenCalledWith('pre');
    expect(env.dom.setTextContent).toHaveBeenCalledWith(
      created,
      'line1\nline2'
    );
    expect(env.dom.appendChild).toHaveBeenCalledWith(
      elements.outputParentElement,
      created
    );
  });

  it('prioritises the in-memory input value over the element value', () => {
    setInputValue(elements.inputElement, 'memory-value');
    elements.inputElement.value = 'stale-dom-value';
    processingFunction.mockReturnValue('done');

    processInputAndSetOutput(elements, processingFunction, env);

    expect(processingFunction).toHaveBeenCalledWith('memory-value', toyEnv);
  });
});
