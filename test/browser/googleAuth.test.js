import { describe, it, expect, jest, beforeEach } from '@jest/globals';

let initGoogleSignIn;
let signOut;
let isAdmin;

const encode = obj =>
  Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

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
    global.document = { getElementById: jest.fn() };
    global.atob = str => Buffer.from(str, 'base64').toString('binary');
    ({ initGoogleSignIn, signOut, isAdmin } = await import(
      '../../infra/googleAuth.js'
    ));
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
    await signOut();
    expect(sessionStorage.getItem('id_token')).toBeNull();
    expect(disableAutoSelect).toHaveBeenCalled();
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
    global.document.getElementById.mockReturnValue({ innerHTML: '' });
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

  it('isAdmin checks token payload', () => {
    const makeToken = uid => `h.${encode({ sub: uid })}.s`;
    sessionStorage.setItem(
      'id_token',
      makeToken('qcYSrXTaj1MZUoFsAloBwT86GNM2')
    );
    expect(isAdmin()).toBe(true);
    sessionStorage.setItem('id_token', makeToken('other'));
    expect(isAdmin()).toBe(false);
  });
});
