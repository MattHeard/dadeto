import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  initGoogleSignIn,
  getIdToken,
  signOut,
} from '../../infra/googleAuth.js';

describe('googleAuth', () => {
  beforeEach(() => {
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
  });

  it('logs an error when google object is missing', () => {
    console.error = jest.fn();
    initGoogleSignIn();
    expect(console.error).toHaveBeenCalledWith(
      'Google Identity script missing'
    );
  });

  it('initializes and stores token', () => {
    const initialize = jest.fn();
    const renderButton = jest.fn();
    global.window.google = {
      accounts: {
        id: { initialize, renderButton, disableAutoSelect: jest.fn() },
      },
    };
    global.google = global.window.google;
    const credential = 'tok';
    initGoogleSignIn({ onSignIn: jest.fn() });
    const args = initialize.mock.calls[0][0];
    expect(args.ux_mode).toBe('popup');
    args.callback({ credential });
    expect(sessionStorage.getItem('id_token')).toBe(credential);
    expect(getIdToken()).toBe(credential);
  });

  it('signOut clears token and disables auto select', () => {
    const disableAutoSelect = jest.fn();
    global.window.google = { accounts: { id: { disableAutoSelect } } };
    global.google = global.window.google;
    sessionStorage.setItem('id_token', 'tok');
    signOut();
    expect(sessionStorage.getItem('id_token')).toBeNull();
    expect(disableAutoSelect).toHaveBeenCalled();
  });
});
