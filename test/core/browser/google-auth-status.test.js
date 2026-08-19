import { describe, expect, it, jest } from '@jest/globals';
import { createGoogleAuthStatusHandle } from '../../../src/core/browser/google-auth-status.js';

/**
 * Create an element-like stub with style and event support.
 * @returns {{style: Record<string, string>, addEventListener: jest.Mock, listeners: Record<string, (...args: never[]) => unknown>}} Element stub.
 */
function createElement() {
  const listeners = {};
  return {
    style: {},
    listeners,
    addEventListener: jest.fn((eventName, listener) => {
      listeners[eventName] = listener;
    }),
  };
}

describe('createGoogleAuthStatusHandle', () => {
  it('shows signed-in controls immediately when an id token exists', async () => {
    const signInButton = createElement();
    const signOutWrap = createElement();
    const profileLink = createElement();
    const adminLink = createElement();
    const initGoogleSignInFn = jest.fn();
    let authorUuid = null;
    const refreshAuthorUuidFn = jest.fn(() => {
      authorUuid = 'author-1';
    });
    const handle = createGoogleAuthStatusHandle({
      documentObj: {
        querySelectorAll: jest.fn(selector => {
          if (selector === '#signinButton') {
            return [signInButton];
          }
          if (selector === '#signoutWrap') {
            return [signOutWrap];
          }
          if (selector === '#profileLink') {
            return [profileLink];
          }
          if (selector === '.admin-link') {
            return [adminLink];
          }
          return [];
        }),
      },
      initGoogleSignInFn,
      getAuthorUuidFn: () => authorUuid,
      refreshAuthorUuidFn,
      signOutFn: jest.fn(),
      getIdTokenFn: jest.fn().mockReturnValue('token'),
      isAdminFn: jest.fn().mockReturnValue(true),
    });

    handle();

    expect(initGoogleSignInFn).toHaveBeenCalledWith({
      onSignIn: expect.any(Function),
    });
    expect(signInButton.style.display).toBe('none');
    expect(signOutWrap.style.display).toBe('');
    expect(profileLink.style.display).toBe('none');
    expect(adminLink.style.display).toBe('');
    expect(refreshAuthorUuidFn).toHaveBeenCalled();
    await Promise.resolve();
    expect(profileLink.style.display).toBe('');
    expect(profileLink.href).toContain('/a/author-1.html');
  });

  it('wires sign-in callback and sign-out link display updates', async () => {
    const signInButton = createElement();
    const signOutWrap = createElement();
    const profileLink = createElement();
    const signOutLink = createElement();
    const adminLink = createElement();
    let onSignIn;
    const signOutFn = jest.fn().mockResolvedValue(undefined);
    const getIdTokenFn = jest.fn().mockReturnValue(null);
    const handle = createGoogleAuthStatusHandle({
      documentObj: {
        querySelectorAll: jest.fn(selector => {
          if (selector === '#signinButton') {
            return [signInButton];
          }
          if (selector === '#signoutWrap') {
            return [signOutWrap];
          }
          if (selector === '#profileLink') {
            return [profileLink];
          }
          if (selector === '#signoutLink') {
            return [signOutLink];
          }
          if (selector === '.admin-link') {
            return [adminLink];
          }
          return [];
        }),
      },
      initGoogleSignInFn: options => {
        onSignIn = options.onSignIn;
      },
      getAuthorUuidFn: jest.fn().mockReturnValue('author-2'),
      signOutFn,
      getIdTokenFn,
      isAdminFn: jest.fn().mockReturnValue(false),
    });

    handle();
    expect(signInButton.style.display).toBeUndefined();
    expect(signOutWrap.style.display).toBeUndefined();
    expect(profileLink.style.display).toBeUndefined();
    getIdTokenFn.mockReturnValue('token');
    expect(() => handle()).not.toThrow();
    onSignIn();

    expect(signInButton.style.display).toBe('none');
    expect(signOutWrap.style.display).toBe('');
    expect(profileLink.style.display).toBe('');
    expect(profileLink.href).toContain('/a/author-2.html');
    expect(adminLink.style.display).toBeUndefined();

    const event = { preventDefault: jest.fn() };
    await signOutLink.listeners.click(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(signOutFn).toHaveBeenCalled();
    expect(signInButton.style.display).toBe('');
    expect(signOutWrap.style.display).toBe('none');
    expect(profileLink.style.display).toBe('none');
    expect(profileLink.href).toBe('#');
    expect(adminLink.style.display).toBe('none');
  });
});
