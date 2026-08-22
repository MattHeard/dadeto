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
  return {
    documentObj,
    element,
    globalThisObj,
    navigatorObj,
    windowObj,
    handle,
  };
};

describe('document facade', () => {
  it('delegates DOM, event, storage, timer, and browser helpers', () => {
    expect(() => getElementById('before-init')).toThrow(
      'createDocumentHandle must be called before using DOM helpers.'
    );
    const { documentObj, element, handle } = createDocumentFixture();
    const callback = jest.fn();
    const event = {
      currentTarget: 'current',
      target: { value: 'value' },
      preventDefault: callback,
    };

    expect(handle.getElementById('id')).toBe(element);
    expect(documentObj.getElementById).toHaveBeenCalledWith('id');
    expect(handle.querySelector(element, '.x')).toBe('selected');
    expect(element.querySelector).toHaveBeenCalledWith('.x');
    expect(handle.querySelectorAll('.x')).toEqual([element]);
    expect(documentObj.querySelectorAll).toHaveBeenCalledWith('.x');
    handle.addClass(element, 'x');
    handle.removeClass(element, 'x');
    expect(element.classList.remove).toHaveBeenCalledWith('x');
    handle.setClassName(element, 'name');
    expect(element.className).toBe('name');
    expect(handle.getAudioElements()).toEqual([element]);
    expect(documentObj.querySelectorAll).toHaveBeenCalledWith('audio');
    handle.removeControlsAttribute(element);
    expect(element.removeAttribute).toHaveBeenCalledWith('controls');
    expect(handle.createElement('div')).toBe(element);
    expect(handle.createTextNode('text')).toBe('text');
    expect(handle.getElementsByTagName('div')).toEqual([element]);
    expect(handle.hasClass(element, 'x')).toBe(true);
    handle.hide(element);
    expect(element.style.display).toBe('none');
    handle.addEventListener(element, 'click', callback);
    expect(element.addEventListener).toHaveBeenCalledWith('click', callback);
    handle.appendChild(element, 'child');
    expect(element.appendChild).toHaveBeenCalledWith('child');
    handle.insertBefore(element, 'child', 'ref');
    expect(element.insertBefore).toHaveBeenCalledWith('child', 'ref');
    handle.removeChild(element, 'child');
    expect(element.removeChild).toHaveBeenCalledWith('child');
    handle.contains(element, 'child');
    expect(element.contains).toHaveBeenCalledWith('child');
    handle.stopDefault(event);
    handle.playAudio(element);
    expect(element.play).toHaveBeenCalled();
    handle.pauseAudio(element);
    expect(element.pause).toHaveBeenCalled();
    handle.log('info');
    handle.warn('warning');
    handle.logError('error');
  });

  it('delegates child, timer, and browser operations', () => {
    const { element, globalThisObj, handle } = createDocumentFixture();
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
    expect(parent.removeChild).toHaveBeenCalledWith(child);
    handle.requestAnimationFrame(callback);
    expect(globalThisObj.requestAnimationFrame).toHaveBeenCalledWith(callback);
    handle.cancelAnimationFrame(1);
    expect(globalThisObj.cancelAnimationFrame).toHaveBeenCalledWith(1);
    handle.setInterval(callback, 1);
    expect(globalThisObj.setInterval).toHaveBeenCalledWith(callback, 1);
    handle.clearInterval(2);
    expect(globalThisObj.clearInterval).toHaveBeenCalledWith(2);
    handle.setTimeout(callback, 1);
    expect(globalThisObj.setTimeout).toHaveBeenCalledWith(callback, 1);
    handle.clearTimeout(3);
    expect(globalThisObj.clearTimeout).toHaveBeenCalledWith(3);
    expect(handle.getGamepads()).toEqual(['gamepad']);
    expect(handle.getClasses(element)).toEqual([]);
    expect(handle.getRandomNumber()).toBe(42 / 2 ** 32);
    expect(handle.getCurrentTime()).toEqual(expect.any(String));
    expect(handle.getUuid()).toBe('uuid');
  });

  it('delegates state, metadata, and module helpers', async () => {
    const { element, globalThisObj, windowObj, handle } =
      createDocumentFixture();
    const callback = jest.fn();
    const event = {
      currentTarget: 'current',
      target: { value: 'value' },
      preventDefault: callback,
    };
    expect(handle.hasNextSiblingClass(element, 'x')).toBe(true);
    expect(handle.hasNextSiblingClass({ nextElementSibling: null }, 'x')).toBe(
      undefined
    );
    handle.addWarning(element);
    expect(element.classList.add).toHaveBeenCalledWith('warning');
    handle.removeWarning(element);
    expect(element.classList.remove).toHaveBeenCalledWith('warning');
    handle.reveal(element);
    expect(element.style.display).toBe('');
    expect(handle.getCurrentTarget(event)).toBe('current');
    expect(handle.getParentElement(element)).toBe('parent');
    expect(handle.getTargetValue(event)).toBe('value');
    handle.setTargetValue(event, 'new');
    expect(event.target.value).toBe('new');
    expect(handle.getValue(element)).toBeUndefined();
    handle.setValue(element, 'set');
    expect(element.value).toBe('set');
    handle.enable(element);
    expect(element.disabled).toBe(false);
    handle.disable(element);
    expect(element.disabled).toBe(true);
    expect(handle.getNextSibling(element)).toBe('next');
    handle.removeNextSibling(element);
    handle.removeEventListener(element, 'click', callback);
    expect(element.removeEventListener).toHaveBeenCalledWith('click', callback);
    expect(handle.hasBetaParam()).toBe(true);
    handle.setType(element, 'text');
    expect(element.type).toBe('text');
    handle.setPlaceholder(element, 'placeholder');
    expect(element.placeholder).toBe('placeholder');
    handle.setDataAttribute(element, 'key', 'value');
    expect(handle.getDataAttribute(element, 'key')).toBe('value');
    handle.setTextContent(element, 'content');
    expect(element.textContent).toBe('content');
    const observer = handle.makeIntersectionObserver(callback);
    expect(windowObj.IntersectionObserver).toHaveBeenCalledWith(callback, {
      root: null,
      threshold: 0.1,
    });
    expect(handle.dom).toBeDefined();
    handle.disconnectObserver(observer);
    expect(observer.disconnect).toHaveBeenCalled();
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
    expect(
      handle.hasNoInteractiveComponents({ interactiveComponents: [] })
    ).toBe(true);
    expect(
      handle.getInteractiveComponentCount({ interactiveComponents: [] })
    ).toBe(0);
    await expect(
      new Promise((resolve, reject) => {
        handle.dom.importModule(
          'data:text/javascript,export default 1',
          resolve,
          reject
        );
      })
    ).resolves.toBeDefined();
    expect(handle.dom.globalThis).toBe(globalThisObj);
    expect(element.nextElementSibling.classList.contains).toHaveBeenCalledWith(
      'x'
    );
    handle.removeNextSibling({ nextElementSibling: null });
  });

  it('rejects unavailable browser APIs', () => {
    const empty = createDocumentHandle({
      documentObj: {},
      windowObj: { location: { search: '' } },
      globalThisObj: { crypto: {} },
      navigatorObj: {},
    });
    expect(() => empty.requestAnimationFrame(jest.fn())).toThrow(
      'globalThis.requestAnimationFrame is not a function'
    );
    expect(() => empty.cancelAnimationFrame(1)).toThrow(
      'globalThis.cancelAnimationFrame is not a function'
    );
    expect(() => empty.setInterval(jest.fn(), 1)).toThrow(
      'globalThis.setInterval is not a function'
    );
    expect(() => empty.clearInterval(1)).toThrow(
      'globalThis.clearInterval is not a function'
    );
    expect(() => empty.setTimeout(jest.fn(), 1)).toThrow(
      'globalThis.setTimeout is not a function'
    );
    expect(() => empty.clearTimeout(1)).toThrow(
      'globalThis.clearTimeout is not a function'
    );
    expect(() => empty.getGamepads()).toThrow(
      'navigator.getGamepads is not a function'
    );
    expect(empty.hasBetaParam()).toBe(false);
    expect(
      empty.hasNoInteractiveComponents({ interactiveComponents: [] })
    ).toBe(true);
  });
});
/* eslint max-statements: off */
