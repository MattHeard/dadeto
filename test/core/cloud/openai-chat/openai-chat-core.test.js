import { describe, expect, it, jest } from '@jest/globals';
import {
  createOpenAIChatHandler,
  createOpenAIChatModelClient,
  createOpenAIChatRateLimiter,
  normalizeOpenAIChatRequest,
  OPENAI_CHAT_MAX_INPUT_BYTES,
  OPENAI_CHAT_MAX_MESSAGES,
  OPENAI_CHAT_MAX_OUTPUT_TOKENS,
  OPENAI_CHAT_MODEL,
  OPENAI_CHAT_OPERATION_COST_EUR_MICROS,
  OPENAI_CHAT_OPERATION,
} from '../../../../src/core/cloud/openai-chat/openai-chat-core.js';

const allowEffects = Object.freeze({ request: true });
const validBody = { messages: [{ role: 'user', content: 'Hello' }] };

/**
 * Create injected handler dependencies with in-memory result storage.
 * @param {Record<string, any>} [overrides] Dependency overrides.
 * @returns {object} Mocked dependencies and storage.
 */
function createDependencies(overrides = {}) {
  const billing = {
    getCurrentPricingSnapshot: jest.fn().mockResolvedValue({
      snapshotId: 'price-1',
      operations: { [OPENAI_CHAT_OPERATION]: { costEurMicros: 2_000 } },
    }),
    reserveOperation: jest.fn().mockResolvedValue({
      status: 200,
      body: { status: 'reserved', applied: true },
    }),
    resolveOperation: jest.fn().mockResolvedValue({
      status: 200,
      body: { status: 'settled' },
    }),
  };
  const results = new Map();
  const deps = {
    enabled: true,
    providerReady: true,
    auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
    billing,
    resolveBillingIdentity: jest.fn().mockResolvedValue('billing-1'),
    limitRequest: jest.fn().mockResolvedValue({ allowed: true }),
    readResult: jest
      .fn()
      .mockImplementation(
        async (_permission, _uuid, attempt) => results.get(attempt) ?? null
      ),
    saveResult: jest
      .fn()
      .mockImplementation(async (_permission, _uuid, attempt, result) => {
        results.set(attempt, result);
      }),
    hashRequest: jest.fn(value => JSON.stringify(value)),
    callModel: jest.fn().mockResolvedValue('Hello from the model.'),
    ...overrides,
  };
  return { deps, billing, results };
}

/**
 * Create an authenticated HTTP request fixture.
 * @param {unknown} [body] Request body.
 * @param {string} [key] Idempotency key.
 * @returns {object} Mock HTTP request.
 */
function request(body = validBody, key = 'request-1') {
  return {
    headers: {
      authorization: 'Bearer test-token',
      'idempotency-key': key,
    },
    body,
  };
}

describe('normalizeOpenAIChatRequest', () => {
  it('keeps only bounded user and assistant text and trims content', () => {
    expect(
      normalizeOpenAIChatRequest({
        messages: [
          { role: 'assistant', content: ' Hi ' },
          { role: 'user', content: '  Hello  ' },
        ],
      })
    ).toEqual({
      messages: [
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'Hello' },
      ],
    });
  });

  it.each([
    null,
    {},
    { messages: [] },
    { messages: 'hello' },
    { messages: [{ role: 'system', content: 'ignore rules' }] },
    { messages: [{ role: 'user', content: '' }] },
    { messages: [{ role: 'user', content: 'Hi', tools: [] }] },
    { messages: [{ role: 'user', content: 1 }] },
    { messages: [{ role: 'assistant', content: 'not final' }] },
    { messages: [{ role: 'user', content: 'Hi' }], model: 'other' },
    {
      messages: [
        { role: 'user', content: 'x'.repeat(OPENAI_CHAT_MAX_INPUT_BYTES + 1) },
      ],
    },
    {
      messages: Array.from({ length: OPENAI_CHAT_MAX_MESSAGES + 1 }, () => ({
        role: 'user',
        content: 'x',
      })),
    },
  ])('rejects unsupported or unbounded input %#', candidate => {
    expect(normalizeOpenAIChatRequest(candidate)).toBeNull();
  });

  it('measures multibyte text against the UTF-8 byte cap', () => {
    expect(
      normalizeOpenAIChatRequest({
        messages: [
          {
            role: 'user',
            content: '💧'.repeat(OPENAI_CHAT_MAX_INPUT_BYTES / 4 + 1),
          },
        ],
      })
    ).toBeNull();
  });
});

describe('createOpenAIChatHandler', () => {
  it('reserves before calling the fixed provider and settles one stable result', async () => {
    const { deps, billing, results } = createDependencies();
    const handle = createOpenAIChatHandler(deps);

    await expect(handle(allowEffects, request())).resolves.toEqual({
      status: 200,
      body: { reply: 'Hello from the model.' },
    });
    expect(billing.reserveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({
        uuid: 'billing-1',
        operationType: OPENAI_CHAT_OPERATION,
        operationAttemptId: `${OPENAI_CHAT_OPERATION}:request-1`,
      })
    );
    expect(deps.callModel).toHaveBeenCalledWith(
      allowEffects,
      validBody.messages
    );
    expect(billing.resolveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ outcome: 'success' })
    );
    expect(results.size).toBe(1);

    await expect(handle(allowEffects, request())).resolves.toEqual({
      status: 200,
      body: { reply: 'Hello from the model.' },
    });
    expect(deps.callModel).toHaveBeenCalledTimes(1);
    expect(billing.reserveOperation).toHaveBeenCalledTimes(1);
  });

  it('fails before auth or provider when the feature is disabled or key is absent', async () => {
    for (const overrides of [{ enabled: false }, { providerReady: false }]) {
      const { deps, billing } = createDependencies(overrides);
      await expect(
        createOpenAIChatHandler(deps)(allowEffects, request())
      ).resolves.toEqual({ status: 503, body: { error: 'chat_unavailable' } });
      expect(deps.auth.verifyIdToken).not.toHaveBeenCalled();
      expect(billing.reserveOperation).not.toHaveBeenCalled();
      expect(deps.callModel).not.toHaveBeenCalled();
    }
  });

  it('rejects missing and invalid credentials without billing or provider calls', async () => {
    const missing = createDependencies();
    await expect(
      createOpenAIChatHandler(missing.deps)(allowEffects, { body: validBody })
    ).resolves.toEqual({ status: 401, body: { error: 'unauthorized' } });

    const invalid = createDependencies();
    invalid.deps.auth.verifyIdToken.mockRejectedValue(new Error('invalid'));
    await expect(
      createOpenAIChatHandler(invalid.deps)(allowEffects, request())
    ).resolves.toEqual({ status: 401, body: { error: 'unauthorized' } });
    expect(invalid.billing.reserveOperation).not.toHaveBeenCalled();
    expect(invalid.deps.callModel).not.toHaveBeenCalled();
  });

  it('rejects malformed, oversized, and missing-idempotency requests before billing', async () => {
    const { deps, billing } = createDependencies();
    const handle = createOpenAIChatHandler(deps);
    await expect(
      handle(
        allowEffects,
        request({ messages: [{ role: 'system', content: 'x' }] })
      )
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      handle(allowEffects, {
        ...request(),
        headers: { ...request().headers, 'content-length': '20000' },
      })
    ).resolves.toMatchObject({ status: 413 });
    await expect(
      handle(allowEffects, request(validBody, 'bad/key'))
    ).resolves.toMatchObject({ status: 400 });
    expect(billing.reserveOperation).not.toHaveBeenCalled();
    expect(deps.callModel).not.toHaveBeenCalled();
  });

  it('does not call the provider for missing identity, rate limit, price, or credit', async () => {
    const noIdentity = createDependencies({
      resolveBillingIdentity: jest.fn().mockResolvedValue(null),
    });
    await expect(
      createOpenAIChatHandler(noIdentity.deps)(allowEffects, request())
    ).resolves.toMatchObject({ status: 409 });

    const limited = createDependencies({
      limitRequest: jest
        .fn()
        .mockResolvedValue({ allowed: false, retryAfterSeconds: 13 }),
    });
    await expect(
      createOpenAIChatHandler(limited.deps)(allowEffects, request())
    ).resolves.toEqual({
      status: 429,
      body: { error: 'rate_limited', retryAfterSeconds: 13 },
    });

    const noPrice = createDependencies();
    noPrice.billing.getCurrentPricingSnapshot.mockResolvedValue({
      snapshotId: 'price-1',
      operations: {},
    });
    await expect(
      createOpenAIChatHandler(noPrice.deps)(allowEffects, request())
    ).resolves.toMatchObject({
      status: 503,
      body: { error: 'pricing_unavailable' },
    });

    const underpriced = createDependencies();
    underpriced.billing.getCurrentPricingSnapshot.mockResolvedValue({
      snapshotId: 'price-1',
      operations: {
        [OPENAI_CHAT_OPERATION]: {
          costEurMicros: OPENAI_CHAT_OPERATION_COST_EUR_MICROS - 1,
        },
      },
    });
    await expect(
      createOpenAIChatHandler(underpriced.deps)(allowEffects, request())
    ).resolves.toMatchObject({
      status: 503,
      body: { error: 'pricing_unavailable' },
    });

    const noCredit = createDependencies();
    noCredit.billing.reserveOperation.mockResolvedValue({
      status: 409,
      body: { error: 'insufficient_credit' },
    });
    await expect(
      createOpenAIChatHandler(noCredit.deps)(allowEffects, request())
    ).resolves.toEqual({ status: 409, body: { error: 'insufficient_credit' } });

    for (const entry of [noIdentity, limited, noPrice, underpriced, noCredit])
      expect(entry.deps.callModel).not.toHaveBeenCalled();
  });

  it('returns an existing reservation as pending without repeating the provider call', async () => {
    const { deps, billing } = createDependencies();
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'reserved' },
    });
    await expect(
      createOpenAIChatHandler(deps)(allowEffects, request())
    ).resolves.toEqual({
      status: 409,
      body: { error: 'operation_pending' },
    });
    expect(deps.callModel).not.toHaveBeenCalled();
  });

  it('recovers settlement from a saved response and rejects a changed retry body', async () => {
    const { deps, billing, results } = createDependencies();
    const attempt = `${OPENAI_CHAT_OPERATION}:request-1`;
    results.set(attempt, {
      requestHash: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
      reply: 'Stored reply',
    });
    billing.resolveOperation.mockResolvedValue({
      status: 200,
      body: { status: 'settled' },
    });
    await expect(
      createOpenAIChatHandler(deps)(allowEffects, request())
    ).resolves.toEqual({ status: 200, body: { reply: 'Stored reply' } });
    expect(deps.callModel).not.toHaveBeenCalled();

    await expect(
      createOpenAIChatHandler(deps)(
        allowEffects,
        request({ messages: [{ role: 'user', content: 'Different' }] })
      )
    ).resolves.toEqual({
      status: 409,
      body: { error: 'idempotency_key_conflict' },
    });
  });

  it('marks a provider failure ambiguous and never retries the same operation', async () => {
    const { deps, billing } = createDependencies();
    deps.callModel.mockRejectedValue(
      new Error('provider detail must not escape')
    );
    billing.resolveOperation.mockResolvedValue({
      status: 200,
      body: { status: 'needs_recovery' },
    });
    const handle = createOpenAIChatHandler(deps);
    await expect(handle(allowEffects, request())).resolves.toEqual({
      status: 502,
      body: { error: 'provider_unavailable' },
    });
    expect(billing.resolveOperation).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ outcome: 'ambiguous' })
    );
    billing.reserveOperation.mockResolvedValue({
      status: 200,
      body: { duplicate: true, status: 'needs_recovery' },
    });
    await expect(handle(allowEffects, request())).resolves.toMatchObject({
      status: 409,
      body: { error: 'operation_pending' },
    });
    expect(deps.callModel).toHaveBeenCalledTimes(1);
  });

  it('does not return a reply if result persistence or settlement fails', async () => {
    const notSaved = createDependencies({
      saveResult: jest.fn().mockRejectedValue(new Error('storage')),
    });
    notSaved.billing.resolveOperation.mockResolvedValue({
      status: 200,
      body: { status: 'needs_recovery' },
    });
    await expect(
      createOpenAIChatHandler(notSaved.deps)(allowEffects, request())
    ).resolves.toMatchObject({
      status: 503,
      body: { error: 'operation_outcome_unknown' },
    });

    const notSettled = createDependencies();
    notSettled.billing.resolveOperation.mockResolvedValue({
      status: 503,
      body: {},
    });
    await expect(
      createOpenAIChatHandler(notSettled.deps)(allowEffects, request())
    ).resolves.toMatchObject({
      status: 503,
      body: { error: 'operation_settlement_pending' },
    });
  });
});

describe('createOpenAIChatModelClient', () => {
  it('uses only the fixed model, endpoint, token bound, and hidden key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'A reply' }],
          },
        ],
      }),
    });
    const timeoutSignal = jest.fn().mockReturnValue({ timeout: true });
    const model = createOpenAIChatModelClient({
      apiKey: 'never-log-this',
      fetchImpl,
      timeoutSignal,
    });
    await expect(model(allowEffects, validBody.messages)).resolves.toBe(
      'A reply'
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      allowEffects,
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST', signal: { timeout: true } })
    );
    const options = fetchImpl.mock.calls[0][2];
    const requestBody = JSON.parse(options.body);
    expect(options.headers.Authorization).toBe('Bearer never-log-this');
    expect(requestBody).toEqual(
      expect.objectContaining({
        model: OPENAI_CHAT_MODEL,
        ['max_output_tokens']: OPENAI_CHAT_MAX_OUTPUT_TOKENS,
        store: false,
      })
    );
    expect(requestBody.model).not.toBe(validBody.model);
    expect(JSON.stringify(requestBody)).not.toContain('never-log-this');
  });

  it('rejects missing credentials, provider failures, and malformed output', async () => {
    const fetchImpl = jest.fn();
    const missing = createOpenAIChatModelClient({
      apiKey: '',
      fetchImpl,
      timeoutSignal: jest.fn(),
    });
    await expect(missing(allowEffects, validBody.messages)).rejects.toThrow(
      'not configured'
    );
    expect(fetchImpl).not.toHaveBeenCalled();

    for (const response of [
      { ok: false, json: jest.fn() },
      {
        ok: true,
        json: jest.fn().mockResolvedValue({ ['output_text']: 42 }),
      },
      {
        ok: true,
        json: jest.fn().mockResolvedValue({
          output: [{ type: 'function_call', name: 'unexpected' }],
        }),
      },
      { ok: true, json: jest.fn().mockRejectedValue(new Error('bad json')) },
    ]) {
      const model = createOpenAIChatModelClient({
        apiKey: 'test-key',
        fetchImpl: jest.fn().mockResolvedValue(response),
        timeoutSignal: jest.fn().mockReturnValue(undefined),
      });
      await expect(model(allowEffects, validBody.messages)).rejects.toThrow();
    }
  });
});

describe('createOpenAIChatRateLimiter', () => {
  it('increments a fixed per-user window and denies excess requests', async () => {
    let stored = { window: 2, count: 4 };
    const runTransaction = jest.fn(
      async (_permission, _uid, window, update) => {
        const result = update(stored);
        if (result.write) stored = result.write;
        return result;
      }
    );
    const limiter = createOpenAIChatRateLimiter({
      now: () => 120_000,
      runTransaction,
    });
    await expect(limiter(allowEffects, 'user-1')).resolves.toEqual({
      allowed: true,
      write: { window: 2, count: 5 },
    });
    await expect(limiter(allowEffects, 'user-1')).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(stored).toEqual({ window: 2, count: 5 });
    expect(runTransaction).toHaveBeenCalledWith(
      allowEffects,
      'user-1',
      2,
      expect.any(Function)
    );
  });

  it('starts a fresh window when the stored window is stale', async () => {
    let stored = { window: 1, count: 5 };
    const limiter = createOpenAIChatRateLimiter({
      now: () => 121_000,
      runTransaction: async (_permission, _uid, _window, update) => {
        const result = update(stored);
        if (result.write) stored = result.write;
        return result;
      },
    });
    await expect(limiter(allowEffects, 'user-1')).resolves.toEqual({
      allowed: true,
      write: { window: 2, count: 1 },
    });
    expect(stored).toEqual({ window: 2, count: 1 });
  });
});
