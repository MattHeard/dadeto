import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createDynamicMudGame } from '../../src/core/browser/game/dynamic-mud/game.js';
import { createDynamicMudOpenAIProviders } from '../../src/core/browser/game/dynamic-mud/openaiProviders.js';

const allowEffects = Object.freeze({ allow: true });
const loadStaticConfig = jest.fn();
const getIdToken = jest.fn();
const initGoogleSignIn = jest.fn();
const effectFetch = jest.fn();

/**
 * Build a mocked chat endpoint response.
 * @param {unknown} reply Model response content.
 * @returns {{ok: boolean, status: number, json: () => Promise<object>}} Response mock.
 */
const response = reply => ({
  ok: true,
  status: 200,
  json: async () => ({ reply: JSON.stringify(reply) }),
});

/**
 * Create a provider set using mocked browser services.
 * @param {Record<string, unknown>} overrides Replaced provider dependencies.
 * @returns {ReturnType<typeof createDynamicMudOpenAIProviders>} Test providers.
 */
function createProviders(overrides = {}) {
  let key = 0;
  return createDynamicMudOpenAIProviders({
    chat: {
      getConfig: loadStaticConfig,
      createIdempotencyKey: () => `attempt-${++key}`,
    },
    identity: { getToken: getIdToken, signIn: initGoogleSignIn },
    effects: {
      run: effectFetch,
      bind: handler => handler(allowEffects),
    },
    ...overrides,
  });
}

describe('Dynamic MUD OpenAI provider adapter', () => {
  beforeEach(() => {
    loadStaticConfig.mockReset();
    loadStaticConfig.mockResolvedValue({
      openaiChatEnabled: true,
      openaiChatUrl: 'https://chat.example/function',
    });
    getIdToken.mockReset();
    getIdToken.mockResolvedValue('firebase-id-token');
    initGoogleSignIn.mockReset();
    effectFetch.mockReset();
  });

  it('runs the proposal and builder through the billed endpoint with effect permission', async () => {
    const proposal = {
      intent: 'Describe the ferry lamp.',
      predictedWorld: createDynamicMudGame().getState().world,
    };
    const program = {
      version: 1,
      operations: [{ kind: 'output', text: 'The ferry lamp answers.' }],
    };
    effectFetch
      .mockResolvedValueOnce(response(proposal))
      .mockResolvedValueOnce(response(program));
    const providers = createProviders();
    const game = createDynamicMudGame(providers);

    const result = await game.run('ask about the ferry lamp');

    expect(result.known).toBe(true);
    expect(result.state.transcript.at(-1)).toBe('The ferry lamp answers.');
    expect(effectFetch).toHaveBeenCalledTimes(2);
    for (const [permission, endpoint, options] of effectFetch.mock.calls) {
      expect(permission).toBe(allowEffects);
      expect(endpoint).toBe('https://chat.example/function');
      expect(options.headers.Authorization).toBe('Bearer firebase-id-token');
      expect(options.headers['Idempotency-Key']).toMatch(/^attempt-[12]$/);
    }
    expect(loadStaticConfig).toHaveBeenCalledTimes(2);
  });

  it('does not call the provider when the public chat gate is off', async () => {
    loadStaticConfig.mockResolvedValue({
      openaiChatEnabled: false,
      openaiChatUrl: 'https://chat.example/function',
    });
    const initial = createDynamicMudGame().getState().world;
    const game = createDynamicMudGame(createProviders());

    const result = await game.run('ask the ferryman to sing');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(initial);
    expect(effectFetch).not.toHaveBeenCalled();
    expect(initGoogleSignIn).not.toHaveBeenCalled();
  });

  it('keeps known commands away from config, authentication, and provider calls', async () => {
    const game = createDynamicMudGame(createProviders());

    const result = await game.run('ring the bell');

    expect(result.known).toBe(true);
    expect(loadStaticConfig).not.toHaveBeenCalled();
    expect(getIdToken).not.toHaveBeenCalled();
    expect(effectFetch).not.toHaveBeenCalled();
  });

  it('rejects malformed model JSON without changing the world', async () => {
    effectFetch
      .mockResolvedValueOnce(
        response({
          intent: 'Describe the ferry lamp.',
          predictedWorld: createDynamicMudGame().getState().world,
        })
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Here is JavaScript: alert(1)' }),
      });
    const game = createDynamicMudGame(createProviders());
    const initial = game.getState().world;

    const result = await game.run('ask the ferryman to sing');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(initial);
    expect(game.hasGeneratedCommand('ask the ferryman to sing')).toBe(false);
  });

  it.each([{ intent: 42, predictedWorld: {} }, { intent: 'A reply.' }])(
    'rejects a proposal with an invalid shape: %j',
    async proposal => {
      effectFetch.mockResolvedValueOnce(response(proposal));
      const providers = createProviders();

      await expect(
        providers.proposeCommand({ command: 'ask', world: {} })
      ).rejects.toThrow('The billed chat proposal had an invalid shape.');
    }
  );

  it('reuses the same idempotency key after an uncertain chat response', async () => {
    effectFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'provider_unavailable' }),
      })
      .mockResolvedValueOnce(
        response({ intent: 'A reply.', predictedWorld: {} })
      );
    const providers = createProviders();
    const request = { command: 'ask', world: {} };

    await expect(providers.proposeCommand(request)).rejects.toThrow(
      'The billed chat request did not complete.'
    );
    await expect(providers.proposeCommand(request)).resolves.toEqual({
      intent: 'A reply.',
      predictedWorld: {},
    });

    expect(
      effectFetch.mock.calls.map(call => call[2].headers['Idempotency-Key'])
    ).toEqual(['attempt-1', 'attempt-1']);
  });

  it('asks the user to sign in and sends no request without an identity token', async () => {
    getIdToken.mockResolvedValue(null);
    const providers = createProviders();

    await expect(
      providers.proposeCommand({ command: 'ask', world: {} })
    ).rejects.toThrow('The billed chat request did not complete.');

    expect(initGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(effectFetch).not.toHaveBeenCalled();
  });

  it('rejects prompts above the chat size limit before loading config', async () => {
    const providers = createProviders();

    await expect(
      providers.proposeCommand({ command: 'x'.repeat(4000), world: {} })
    ).rejects.toThrow('The command context exceeds the chat request limit.');

    expect(loadStaticConfig).not.toHaveBeenCalled();
    expect(effectFetch).not.toHaveBeenCalled();
  });

  it('keeps chat disabled when its endpoint is absent from enabled config', async () => {
    const providers = createProviders({
      chat: {
        getConfig: async () => ({ openaiChatEnabled: true }),
        createIdempotencyKey: () => 'attempt',
      },
    });

    await expect(
      providers.proposeCommand({ command: 'ask', world: {} })
    ).rejects.toThrow('The billed chat request did not complete.');

    expect(effectFetch).not.toHaveBeenCalled();
  });
});
