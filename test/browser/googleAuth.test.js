import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { readFileSync } from 'fs';

let initGoogleSignIn;
let signOut;
let getIdToken;
let isAdmin;
let getAuthorUuid;

describe('googleAuth', () => {
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
    global.window = { google: undefined };
    global.google = undefined;
    global.location = { hostname: 'localhost' };
    globalThis.location = global.location;
    global.window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ getAuthorUuidUrl: '/author-uuid' }),
    });
    const el = { innerHTML: '' };
    global.document = {
      getElementById: jest.fn().mockReturnValue(el),
      querySelectorAll: jest.fn().mockReturnValue([el]),
    };
    global.atob = str => Buffer.from(str, 'base64').toString('binary');
    ({ initGoogleSignIn, signOut, getIdToken, isAdmin, getAuthorUuid } =
      await import('../../src/browser/googleAuth.js'));
  });

  it('logs an error when google object is missing', () => {
    console.error = jest.fn();
    initGoogleSignIn();
    expect(console.error).toHaveBeenCalledWith(
      'Google Identity script missing'
    );
  });

  it('signOut clears token and disables auto select', async () => {
    const disableAutoSelect = jest.fn();
    global.window.google = { accounts: { id: { disableAutoSelect } } };
    global.google = global.window.google;
    sessionStorage.setItem('id_token', 'tok');
    sessionStorage.setItem('author_uuid', 'author-1');
    await signOut();
    expect(sessionStorage.getItem('id_token')).toBeNull();
    expect(sessionStorage.getItem('author_uuid')).toBeNull();
    expect(disableAutoSelect).toHaveBeenCalled();
  });

  it('exports the cached author uuid helper used by header links', () => {
    sessionStorage.setItem('author_uuid', 'author-1');

    expect(getAuthorUuid()).toBe('author-1');
  });

  it('exports the cached ID token helper used by static pages', () => {
    sessionStorage.setItem('id_token', 'tok');

    expect(getIdToken()).toBe('tok');
  });

  it('exports the admin token helper used by static pages', () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'qcYSrXTaj1MZUoFsAloBwT86GNM2' })
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    sessionStorage.setItem('id_token', `header.${payload}.signature`);

    expect(isAdmin()).toBe(true);
  });

  it('renders the correct theme and updates on scheme change', () => {
    const renderButton = jest.fn();
    const listeners = {};
    const mql = {
      matches: false,
      addEventListener: (ev, cb) => {
        listeners[ev] = cb;
      },
    };
    const el = { innerHTML: '' };
    global.document.getElementById.mockReturnValue(el);
    global.document.querySelectorAll.mockReturnValue([el]);
    global.window = {
      google: { accounts: { id: { initialize: jest.fn(), renderButton } } },
      matchMedia: jest.fn().mockReturnValue(mql),
    };
    global.google = global.window.google;
    initGoogleSignIn();
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ theme: 'filled_blue' })
    );
    renderButton.mockClear();
    mql.matches = true;
    listeners.change();
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ theme: 'filled_black' })
    );
  });

  it('skips Google sign-in on the internal Playwright origin', async () => {
    const init = jest.fn();
    global.location = { hostname: '10.132.0.54' };
    globalThis.location = global.location;
    global.window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
    });
    global.window.google = {
      accounts: { id: { initialize: init, renderButton: jest.fn() } },
    };
    global.google = global.window.google;

    await initGoogleSignIn();

    expect(init).not.toHaveBeenCalled();
  });

  it('keeps the public browser bundle aligned with the internal origin guard', () => {
    const publicBrowserGoogleAuth = readFileSync(
      '/home/matt/dadeto/src/browser/googleAuth.js',
      'utf8'
    );

    expect(publicBrowserGoogleAuth).toContain('isInternalOrigin: () =>');
    expect(publicBrowserGoogleAuth).toContain(
      'export const initGoogleSignIn = handle.initGoogleSignIn;'
    );
    expect(publicBrowserGoogleAuth).toContain('installAuthorUuidCaching');
  });
});
