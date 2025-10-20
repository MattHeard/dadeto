import { jest } from '@jest/globals';
import { createHandleSubmit } from '../../../../src/core/cloud/submit-new-page/core.js';

function createRequest(body = {}, headers = {}) {
  const normalizedHeaders = Object.entries(headers).reduce(
    (acc, [key, value]) => ({ ...acc, [key.toLowerCase()]: value }),
    {}
  );

  return {
    body,
    get: (name) => normalizedHeaders[name.toLowerCase()],
  };
}

describe('createHandleSubmit', () => {
  const baseDeps = () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }),
    saveSubmission: jest.fn().mockResolvedValue(),
    randomUUID: jest.fn().mockReturnValue('uuid-1'),
    serverTimestamp: jest.fn().mockReturnValue('ts'),
    parseIncomingOption: jest.fn().mockReturnValue({ optionId: 'opt-1' }),
    findExistingOption: jest.fn().mockResolvedValue('Option :: 1'),
    findExistingPage: jest.fn().mockResolvedValue('/pages/1'),
  });

  it('saves a submission for a valid incoming option', async () => {
    const deps = baseDeps();
    const handler = createHandleSubmit(deps);

    const request = createRequest(
      {
        incoming_option: ' Option 1 ',
        content: 'Line1\r\nLine2',
        author: ' Alice ',
        option0: ' First ',
        option1: '',
        option2: null,
        option3: ' Second ',
      },
      { Authorization: 'Bearer token-123' }
    );

    const result = await handler(request);

    expect(result).toEqual({
      status: 201,
      body: {
        id: 'uuid-1',
        incomingOptionFullName: 'Option :: 1',
        pageNumber: null,
        content: 'Line1\nLine2',
        author: 'Alice',
        options: ['First', 'Second'],
      },
    });

    expect(deps.verifyIdToken).toHaveBeenCalledWith('token-123');
    expect(deps.saveSubmission).toHaveBeenCalledWith('uuid-1', {
      incomingOptionFullName: 'Option :: 1',
      pageNumber: null,
      content: 'Line1\nLine2',
      author: 'Alice',
      authorId: 'user-1',
      options: ['First', 'Second'],
      createdAt: 'ts',
    });
    expect(deps.serverTimestamp).toHaveBeenCalledTimes(1);
  });

  it('requires exactly one of incoming option or page', async () => {
    const deps = baseDeps();
    const handler = createHandleSubmit(deps);

    const result = await handler(
      createRequest({ incoming_option: 'one', page: '2' })
    );

    expect(result).toEqual({
      status: 400,
      body: {
        error: 'must provide exactly one of incoming option or page',
      },
    });
    expect(deps.saveSubmission).not.toHaveBeenCalled();
  });

  it('validates incoming options', async () => {
    const deps = baseDeps();
    deps.parseIncomingOption.mockReturnValue(null);
    const handler = createHandleSubmit(deps);

    const result = await handler(createRequest({ incoming_option: 'bad' }));

    expect(result).toEqual({
      status: 400,
      body: { error: 'invalid incoming option' },
    });
    expect(deps.findExistingOption).not.toHaveBeenCalled();
  });

  it('rejects unknown incoming options', async () => {
    const deps = baseDeps();
    deps.findExistingOption.mockResolvedValue(null);
    const handler = createHandleSubmit(deps);

    const result = await handler(createRequest({ incoming_option: 'missing' }));

    expect(result).toEqual({
      status: 400,
      body: { error: 'incoming option not found' },
    });
  });

  it('validates page submissions', async () => {
    const deps = baseDeps();
    const handler = createHandleSubmit(deps);

    const invalidPage = await handler(createRequest({ page: 'not-a-number' }));
    expect(invalidPage).toEqual({
      status: 400,
      body: { error: 'invalid page' },
    });

    deps.findExistingPage.mockResolvedValue(null);
    const missingPage = await handler(createRequest({ page: '42' }));
    expect(missingPage).toEqual({
      status: 400,
      body: { error: 'page not found' },
    });
    expect(deps.findExistingPage).toHaveBeenCalledWith(42);
  });

  it('ignores invalid auth tokens when saving a page submission', async () => {
    const deps = baseDeps();
    deps.verifyIdToken.mockRejectedValue(new Error('nope'));
    deps.findExistingPage.mockResolvedValue('/pages/10');
    const handler = createHandleSubmit(deps);

    const request = createRequest(
      {
        page: '10',
        content: 'Hello',
        author: 'Bob',
      },
      { authorization: 'Bearer bad-token' }
    );

    const result = await handler(request);

    expect(result).toEqual({
      status: 201,
      body: {
        id: 'uuid-1',
        incomingOptionFullName: null,
        pageNumber: 10,
        content: 'Hello',
        author: 'Bob',
        options: [],
      },
    });

    expect(deps.verifyIdToken).toHaveBeenCalledWith('bad-token');
    expect(deps.saveSubmission).toHaveBeenCalledWith('uuid-1', {
      incomingOptionFullName: null,
      pageNumber: 10,
      content: 'Hello',
      author: 'Bob',
      authorId: null,
      options: [],
      createdAt: 'ts',
    });
  });

  it('falls back to missing headers when request.get is unavailable', async () => {
    const deps = baseDeps();
    deps.findExistingPage.mockResolvedValue('/pages/5');
    const handler = createHandleSubmit(deps);

    const request = { body: { page: '5', content: 'Hi', author: 'Sam' } };

    const result = await handler(request);

    expect(result.status).toBe(201);
    expect(deps.verifyIdToken).not.toHaveBeenCalled();
    expect(deps.saveSubmission).toHaveBeenCalledWith('uuid-1', {
      incomingOptionFullName: null,
      pageNumber: 5,
      content: 'Hi',
      author: 'Sam',
      authorId: null,
      options: [],
      createdAt: 'ts',
    });
  });

  it('returns an error when no identifying fields are provided', async () => {
    const deps = baseDeps();
    const handler = createHandleSubmit(deps);

    const result = await handler({});

    expect(result).toEqual({
      status: 400,
      body: {
        error: 'must provide exactly one of incoming option or page',
      },
    });
    expect(deps.saveSubmission).not.toHaveBeenCalled();
  });
});
