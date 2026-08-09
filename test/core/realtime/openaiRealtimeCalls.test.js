import { jest } from '@jest/globals';
import {
  OPENAI_REALTIME_CALLS_URL,
  buildRealtimeCallForm,
  exchangeRealtimeCallSdp,
  resolveOpenAiApiKey,
} from '../../../src/core/realtime/openaiRealtimeCalls.js';

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

  test('builds a multipart form with a custom FormData constructor', () => {
    const form = buildRealtimeCallForm('offer-sdp', {
      FormDataCtor: FakeFormData,
      sessionConfigJson: '{"type":"realtime"}',
    });

    expect(form.fields.get('sdp')).toBe('offer-sdp');
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
