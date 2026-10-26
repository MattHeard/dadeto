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

  it('rejects a second send while the first signed request is pending', async () => {
    let releaseResponse;
    let signalStarted;
    const started = new Promise(resolve => {
      signalStarted = resolve;
    });
    const postMessage = jest.fn(
      () =>
        new Promise(resolve => {
          releaseResponse = resolve;
          signalStarted();
        })
    );
    const deps = createDependencies({ postMessage });
    const controller = createOpenAIChatController(deps);
    const firstSend = controller.send('First');
    await started;
    expect(controller.getState().pending).toBe(true);
    await expect(controller.send('Second')).resolves.toBe('rejected');
    expect(deps.createIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(1);
    releaseResponse({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'Done' }),
    });
    await expect(firstSend).resolves.toBe('sent');
  });

  it('reports missing and non-string service endpoints without calling the effect boundary', async () => {
    for (const endpoint of ['', null, 17]) {
      const deps = createDependencies({
        getEndpoint: jest.fn().mockResolvedValue(endpoint),
      });
      const controller = createOpenAIChatController(deps);
      await expect(controller.send('Hello')).resolves.toBe('failed');
      expect(controller.getState().error).toBe(
        'The chat service is not configured.'
      );
      expect(deps.bindEffectBoundary).not.toHaveBeenCalled();
      expect(deps.postMessage).not.toHaveBeenCalled();
    }
  });

  it.each([null, [], { reply: '' }, { reply: '   ' }, {}])(
    'retains an incomplete response for same-message retry when reply is %j',
    async body => {
      const postMessage = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => body,
      });
      const deps = createDependencies({ postMessage });
      const controller = createOpenAIChatController(deps);
      await expect(controller.send('Hello')).resolves.toBe('failed');
      expect(controller.getState()).toMatchObject({
        pending: false,
        error: 'The chat response was incomplete. Retry it.',
      });
      await expect(controller.send('Different')).resolves.toBe('rejected');
      expect(deps.createIdempotencyKey).toHaveBeenCalledTimes(1);
      expect(postMessage).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps the same key when the response body cannot be read', async () => {
    const postMessage = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw Error('bad json');
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Recovered' }),
      });
    const deps = createDependencies({ postMessage });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('Hello')).resolves.toBe('failed');
    expect(controller.getState().error).toBe(
      'The reply could not be confirmed. Retry the same message.'
    );
    await expect(controller.send('Hello')).resolves.toBe('sent');
    expect(postMessage.mock.calls.map(call => call[3])).toEqual([
      'attempt-1',
      'attempt-1',
    ]);
  });

  it.each([null, 5, {}])(
    'rejects a non-string message %j before resolving access',
    async text => {
      const deps = createDependencies();
      const controller = createOpenAIChatController(deps);
      await expect(controller.send(text)).resolves.toBe('rejected');
      expect(deps.getEndpoint).not.toHaveBeenCalled();
      expect(deps.postMessage).not.toHaveBeenCalled();
    }
  );

  it('shows an unavailable-service error if endpoint or token lookup rejects', async () => {
    const dependencies = [
      {
        getEndpoint: jest
          .fn()
          .mockRejectedValue(Error('endpoint lookup failed')),
      },
      {
        getIdToken: jest
          .fn()
          .mockRejectedValue(Error('identity lookup failed')),
      },
    ];
    for (const overrides of dependencies) {
      const deps = createDependencies(overrides);
      const controller = createOpenAIChatController(deps);
      await expect(controller.send('Hello')).resolves.toBe('failed');
      expect(controller.getState().error).toBe(
        'The chat service is not configured.'
      );
      expect(deps.bindEffectBoundary).not.toHaveBeenCalled();
    }
  });

  it('maps stable server errors to the stated client messages', async () => {
    const cases = [
      [
        429,
        'rate_limited',
        'You have reached the short-term message limit. Try again shortly.',
      ],
      [
        409,
        'operation_pending',
        'The previous reply is still being confirmed. Retry this message later.',
      ],
      [401, 'unauthorized', 'Sign in again to send a message.'],
      [503, 'chat_unavailable', 'Chat is temporarily unavailable.'],
      [
        502,
        'provider_unavailable',
        'The reply could not be confirmed. Retry the same message.',
      ],
    ];
    for (const [status, error, message] of cases) {
      const deps = createDependencies({
        postMessage: jest.fn().mockResolvedValue({
          ok: false,
          status,
          json: async () => ({ error }),
        }),
      });
      const controller = createOpenAIChatController(deps);
      await expect(controller.send('Hello')).resolves.toBe('failed');
      expect(controller.getState().error).toBe(message);
    }
  });

  it('maps non-record error bodies to a stable fallback message', async () => {
    const deps = createDependencies({
      postMessage: jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => [],
      }),
    });
    const controller = createOpenAIChatController(deps);
    await expect(controller.send('Hello')).resolves.toBe('failed');
    expect(controller.getState().error).toBe(
      'Chat is temporarily unavailable.'
    );
  });
});
