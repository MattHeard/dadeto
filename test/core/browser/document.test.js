import { jest } from '@jest/globals';
import {
  createDocumentHandle,
  getElementById,
} from '../../../src/core/browser/document.js';

const createDocumentFixture = () => {
  const classList = {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => true),
  };
  const element = {
    classList,
    style: {},
    firstChild: null,
    nextElementSibling: { classList, remove: jest.fn() },
    nextSibling: 'next',
    parentElement: 'parent',
    dataset: {},
    querySelector: jest.fn(() => 'selected'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(child => child),
    insertBefore: jest.fn(),
    removeChild: jest.fn(),
    removeAttribute: jest.fn(),
    contains: jest.fn(() => true),
    play: jest.fn(),
    pause: jest.fn(),
  };
  const documentObj = {
    getElementById: jest.fn(() => element),
    querySelector: jest.fn(() => element),
    querySelectorAll: jest.fn(() => [element]),
    createElement: jest.fn(() => element),
    createTextNode: jest.fn(value => value),
    getElementsByTagName: jest.fn(() => [element]),
  };
  const windowObj = {
    location: { search: '?beta=1' },
    IntersectionObserver: jest.fn(() => ({ disconnect: jest.fn() })),
  };
  const globalThisObj = {
    requestAnimationFrame: jest.fn(() => 1),
    cancelAnimationFrame: jest.fn(),
    setInterval: jest.fn(() => 2),
    clearInterval: jest.fn(),
    setTimeout: jest.fn(() => 3),
    clearTimeout: jest.fn(),
    crypto: {
      getRandomValues: jest.fn(values => {
        values[0] = 42;
        return values;
      }),
      randomUUID: jest.fn(() => 'uuid'),
    },
  };
  const navigatorObj = { getGamepads: jest.fn(() => ['gamepad']) };
  const handle = createDocumentHandle({
    documentObj,
    windowObj,
    globalThisObj,
    navigatorObj,
  });
  return { element, globalThisObj, handle };
};

describe('document facade', () => {
  it('delegates DOM, event, storage, timer, and browser helpers', () => {
    expect(() => getElementById('before-init')).toThrow(
      'createDocumentHandle must be called before using DOM helpers.'
    );
    const { element, handle } = createDocumentFixture();
    const callback = jest.fn();
    const event = {
      currentTarget: 'current',
      target: { value: 'value' },
      preventDefault: callback,
    };

    expect(handle.getElementById('id')).toBe(element);
    expect(handle.querySelector(element, '.x')).toBe('selected');
    expect(handle.querySelectorAll('.x')).toEqual([element]);
    handle.addClass(element, 'x');
    handle.removeClass(element, 'x');
    handle.setClassName(element, 'name');
    expect(handle.getAudioElements()).toEqual([element]);
    handle.removeControlsAttribute(element);
    expect(handle.createElement('div')).toBe(element);
    expect(handle.createTextNode('text')).toBe('text');
    expect(handle.getElementsByTagName('div')).toEqual([element]);
    expect(handle.hasClass(element, 'x')).toBe(true);
    handle.hide(element);
    handle.addEventListener(element, 'click', callback);
    handle.appendChild(element, 'child');
    handle.insertBefore(element, 'child', 'ref');
    handle.removeChild(element, 'child');
    handle.contains(element, 'child');
    handle.stopDefault(event);
    handle.playAudio(element);
    handle.pauseAudio(element);
    handle.log('info');
    handle.warn('warning');
    handle.logError('error');
  });

  it('delegates child, timer, and browser operations', () => {
    const { element, handle } = createDocumentFixture();
    const callback = jest.fn();
    handle.removeAllChildren(element);
    const child = { firstChild: null, removeChild: jest.fn() };
    const parent = {
      firstChild: child,
      removeChild: jest.fn(() => {
        parent.firstChild = null;
      }),
    };
    handle.removeAllChildren(parent);
    handle.requestAnimationFrame(callback);
    handle.cancelAnimationFrame(1);
    handle.setInterval(callback, 1);
    handle.clearInterval(2);
    handle.setTimeout(callback, 1);
    handle.clearTimeout(3);
    expect(handle.getGamepads()).toEqual(['gamepad']);
    expect(handle.getClasses(element)).toEqual([]);
    expect(handle.getRandomNumber()).toBe(42 / 2 ** 32);
    expect(handle.getCurrentTime()).toEqual(expect.any(String));
    expect(handle.getUuid()).toBe('uuid');
  });

  it('delegates state, metadata, and module helpers', () => {
    const { element, globalThisObj, handle } = createDocumentFixture();
    const callback = jest.fn();
    const event = {
      currentTarget: 'current',
      target: { value: 'value' },
      preventDefault: callback,
    };
    expect(handle.hasNextSiblingClass(element, 'x')).toBe(true);
    handle.addWarning(element);
    handle.removeWarning(element);
    handle.reveal(element);
    expect(handle.getCurrentTarget(event)).toBe('current');
    expect(handle.getParentElement(element)).toBe('parent');
    expect(handle.getTargetValue(event)).toBe('value');
    handle.setTargetValue(event, 'new');
    expect(handle.getValue(element)).toBeUndefined();
    handle.setValue(element, 'set');
    handle.enable(element);
    handle.disable(element);
    expect(handle.getNextSibling(element)).toBe('next');
    handle.removeNextSibling(element);
    handle.removeEventListener(element, 'click', callback);
    expect(handle.hasBetaParam()).toBe(true);
    handle.setType(element, 'text');
    handle.setPlaceholder(element, 'placeholder');
    handle.setDataAttribute(element, 'key', 'value');
    expect(handle.getDataAttribute(element, 'key')).toBe('value');
    handle.setTextContent(element, 'content');
    const observer = handle.makeIntersectionObserver(callback);
    handle.disconnectObserver(observer);
    expect(handle.isIntersecting({ isIntersecting: true })).toBe(true);
    expect(handle.hasNoInteractiveComponents({})).toBe(true);
    expect(handle.getInteractiveComponentCount({})).toBe(0);
    expect(handle.getInteractiveComponents({})).toEqual([]);
    expect(
      handle.hasNoInteractiveComponents({ interactiveComponents: [element] })
    ).toBe(false);
    expect(
      handle.getInteractiveComponentCount({ interactiveComponents: [element] })
    ).toBe(1);
    expect(
      handle.getInteractiveComponents({ interactiveComponents: [element] })
    ).toEqual([element]);
    handle.dom.importModule(
      'data:text/javascript,export default 1',
      jest.fn(),
      jest.fn()
    );
    expect(handle.dom.globalThis).toBe(globalThisObj);
  });

  it('rejects unavailable browser APIs', () => {
    const empty = createDocumentHandle({
      documentObj: {},
      windowObj: { location: { search: '' } },
      globalThisObj: { crypto: {} },
      navigatorObj: {},
    });
    expect(() => empty.requestAnimationFrame(jest.fn())).toThrow();
    expect(() => empty.cancelAnimationFrame(1)).toThrow();
    expect(() => empty.setInterval(jest.fn(), 1)).toThrow();
    expect(() => empty.clearInterval(1)).toThrow();
    expect(() => empty.setTimeout(jest.fn(), 1)).toThrow();
    expect(() => empty.clearTimeout(1)).toThrow();
    expect(() => empty.getGamepads()).toThrow();
    expect(empty.hasBetaParam()).toBe(false);
  });
});
