import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterEach,
  jest,
} from '@jest/globals';

let toys;
let processInputAndSetOutput;
let handleParsedResult;

beforeAll(async () => {
  toys = await import('../../src/browser/toys.js');
  ({ processInputAndSetOutput, handleParsedResult } = toys);
});

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
    ['setData', jest.fn()],
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

  it('stores the result keyed by article id', () => {
    const result = 'ok';
    processingFunction.mockReturnValue(result);

    processInputAndSetOutput(elements, processingFunction, env);

    const setData = toyEnv.get('setData');
    const callArg = setData.mock.calls[0][0];
    expect(callArg.output).toEqual({ [elements.article.id]: result });
  });
});
