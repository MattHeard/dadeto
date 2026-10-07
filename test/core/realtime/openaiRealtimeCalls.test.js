import { jest } from '@jest/globals';
import {
  OPENAI_REALTIME_CALLS_URL,
  buildRealtimeCallForm,
  exchangeRealtimeCallSdp as exchangeRealtimeCallSdpCore,
  resolveOpenAiApiKey,
} from '../../../src/core/realtime/openaiRealtimeCalls.js';

const permission = Object.freeze({});
const exchangeRealtimeCallSdp = (sdpOffer, options) => {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  return exchangeRealtimeCallSdpCore(sdpOffer, {
    ...(options ?? {}),
    fetchImpl: (_permission, ...args) => fetchImpl(...args),
    bindEffectBoundary: handler => handler(permission),
  });
};

class FakeFormData {
  constructor() {
    this.fields = new Map();
  }

  set(key, value) {
    this.fields.set(key, value);
  }
}

describe('openaiRealtimeCalls core', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    }

    globalThis.fetch = originalFetch;
  });

  test('reads the process environment when the environment bag is undefined', () => {
    process.env.OPENAI_API_KEY = 'process-key';

    expect(resolveOpenAiApiKey(undefined)).toBe('process-key');
  });

  test('uses null options through the core exchange path', async () => {
    process.env.OPENAI_API_KEY = 'process-key';
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers([['location', '/default-call']]),
    }));

    await expect(exchangeRealtimeCallSdp('offer-sdp', null)).resolves.toEqual({
      sdpAnswer: 'answer-sdp',
      location: '/default-call',
    });
  });

  test('requires an injected permission-aware fetch and effect boundary', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(
      exchangeRealtimeCallSdpCore('offer-sdp', null)
    ).rejects.toThrow('OPENAI_API_KEY is required');
    await expect(
      exchangeRealtimeCallSdpCore('offer-sdp', { apiKey: 'key' })
    ).rejects.toThrow(TypeError);
    await expect(
      exchangeRealtimeCallSdpCore('offer-sdp', {
        apiKey: 'key',
        fetchImpl: jest.fn(),
      })
    ).rejects.toThrow(TypeError);
    await expect(
      exchangeRealtimeCallSdpCore('offer-sdp', {
        apiKey: 'key',
        bindEffectBoundary: handler => handler(permission),
      })
    ).rejects.toThrow(TypeError);
  });

  test('forwards the boundary permission as the first fetch argument', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers(),
    }));
    await exchangeRealtimeCallSdpCore('offer-sdp', {
      apiKey: 'key',
      fetchImpl,
      bindEffectBoundary: handler => handler(permission),
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      permission,
      OPENAI_REALTIME_CALLS_URL,
      expect.any(Object)
    );
  });

  test('builds a multipart form with a custom FormData constructor', () => {
    const form = buildRealtimeCallForm('offer-sdp', {
      FormDataCtor: FakeFormData,
      sessionConfigJson: '{"type":"realtime"}',
    });

    expect(form.fields.get('sdp')).toBe('offer-sdp');
    expect(form.fields.get('session')).toBe('{"type":"realtime"}');
  });

  test('uses the OpenAI realtime calls URL by default', async () => {
    process.env.OPENAI_API_KEY = 'process-key';
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers([['location', '/default-call']]),
    }));

    await exchangeRealtimeCallSdp('offer-sdp', { fetchImpl: globalThis.fetch });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      OPENAI_REALTIME_CALLS_URL,
      expect.any(Object)
    );
  });

  test('returns an empty API key when the environment omits it', () => {
    expect(resolveOpenAiApiKey({})).toBe('');
  });

  test('uses an explicit key, endpoint, and session config', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => 'custom-answer',
      headers: new Headers(),
    }));

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', {
        apiKey: 'explicit-key',
        url: 'https://example.test/calls',
        fetchImpl,
      })
    ).resolves.toEqual({ sdpAnswer: 'custom-answer', location: '' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/calls',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer explicit-key' },
      })
    );
  });

  test('rejects missing API keys and unsuccessful responses', async () => {
    await expect(
      exchangeRealtimeCallSdp('offer-sdp', {
        apiKey: '',
        fetchImpl: jest.fn(),
      })
    ).rejects.toThrow('OPENAI_API_KEY is required');

    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => 'bad-answer',
      headers: new Headers(),
    }));
    await expect(
      exchangeRealtimeCallSdp('offer-sdp', { apiKey: 'key', fetchImpl })
    ).rejects.toThrow('status 400');
  });
});
