import { describe, expect, it, jest } from '@jest/globals';
import { createGoogleAuthStatusHandle } from '../../../src/core/browser/google-auth-status.js';

/**
 * Create an element-like stub with style and event support.
 * @returns {{style: Record<string, string>, addEventListener: jest.Mock, listeners: Record<string, Function>}} Element stub.
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
  it('shows signed-in controls immediately when an id token exists', () => {
    const signInButton = createElement();
    const signOutWrap = createElement();
    const adminLink = createElement();
    const initGoogleSignInFn = jest.fn();
    const handle = createGoogleAuthStatusHandle({
      documentObj: {
        querySelectorAll: jest.fn(selector => {
          if (selector === '#signinButton') {
            return [signInButton];
          }
          if (selector === '#signoutWrap') {
            return [signOutWrap];
          }
          if (selector === '.admin-link') {
            return [adminLink];
          }
          return [];
        }),
      },
      initGoogleSignInFn,
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
    expect(adminLink.style.display).toBe('');
  });

  it('wires sign-in callback and sign-out link display updates', async () => {
    const signInButton = createElement();
    const signOutWrap = createElement();
    const signOutLink = createElement();
    const adminLink = createElement();
    let onSignIn;
    const signOutFn = jest.fn().mockResolvedValue(undefined);
    const handle = createGoogleAuthStatusHandle({
      documentObj: {
        querySelectorAll: jest.fn(selector => {
          if (selector === '#signinButton') {
            return [signInButton];
          }
          if (selector === '#signoutWrap') {
            return [signOutWrap];
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
      signOutFn,
      getIdTokenFn: jest.fn().mockReturnValue(null),
      isAdminFn: jest.fn().mockReturnValue(false),
    });

    handle();
    onSignIn();

    expect(signInButton.style.display).toBe('none');
    expect(signOutWrap.style.display).toBe('');
    expect(adminLink.style.display).toBeUndefined();

    const event = { preventDefault: jest.fn() };
    await signOutLink.listeners.click(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(signOutFn).toHaveBeenCalled();
    expect(signInButton.style.display).toBe('');
    expect(signOutWrap.style.display).toBe('none');
    expect(adminLink.style.display).toBe('none');
  });
});
