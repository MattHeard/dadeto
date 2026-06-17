import { jest } from '@jest/globals';
import {
  OPENAI_REALTIME_CALLS_URL,
  buildRealtimeCallForm,
  exchangeRealtimeCallSdp,
  resolveOpenAiApiKey,
} from '../../src/local/openaiRealtimeCalls.js';

class FakeFormData {
  constructor() {
    this.fields = new Map();
  }

  set(key, value) {
    this.fields.set(key, value);
  }
}

describe('openaiRealtimeCalls', () => {
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

  test('resolves the API key from local server environment configuration', () => {
    expect(resolveOpenAiApiKey({ OPENAI_API_KEY: 'server-key' })).toBe(
      'server-key'
    );
  });

  test('falls back to process environment and empty missing API keys', () => {
    process.env.OPENAI_API_KEY = 'process-key';

    expect(resolveOpenAiApiKey()).toBe('process-key');
    expect(resolveOpenAiApiKey({})).toBe('');
  });

  test('reads the process environment when the environment bag is undefined', () => {
    process.env.OPENAI_API_KEY = 'process-key';

    expect(resolveOpenAiApiKey(undefined)).toBe('process-key');
  });

  test('builds a default multipart form with the standard session config', () => {
    const form = buildRealtimeCallForm('offer-sdp');
    const session = JSON.parse(form.get('session'));

    expect(form.get('sdp')).toBe('offer-sdp');
    expect(session).toEqual(
      expect.objectContaining({
        type: 'realtime',
        model: 'gpt-realtime-2',
      })
    );
  });

  test('builds a multipart form with SDP and minimal session config', () => {
    const form = buildRealtimeCallForm('offer-sdp', {
      FormDataCtor: FakeFormData,
      sessionConfigJson: '{"type":"realtime"}',
    });

    expect(form.fields.get('sdp')).toBe('offer-sdp');
    expect(form.fields.get('session')).toBe('{"type":"realtime"}');
  });

  test('exchanges browser SDP with OpenAI using the server API key only', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => 'answer-sdp',
      headers: new Map([['location', '/v1/realtime/calls/call_123']]),
    }));

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', { apiKey: 'server-key', fetchImpl })
    ).resolves.toEqual({
      sdpAnswer: 'answer-sdp',
      location: '/v1/realtime/calls/call_123',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      OPENAI_REALTIME_CALLS_URL,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer server-key',
        },
      })
    );
  });

  test('uses default exchange options with process API key and global fetch', async () => {
    process.env.OPENAI_API_KEY = 'process-key';
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers([['location', '/default-call']]),
    }));

    await expect(exchangeRealtimeCallSdp('offer-sdp')).resolves.toEqual({
      sdpAnswer: 'answer-sdp',
      location: '/default-call',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      OPENAI_REALTIME_CALLS_URL,
      expect.any(Object)
    );
  });

  test('uses the default options object when exchange options are undefined', async () => {
    process.env.OPENAI_API_KEY = 'process-key';
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers([['location', '/default-call']]),
    }));

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', undefined)
    ).resolves.toEqual({
      sdpAnswer: 'answer-sdp',
      location: '/default-call',
    });
  });

  test('uses the default options object when exchange options are null', async () => {
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

  test('uses process API key, global fetch, custom URL, and empty missing location', async () => {
    process.env.OPENAI_API_KEY = 'process-key';
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'answer-sdp',
      headers: new Headers(),
    }));

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', {
        url: 'https://relay.example/calls',
      })
    ).resolves.toEqual({
      sdpAnswer: 'answer-sdp',
      location: '',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://relay.example/calls',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer process-key',
        },
      })
    );
  });

  test('surfaces OpenAI response failures without leaking response body', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'sensitive upstream error',
      headers: new Headers(),
    }));

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', { apiKey: 'server-key', fetchImpl })
    ).rejects.toThrow('OpenAI Realtime call failed with status 503.');
  });

  test('requires an API key before calling OpenAI', async () => {
    const fetchImpl = jest.fn();

    await expect(
      exchangeRealtimeCallSdp('offer-sdp', { apiKey: '', fetchImpl })
    ).rejects.toThrow('OPENAI_API_KEY is required');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
