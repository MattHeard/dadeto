import { describe, expect, test, jest } from '@jest/globals';
import {
  applyCleanupHandlers,
  applyBaseCleanupHandlers,
  areValidStrings,
  createDefaultHandler,
  createElementRemover,
  createGoogleSignOut,
  createPrefixedLogger,
  createPrefixedLoggers,
  createRemoveListener,
  deepClone,
  deepMerge,
  defaultHandler,
  getIdToken,
  getFirstErrorMessage,
  getInputValue,
  guardThen,
  isBlankStringValue,
  isDisposable,
  isNullishOrEmptyString,
  mapValues,
  maybeRemoveElement,
  normalizeObjectOrFallback,
  parseExistingKeys,
  parseJsonObject,
  parseJsonOrDefault,
  pick,
  returnErrorResultOrValue,
  safeJsonParse,
  safeParseJson,
  valueOr,
} from '../../../src/core/browser/browser-core.js';

describe('browser-core helpers', () => {
  test('creates prefixed loggers and no-op loggers', () => {
    const logger = jest.fn();
    const prefixed = createPrefixedLogger(logger, 'pfx');
    prefixed('hello', 1);
    expect(logger).toHaveBeenCalledWith('pfx', 'hello', 1);

    const prefixedLoggers = createPrefixedLoggers(
      {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
      'pfx'
    );
    prefixedLoggers.logInfo('hello');
    expect(prefixedLoggers.logInfo).toEqual(expect.any(Function));
    expect(createPrefixedLogger(null, 'pfx')()).toBeUndefined();
  });

  test('validates strings and normalizes blanks', () => {
    expect(areValidStrings('a', 'b')).toBe(true);
    expect(areValidStrings('a', '')).toBe(false);
    expect(isBlankStringValue('   ')).toBe(true);
    expect(isBlankStringValue('value')).toBe(false);
    expect(valueOr(undefined, 'fallback')).toBe('fallback');
  });

  test('guards and picks object data', () => {
    const effect = jest.fn();
    expect(guardThen(false, effect)).toBe(false);
    expect(guardThen(true, effect)).toBe(true);
    expect(effect).toHaveBeenCalledTimes(1);

    expect(pick({ a: 1, b: 2 }, ['a', 'c'])).toEqual({ a: 1 });
    expect(pick(null, ['a'])).toEqual({});
  });

  test('maps values and clones deep structures', () => {
    expect(mapValues({ a: 1 }, value => value + 1)).toEqual({ a: 2 });
    expect(mapValues(null, value => value)).toEqual({});
    const obj = { nested: { ok: true } };
    expect(deepClone(obj)).toEqual(obj);
  });

  test('handles parse and normalize helpers', () => {
    expect(returnErrorResultOrValue('boom', () => 'fallback')).toEqual({
      error: 'boom',
    });
    expect(returnErrorResultOrValue(null, () => 'fallback')).toBe('fallback');
    expect(normalizeObjectOrFallback(null, () => ({ empty: true }), value => value)).toEqual({
      empty: true,
    });
    expect(isNullishOrEmptyString('')).toBe(true);
  });

  test('parses JSON helpers and existing keys', () => {
    expect(safeJsonParse('{"ok":true}')).toEqual({
      ok: true,
      data: { ok: true },
    });
    expect(parseJsonObject('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonObject('not json')).toBeNull();
    expect(parseJsonOrDefault('{"ok":true}')).toEqual({ ok: true });
    expect(safeParseJson('{"ok":true}', JSON.parse)).toEqual({ ok: true });
    expect(parseExistingKeys({ existingKeys: ['a'] })).toEqual(['a']);
    expect(parseExistingKeys({})).toEqual([]);
  });

  test('supports cleanup and persistence helpers', () => {
    const dispose = jest.fn();
    const dom = {
      removeEventListener: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(() => ({ _dispose: dispose })),
    };
    const removeListener = createRemoveListener({
      dom,
      el: {},
      event: 'input',
      handler: () => {},
    });
    removeListener();
    expect(dom.removeEventListener).toHaveBeenCalled();
    expect(isDisposable({ _dispose() {} })).toBe(true);
    expect(maybeRemoveElement({ _dispose: dispose }, {}, dom)).toBeUndefined();
  });

  test('handles auth and id token helpers', async () => {
    const storage = {
      getItem: jest.fn(() => 'token'),
      removeItem: jest.fn(),
    };
    expect(getIdToken(storage)).toBe('token');
    const signOut = createGoogleSignOut({
      authSignOut: jest.fn(async () => {}),
      storage,
      disableAutoSelect: jest.fn(),
    });
    await signOut();
    expect(storage.removeItem).toHaveBeenCalledWith('id_token');
  });

  test('applies base cleanup handlers and default handler', () => {
    const dom = {
      hide: jest.fn(),
      disable: jest.fn(),
      querySelector: jest.fn(() => null),
      removeChild: jest.fn(),
    };
    const textInput = {};
    const cleanup = jest.fn();

    const handler = createDefaultHandler([cleanup]);
    handler(dom, {}, textInput);
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(cleanup).toHaveBeenCalled();

    applyBaseCleanupHandlers({ container: {}, dom, extraHandlers: [cleanup] });
    expect(cleanup).toHaveBeenCalled();
    defaultHandler(dom, {}, textInput);
  });

  describe('getFirstErrorMessage', () => {
    test('returns the message for the first matching predicate', () => {
      const checks = [
        [value => value === 'foo', 'foo message'],
        [value => value === 'bar', 'bar message'],
      ];

      expect(getFirstErrorMessage(checks, 'bar')).toBe('bar message');
    });

    test('returns an empty string when no predicate matches', () => {
      const checks = [[() => false, 'never']];

      expect(getFirstErrorMessage(checks, 'anything')).toBe('');
    });
  });

  describe('createElementRemover', () => {
    const container = {};

    test('does nothing when the element lacks a dispose hook', () => {
      const dom = {
        querySelector: jest.fn(() => ({ id: 'missing-dispose' })),
        removeChild: jest.fn(),
      };
      const remove = createElementRemover('.selector');

      remove(container, dom);

      expect(dom.querySelector).toHaveBeenCalledWith(container, '.selector');
      expect(dom.removeChild).not.toHaveBeenCalled();
    });

    test('disposes and removes elements that expose _dispose', () => {
      const disposeSpy = jest.fn();
      const element = {
        _dispose: disposeSpy,
      };
      const dom = {
        querySelector: jest.fn(() => element),
        removeChild: jest.fn(),
      };
      const remove = createElementRemover('.selector');

      remove(container, dom);

      expect(disposeSpy).toHaveBeenCalled();
      expect(dom.removeChild).toHaveBeenCalledWith(container, element);
    });
  });

  describe('applyCleanupHandlers', () => {
    test('invokes extra handlers before the base handlers', () => {
      const order = [];
      const extraHandlers = [() => order.push('extra')];
      const baseHandlers = [
        () => order.push('base-1'),
        () => order.push('base-2'),
      ];
      const container = { current: true };
      const dom = {};

      applyCleanupHandlers({
        container,
        dom,
        baseHandlers,
        extraHandlers,
      });

      expect(order).toEqual(['extra', 'base-1', 'base-2']);
    });

    test('defaults to an empty extra handler list when none is provided', () => {
      const order = [];
      const baseHandlers = [() => order.push('base')];

      applyCleanupHandlers({
        container: {},
        dom: {},
        baseHandlers,
      });

      expect(order).toEqual(['base']);
    });
  });
});
