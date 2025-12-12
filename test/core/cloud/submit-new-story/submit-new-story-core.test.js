import { jest } from '@jest/globals';
import {
  createCorsErrorHandler,
  createCorsOptions,
  createHandleSubmitNewStory,
  createSubmitNewStoryResponder,
  normalizeCorsOptions,
  resolveAuthorId,
  getRequestBody,
} from '../../../../src/core/cloud/submit-new-story/submit-new-story-core.js';

describe('submit-new-story core', () => {
  describe('createSubmitNewStoryResponder', () => {
    const createDependencies = ({
      verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1' }),
      saveSubmission = jest.fn().mockResolvedValue(),
      randomUUID = jest.fn().mockReturnValue('story-1'),
      getServerTimestamp = jest.fn().mockReturnValue('now'),
    } = {}) => ({
      verifyIdToken,
      saveSubmission,
      randomUUID,
      getServerTimestamp,
    });

    it('throws when saveSubmission is missing', () => {
      expect(() =>
        createSubmitNewStoryResponder({
          verifyIdToken: jest.fn(),
          saveSubmission: null,
          randomUUID: jest.fn(),
          getServerTimestamp: jest.fn(),
        })
      ).toThrow(new TypeError('saveSubmission must be a function'));
    });

    it('rejects non-POST requests', async () => {
      const responder = createSubmitNewStoryResponder(createDependencies());

      await expect(responder({ method: 'GET' })).resolves.toEqual({
        status: 405,
        body: 'POST only',
      });
    });

    it('rejects requests when method is not a string', async () => {
      const responder = createSubmitNewStoryResponder(createDependencies());

      await expect(responder({ method: 123 })).resolves.toEqual({
        status: 405,
        body: 'POST only',
      });
    });

    it('rejects when the request is missing', async () => {
      const responder = createSubmitNewStoryResponder(createDependencies());

      await expect(responder(undefined)).resolves.toEqual({
        status: 405,
        body: 'POST only',
      });
    });

    it('saves a normalized submission and returns the payload', async () => {
      const saveSubmission = jest.fn().mockResolvedValue();
      const randomUUID = jest.fn().mockReturnValue('story-77');
      const responder = createSubmitNewStoryResponder(
        createDependencies({ saveSubmission, randomUUID })
      );

      const response = await responder({
        method: 'POST',
        body: {
          title: '  My Story  ',
          content: 'Hello\r\nWorld',
          author: '  Author  ',
          option0: ' Option A ',
          option1: '',
          option2: ' Option B ',
          option3: null,
        },
        headers: { Authorization: 'Bearer token' },
      });

      expect(saveSubmission).toHaveBeenCalledWith('story-77', {
        title: 'My Story',
        content: 'Hello\nWorld',
        author: 'Author',
        authorId: 'user-1',
        options: ['Option A', 'Option B'],
        createdAt: 'now',
      });
      expect(response).toEqual({
        status: 201,
        body: {
          id: 'story-77',
          title: 'My Story',
          content: 'Hello\nWorld',
          author: 'Author',
          options: ['Option A', 'Option B'],
        },
      });
    });

    it('ignores invalid auth tokens when resolving the author id', async () => {
      const verifyIdToken = jest.fn().mockRejectedValue(new Error('boom'));
      const saveSubmission = jest.fn().mockResolvedValue();
      const responder = createSubmitNewStoryResponder(
        createDependencies({ verifyIdToken, saveSubmission })
      );

      await responder({
        method: 'POST',
        body: { title: 'Test', content: 'Body', author: 'X' },
        get: name => (name === 'Authorization' ? 'Bearer abc' : null),
      });

      expect(saveSubmission).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ authorId: null })
      );
    });

    it('handles requests with falsy get and headers helpers', async () => {
      const saveSubmission = jest.fn().mockResolvedValue();
      const responder = createSubmitNewStoryResponder(
        createDependencies({ saveSubmission })
      );

      await responder({
        method: 'POST',
        body: { title: 'Test', content: 'Body', author: 'X' },
        get: null,
        headers: null,
      });

      expect(saveSubmission).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ authorId: null })
      );
    });
  });

  describe('resolveAuthorId', () => {
    it('returns null when the request is falsy', async () => {
      const verifyIdToken = jest.fn();

      await expect(
        resolveAuthorId(undefined, verifyIdToken)
      ).resolves.toBeNull();
      expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it('returns null when verification resolves without decoded data', async () => {
      const verifyIdToken = jest.fn().mockResolvedValue(undefined);
      const request = {
        get: () => 'Bearer secret',
      };

      await expect(resolveAuthorId(request, verifyIdToken)).resolves.toBeNull();
      expect(verifyIdToken).toHaveBeenCalledWith('secret');
    });
  });

  describe('createHandleSubmitNewStory', () => {
    it('sends JSON responses using Express semantics', async () => {
      const responder = jest.fn().mockResolvedValue({
        status: 201,
        body: { id: 'story-1' },
      });
      const handle = createHandleSubmitNewStory(responder);
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status };

      await handle({ method: 'POST', body: {} }, res);

      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({ id: 'story-1' });
    });

    it('handles falsy requests safely', async () => {
      const responder = jest.fn().mockResolvedValue({
        status: 204,
        body: undefined,
      });
      const handle = createHandleSubmitNewStory(responder);
      const sendStatus = jest.fn();
      const res = { sendStatus };

      await handle(null, res);

      expect(responder).toHaveBeenCalledWith({
        method: undefined,
        body: undefined,
        get: undefined,
        headers: undefined,
      });
      expect(sendStatus).toHaveBeenCalledWith(204);
    });

    it('sends non-object bodies via the default handler', async () => {
      const responder = jest.fn().mockResolvedValue({
        status: 500,
        body: 'error happened',
      });
      const handle = createHandleSubmitNewStory(responder);
      const send = jest.fn();
      const status = jest.fn().mockReturnValue({ send });
      const res = { status };

      await handle({ method: 'POST', body: {} }, res);

      expect(status).toHaveBeenCalledWith(500);
      expect(send).toHaveBeenCalledWith('error happened');
    });

    it('treats a non-function getter as undefined', async () => {
      const responder = jest.fn().mockResolvedValue({
        status: 200,
        body: { ok: true },
      });
      const handle = createHandleSubmitNewStory(responder);
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const req = {
        method: 'POST',
        body: {},
        get: 'not a function',
        headers: {},
      };

      await handle(req, { status });

      expect(responder).toHaveBeenCalledWith({
        method: 'POST',
        body: {},
        get: undefined,
        headers: {},
      });
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ ok: true });
    });

    it('passes through a real getter function', async () => {
      const responder = jest.fn().mockResolvedValue({
        status: 200,
        body: { ok: true },
      });
      const handle = createHandleSubmitNewStory(responder);
      const get = jest
        .fn()
        .mockImplementation(name =>
          name === 'Authorization' ? 'Bearer token' : null
        );
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });

      await handle({ method: 'POST', body: {}, get, headers: {} }, { status });

      expect(responder).toHaveBeenCalledWith({
        method: 'POST',
        body: {},
        get: expect.any(Function),
        headers: {},
      });
      expect(responder.mock.calls[0][0].get('Authorization')).toBe(
        'Bearer token'
      );
      expect(responder.mock.calls[0][0].get('authorization')).toBe(null);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('getRequestBody', () => {
    it('returns an empty object when the request is missing', () => {
      expect(getRequestBody(undefined)).toEqual({});
    });

    it('reads the provided body object when available', () => {
      const body = { foo: 'bar' };
      expect(getRequestBody({ body })).toBe(body);
    });
  });

  describe('CORS helpers', () => {
    it('allows configured origins', () => {
      const options = createCorsOptions({
        allowedOrigins: ['https://allowed.example'],
      });
      const callback = jest.fn();

      options.origin('https://allowed.example', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('allows missing origin values', () => {
      const options = createCorsOptions({
        allowedOrigins: ['https://allowed.example'],
      });
      const callback = jest.fn();

      options.origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('rejects disallowed origins', () => {
      const options = createCorsOptions({ allowedOrigins: [] });
      const callback = jest.fn();

      options.origin('https://blocked.example', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('converts CORS errors into 403 responses', () => {
      const handler = createCorsErrorHandler();
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      const next = jest.fn();

      handler(new Error('CORS'), {}, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({ error: 'Origin not allowed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('passes non-CORS errors to the next middleware', () => {
      const handler = createCorsErrorHandler();
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      const next = jest.fn();
      const other = new Error('not cors');

      handler(other, {}, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(other);
    });

    it('ignores allowedOrigins when the config is not an array', () => {
      const options = createCorsOptions({
        allowedOrigins: 'https://allowed.example',
      });
      const callback = jest.fn();

      options.origin('https://allowed.example', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('uses normalization defaults when no config is provided', () => {
      expect(normalizeCorsOptions(undefined)).toEqual({
        allowedOrigins: [],
        methods: ['POST'],
      });
    });
  });
});
