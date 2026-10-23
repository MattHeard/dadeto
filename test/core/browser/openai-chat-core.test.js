import { describe, expect, it, jest } from '@jest/globals';
import { createOpenAIChatController } from '../../../src/core/browser/openai-chat-core.js';

const allowEffects = Object.freeze({ request: true });

/**
 * Create complete browser dependencies for a controller test.
 * @param {Record<string, unknown>} overrides Replaced browser dependencies.
 * @returns {Record<string, unknown>} Complete test dependencies.
 */
function createDependencies(overrides = {}) {
  return {
    getEndpoint: jest.fn().mockResolvedValue('https://chat.example'),
    getIdToken: jest.fn().mockResolvedValue('firebase-token'),
    signIn: jest.fn().mockResolvedValue(undefined),
    createIdempotencyKey: jest.fn(() => 'attempt-1'),
    bindEffectBoundary: jest.fn(handler => handler(allowEffects)),
    postMessage: jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'Hello back.' }),
    }),
    ...overrides,
  };
}

describe('createOpenAIChatController', () => {
  it('sends bounded history through the configured endpoint and publishes a reply', async () => {
    const onStateChange = jest.fn();
    const deps = createDependencies({ onStateChange });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('  Hello  ')).resolves.toBe('sent');
    expect(deps.bindEffectBoundary).toHaveBeenCalledTimes(1);
    expect(deps.postMessage).toHaveBeenCalledWith(
      allowEffects,
      'https://chat.example',
      'firebase-token',
      'attempt-1',
      [{ role: 'user', content: 'Hello' }]
    );
    expect(controller.getState()).toEqual({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello back.' },
      ],
      pending: false,
      error: '',
    });
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ pending: true })
    );
  });

  it('reuses an uncertain request key and refuses a different message until resolved', async () => {
    const postMessage = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'provider_unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Recovered reply.' }),
      });
    const deps = createDependencies({ postMessage });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('same message')).resolves.toBe('failed');
    await expect(controller.send('different message')).resolves.toBe(
      'rejected'
    );
    await expect(controller.send('same message')).resolves.toBe('sent');
    expect(deps.createIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenNthCalledWith(
      1,
      allowEffects,
      'https://chat.example',
      'firebase-token',
      'attempt-1',
      [{ role: 'user', content: 'same message' }]
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      2,
      allowEffects,
      'https://chat.example',
      'firebase-token',
      'attempt-1',
      [{ role: 'user', content: 'same message' }]
    );
    expect(controller.getState().messages).toEqual([
      { role: 'user', content: 'same message' },
      { role: 'assistant', content: 'Recovered reply.' },
    ]);
  });

  it('uses a new idempotency key after a definite insufficient-credit response', async () => {
    const postMessage = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'insufficient_credit' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Paid reply.' }),
      });
    const deps = createDependencies({
      postMessage,
      createIdempotencyKey: jest
        .fn()
        .mockReturnValueOnce('attempt-1')
        .mockReturnValueOnce('attempt-2'),
    });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('Hello')).resolves.toBe('failed');
    expect(controller.getState().error).toContain('not enough credits');
    await expect(controller.send('Hello')).resolves.toBe('sent');
    expect(postMessage.mock.calls.map(call => call[3])).toEqual([
      'attempt-1',
      'attempt-2',
    ]);
  });

  it('prompts sign-in and does not call the endpoint without an identity token', async () => {
    const deps = createDependencies({
      getIdToken: jest.fn().mockResolvedValue(null),
    });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('Hello')).resolves.toBe('failed');
    expect(deps.signIn).toHaveBeenCalledTimes(1);
    expect(deps.postMessage).not.toHaveBeenCalled();
    expect(controller.getState().error).toBe('Sign in to send a message.');
  });

  it('rejects empty text without changing state or making a request', async () => {
    const deps = createDependencies();
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('   ')).resolves.toBe('rejected');
    expect(deps.getIdToken).not.toHaveBeenCalled();
    expect(deps.postMessage).not.toHaveBeenCalled();
    expect(controller.getState().messages).toEqual([]);
  });
});
