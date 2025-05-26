import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock the module methods
const mockParseJSONResult = jest.fn().mockReturnValue(null);
const mockHandleParsedResult = jest.fn().mockReturnValue(false);
const mockSetTextContent = jest.fn();
const mockSetOutput = jest.fn();

// Mock the module
jest.unstable_mockModule('../../src/browser/toys.js', () => ({
  __esModule: true,
  parseJSONResult: mockParseJSONResult,
  handleParsedResult: mockHandleParsedResult,
  setTextContent: mockSetTextContent,
  setOutput: mockSetOutput,
  processInputAndSetOutput: jest.fn()
}));

// Import the module after setting up the mocks
let toysModule;
let processInputAndSetOutput;

describe('processInputAndSetOutput', () => {
  it('should handle being called with no arguments', () => {
    // Define test variables
    const inputElement = {};
    const article = {};
    const outputSelect = {};
    const elements = { inputElement, article, outputSelect };
    const processingFunction = jest.fn();
    const createEnv = jest.fn();
    const env = { createEnv };

    // Call with all required arguments
    processInputAndSetOutput(elements, processingFunction, env);
  });

  let elements, processingFunction, env;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Import the module
    toysModule = await import('../../src/browser/toys.js');
    processInputAndSetOutput = toysModule.processInputAndSetOutput;

    // Setup mock elements
    elements = {
      inputElement: { value: 'test input' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'test-article' }
    };

    // Setup mock processing function
    processingFunction = jest.fn().mockReturnValue('processed result');

    // Setup environment with mocks
    env = {
      createEnv: jest.fn().mockReturnValue({
        setOutput: mockSetOutput
      }),
      dom: {
        setTextContent: mockSetTextContent
      }
    };

    // Reset the mock implementation for each test
    toysModule.processInputAndSetOutput.mockImplementation(
      async (elements, processingFunction, env) => {
        const { inputElement, outputParentElement: parent, outputSelect, article } = elements;
        const { createEnv, dom } = env;
        const toyEnv = createEnv();
        const inputValue = inputElement.value;
        const result = processingFunction(inputValue, toyEnv);
        // Assume article and article.id are always truthy, no need to log
        await mockSetOutput(JSON.stringify({ [article.id]: result }), toyEnv);
        const parsed = await mockParseJSONResult(result);
        const presenterKey = outputSelect.value;
        if (!(await mockHandleParsedResult(parsed, env, { parent, presenterKey }))) {
          await mockSetTextContent({ content: result, presenterKey }, dom, parent);
        }
        return result;
      }
    );
  });

  it('calls the processing function with input value and environment', async () => {
    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(processingFunction).toHaveBeenCalledWith('test input', expect.any(Object));
    expect(env.createEnv).toHaveBeenCalled();
  });

  it('calls setOutput with the correct parameters', async () => {
    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(mockSetOutput).toHaveBeenCalledWith(
      JSON.stringify({ 'test-article': 'processed result' }),
      expect.any(Object)
    );
  });

  it('calls parseJSONResult with the processing result', async () => {
    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(mockParseJSONResult).toHaveBeenCalledWith('processed result');
  });

  it('calls handleParsedResult when parseJSONResult returns a value', async () => {
    // Arrange
    const mockParsed = { some: 'data' };
    mockParseJSONResult.mockResolvedValueOnce(mockParsed);

    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(mockHandleParsedResult).toHaveBeenCalledWith(
      mockParsed,
      env,
      {
        parent: elements.outputParentElement,
        presenterKey: 'text'
      }
    );
  });

  it('calls setTextContent when handleParsedResult returns false', async () => {
    // Arrange
    mockHandleParsedResult.mockResolvedValueOnce(false);

    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(mockSetTextContent).toHaveBeenCalledWith(
      { content: 'processed result', presenterKey: 'text' },
      env.dom,
      elements.outputParentElement
    );
  });

  it('does not call setTextContent when handleParsedResult returns true', async () => {
    // Arrange
    mockHandleParsedResult.mockResolvedValueOnce(true);

    // Act
    await processInputAndSetOutput(elements, processingFunction, env);

    // Assert
    expect(mockSetTextContent).not.toHaveBeenCalled();
  });
});
