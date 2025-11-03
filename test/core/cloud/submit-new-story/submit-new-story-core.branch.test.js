import { jest } from '@jest/globals';
import { createSubmitNewStoryResponder } from '../../../../src/core/cloud/submit-new-story/submit-new-story-core.js';

describe('createSubmitNewStoryResponder branch coverage', () => {
  let verifyIdToken;
  let saveSubmission;
  let randomUUID;
  let getServerTimestamp;
  let responder;

  beforeEach(() => {
    verifyIdToken = jest.fn(async token => {
      if (token === 'valid-token') {
        return { uid: 'test-uid' };
      }
      throw new Error('Invalid token');
    });
    saveSubmission = jest.fn(async () => {});
    randomUUID = jest.fn(() => 'test-uuid');
    getServerTimestamp = jest.fn(() => 'test-timestamp');

    responder = createSubmitNewStoryResponder({
      verifyIdToken,
      saveSubmission,
      randomUUID,
      getServerTimestamp,
    });
  });

  it('should cover readAuthorizationFromGetter and readAuthorizationFromHeadersBag branches', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return null; // Simulate uppercase header being null
        }
        if (header === 'authorization') {
          return 'Bearer valid-token'; // Simulate lowercase header being valid
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: 'test-uid',
      })
    );
  });

  it('should cover extractBearerToken returning null', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: 'Invalid-Format-Token',
      },
      get: header => {
        if (header === 'Authorization') {
          return null;
        }
        if (header === 'authorization') {
          return 'Invalid-Format-Token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: null,
      })
    );
  });

  it('should cover resolveAuthorId returning null when decoded.uid is falsy', async () => {
    verifyIdToken.mockImplementationOnce(async token => {
      if (token === 'valid-token') {
        return { uid: null }; // Simulate falsy uid
      }
      throw new Error('Invalid token');
    });

    const request = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return null;
        }
        if (header === 'authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: null,
      })
    );
  });

  it('should cover collectOptions when raw is undefined or null', async () => {
    const request = {
      method: 'POST',
      body: {
        title: 'Test Story',
        content: 'Test Content',
        author: 'Test Author',
        option0: 'Option 1',
        option1: undefined, // This should cover the undefined branch
        option2: null, // This should cover the null branch
        option3: 'Option 3',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return null;
        }
        if (header === 'authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        options: ['Option 1', 'Option 3'],
      })
    );
  });

  it('should cover normalizeAuthorizationCandidate with an array of strings', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: ['Bearer valid-token', 'Bearer another-token'],
      },
      get: header => {
        if (header === 'Authorization') {
          return ['Bearer valid-token', 'Bearer another-token'];
        }
        if (header === 'authorization') {
          return ['Bearer valid-token', 'Bearer another-token'];
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: 'test-uid',
      })
    );
  });

  it('should cover normalizeAuthorizationCandidate with an array containing non-string first element', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: [123, 'Bearer valid-token'],
      },
      get: header => {
        if (header === 'Authorization') {
          return [123, 'Bearer valid-token'];
        }
        if (header === 'authorization') {
          return [123, 'Bearer valid-token'];
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: null,
      })
    );
  });

  it('should cover normalizeAuthorizationCandidate with a non-string, non-array candidate', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: 12345,
      },
      get: header => {
        if (header === 'Authorization') {
          return 12345;
        }
        if (header === 'authorization') {
          return 12345;
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: null,
      })
    );
  });

  it('should cover readAuthorizationFromGetter when getter is not a function', async () => {
    const request = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: null, // Simulate getter not being a function
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: 'test-uid',
      })
    );
  });

  it('should cover readAuthorizationFromHeadersBag when headers are not an object', async () => {
    const request = {
      method: 'POST',
      headers: null, // Simulate headers not being an object
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: 'test-uid',
      })
    );
  });

  it('should cover resolveAuthorId when verifyIdToken throws an error', async () => {
    verifyIdToken.mockImplementationOnce(async () => {
      throw new Error('Verification failed');
    });

    const request = {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer invalid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        authorId: null,
      })
    );
  });

  it('should cover normalizeContent with null or undefined value', async () => {
    const request = {
      method: 'POST',
      body: {
        title: 'Test Story',
        content: null, // Simulate null content
        author: 'Test Author',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        content: '',
      })
    );
  });

  it('should cover normalizeContent with a non-string value', async () => {
    const request = {
      method: 'POST',
      body: {
        title: 'Test Story',
        content: 12345, // Simulate non-string content
        author: 'Test Author',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        content: '12345',
      })
    );
  });

  it('should cover collectOptions with empty body', async () => {
    const request = {
      method: 'POST',
      body: {
        title: 'Test Story',
        content: 'Test Content',
        author: 'Test Author',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        options: [],
      })
    );
  });

  it('should cover collectOptions with raw value that normalizes to empty string', async () => {
    const request = {
      method: 'POST',
      body: {
        title: 'Test Story',
        content: 'Test Content',
        author: 'Test Author',
        option0: '   ', // This should normalize to empty string
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      get: header => {
        if (header === 'Authorization') {
          return 'Bearer valid-token';
        }
        return undefined;
      },
    };

    const result = await responder(request);

    expect(result.status).toBe(201);
    expect(saveSubmission).toHaveBeenCalledWith(
      'test-uuid',
      expect.objectContaining({
        options: [],
      })
    );
  });
});
