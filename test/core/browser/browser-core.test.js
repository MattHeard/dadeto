import { describe, expect, test, jest } from '@jest/globals';
import {
  applyCleanupHandlers,
  createElementRemover,
  getFirstErrorMessage,
} from '../../../src/core/browser/browser-core.js';

describe('browser-core helpers', () => {
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
