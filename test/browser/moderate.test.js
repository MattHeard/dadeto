import { describe, it, expect, jest, beforeEach } from '@jest/globals';
let authedFetch;

describe('authedFetch', () => {
  beforeEach(async () => {
    global.sessionStorage = {
      store: {},
      getItem(key) {
        return this.store[key] || null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
      removeItem(key) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    };
    sessionStorage.clear();
    const el = { innerHTML: '', style: {} };
    global.window = {
      google: {
        accounts: {
          id: {
            initialize: jest.fn(),
            renderButton: jest.fn(),
            disableAutoSelect: jest.fn(),
          },
        },
      },
      matchMedia: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
      }),
    };
    global.google = global.window.google;
    global.document = {
      getElementById: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([el]),
    };
    global.fetch = jest.fn();
    ({ authedFetch } = await import('../../src/cloud/moderate.js'));
  });

  it('throws when not signed in', async () => {
    await expect(authedFetch('/api')).rejects.toThrow('not signed in');
  });

  it('sends token and returns json', async () => {
    sessionStorage.setItem('id_token', 'abc');
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    const result = await authedFetch('/api', { method: 'POST' });
    expect(global.fetch).toHaveBeenCalledWith('/api', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer abc',
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual({ ok: true });
  });

  it('throws on HTTP errors', async () => {
    sessionStorage.setItem('id_token', 'abc');
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(authedFetch('/api')).rejects.toThrow('HTTP 500');
  });
});
