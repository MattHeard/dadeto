import { jest } from '@jest/globals';
import { handleRequestResponse } from '../../src/browser/toys.js';

describe('handleRequestResponse', () => {
  let mockDom;
  let mockEnv;
  let mockOptions;
  let mockResponse;
  let mockParent;
  let url;

  beforeEach(() => {
    url = 'https://example.com';
    mockResponse = {
      text: jest.fn().mockResolvedValue('response text')
    };

    mockParent = {
      firstChild: null
    };

    mockDom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn().mockImplementation((tagName) => ({
        tagName: tagName.toUpperCase(),
        textContent: '',
        appendChild: jest.fn()
      })),
      setTextContent: jest.fn(),
      appendChild: jest.fn().mockImplementation((parent, child) => {
        parent.firstChild = child;
        return child;
      }),
      addWarning: jest.fn(),
      removeWarning: jest.fn()
    };

    mockEnv = {
      fetchFn: jest.fn().mockResolvedValue(mockResponse),
      dom: mockDom,
      errorFn: jest.fn()
    };

    mockOptions = {
      parent: mockParent,
      presenterKey: 'text'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call fetch with the provided URL', async () => {
    // Act
    handleRequestResponse(url, mockEnv, mockOptions);

    // Allow promises to resolve
    await new Promise(process.nextTick);

    // Assert
    expect(mockEnv.fetchFn).toHaveBeenCalledWith(url);
  });

  it('should process the response text and update the DOM', async () => {
    // Arrange
    const responseText = 'test response';
    mockResponse.text.mockResolvedValueOnce(responseText);

    // Act
    handleRequestResponse(url, mockEnv, mockOptions);

    // Allow promises to resolve
    await new Promise(process.nextTick);

    // Assert
    expect(mockDom.removeAllChildren).toHaveBeenCalledWith(mockParent);
    expect(mockDom.appendChild).toHaveBeenCalledWith(mockParent, expect.anything());
  });

  it('should handle fetch errors', async () => {
    // Arrange
    const error = new Error('Network error');
    mockEnv.fetchFn.mockRejectedValueOnce(error);

    // Act
    handleRequestResponse(url, mockEnv, mockOptions);

    // Allow promises to resolve/reject
    await new Promise(process.nextTick);

    // Assert
    expect(mockEnv.errorFn).toHaveBeenCalledWith('Error fetching request URL:', error);
    expect(mockDom.setTextContent).toHaveBeenCalledWith(
      { content: 'Error fetching URL: ' + error.message, presenterKey: mockOptions.presenterKey },
      mockDom,
      mockParent
    );
    expect(mockDom.addWarning).toHaveBeenCalledWith(mockParent);
  });

  it('should handle response.text() errors', async () => {
    // Arrange
    const error = new Error('Failed to read response');
    mockResponse.text.mockRejectedValueOnce(error);

    // Act
    handleRequestResponse(url, mockEnv, mockOptions);

    // Allow promises to resolve/reject
    await new Promise(process.nextTick);

    // Assert
    expect(mockEnv.errorFn).toHaveBeenCalledWith('Error fetching request URL:', error);
    expect(mockDom.setTextContent).toHaveBeenCalledWith(
      { content: 'Error fetching URL: ' + error.message, presenterKey: mockOptions.presenterKey },
      mockDom,
      mockParent
    );
    expect(mockDom.addWarning).toHaveBeenCalledWith(mockParent);
  });
});
