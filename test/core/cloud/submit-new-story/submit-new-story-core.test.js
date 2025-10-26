import { jest } from '@jest/globals';
import {
  createCorsErrorHandler,
  createCorsOptions,
  createHandleSubmitNewStory,
  createSubmitNewStoryResponder,
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
  });
});
