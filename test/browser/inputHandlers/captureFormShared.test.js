import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';
import * as captureFormShared from '../../../src/core/browser/inputHandlers/captureFormShared.js';

if (typeof globalThis.Event === 'undefined') {
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
}

describe('captureFormShared helpers', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('dispatchCheckboxChange', () => {
    it('ignores checkboxes without a dispatchEvent implementation', () => {
      const checkbox = {};
      expect(() =>
        captureFormShared.dispatchCheckboxChange(checkbox)
      ).not.toThrow();
    });

    it('dispatches a change event when dispatchEvent exists', () => {
      const dispatchEvent = jest.fn();
      const checkbox = { dispatchEvent };

      captureFormShared.dispatchCheckboxChange(checkbox);

      expect(dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change' })
      );
      expect(dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    });
  });

  describe('enableAutoSubmit', () => {
    it('does nothing when no checkbox is provided', () => {
      expect(() => captureFormShared.enableAutoSubmit(null)).not.toThrow();
    });

    it('checks the checkbox and fires a change when it exists', () => {
      const checkbox = { checked: false, dispatchEvent: jest.fn() };
      captureFormShared.enableAutoSubmit(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(checkbox.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('syncToyInput', () => {
    it('writes the serialized payload and triggers auto submit wiring', () => {
      const setValue = jest.fn();
      const dom = { setValue };
      const textInput = { value: '' };
      const payload = { toy: 'shared' };
      const checkbox = { checked: false, dispatchEvent: jest.fn() };

      captureFormShared.syncToyInput({
        dom,
        textInput,
        autoSubmitCheckbox: checkbox,
        payload,
      });

      const serialised = JSON.stringify(payload);
      expect(setValue).toHaveBeenCalledWith(textInput, serialised);
      expect(readStoredOrElementValue(textInput)).toBe(serialised);
      expect(checkbox.checked).toBe(true);
      expect(checkbox.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('buildCaptureForm', () => {
    it('creates the shared capture button and wires the form shell', () => {
      const createdElements = [];
      const dom = {
        createElement: jest.fn(tag => {
          const element = {
            tag,
            children: [],
            className: '',
            type: '',
          };
          createdElements.push(element);
          return element;
        }),
        setClassName: jest.fn((element, className) => {
          element.className = className;
        }),
        setType: jest.fn((element, type) => {
          element.type = type;
        }),
        appendChild: jest.fn((parent, child) => {
          parent.children.push(child);
        }),
        getNextSibling: jest.fn(() => null),
        insertBefore: jest.fn((parent, child) => {
          parent.children.push(child);
        }),
        removeAllChildren: jest.fn(),
      };
      const container = { children: [] };
      const textInput = { value: '' };

      const result = captureFormShared.buildCaptureForm({
        dom,
        container,
        textInput,
        formClass: 'capture-shell',
      });

      expect(result.form.className).toBe('capture-shell');
      expect(result.button.tag).toBe('button');
      expect(result.button.type).toBe('button');
      expect(dom.createElement).toHaveBeenCalledWith('button');
      expect(result.form.children).toContain(result.button);
    });
  });

  describe('capture form context helpers', () => {
    it('normalizes the capture form context and runs the ready callback', () => {
      const dom = {};
      const button = { label: 'capture' };
      const cleanupFns = [jest.fn()];
      const container = { id: 'container' };
      const textInput = { value: '' };
      const options = { dom, button, cleanupFns, container, textInput };
      const updateButton = jest.fn();
      const onReady = jest.fn();

      expect(captureFormShared.getCaptureFormContext(options)).toEqual(options);

      captureFormShared.withCaptureFormContext(options, updateButton, onReady);

      expect(updateButton).toHaveBeenCalledWith(dom, button, false);
      expect(onReady).toHaveBeenCalledWith(options);
    });
  });

  describe('prepareInputHandler', () => {
    it('hides the text input and registers cleanup handlers', () => {
      const dom = {
        hide: jest.fn(),
        disable: jest.fn(),
        querySelector: jest.fn(() => null),
      };
      const container = { id: 'container' };
      const textInput = { value: '' };
      const extraHandlers = [jest.fn()];

      captureFormShared.prepareInputHandler(
        dom,
        container,
        textInput,
        extraHandlers
      );

      expect(dom.hide).toHaveBeenCalledWith(textInput);
      expect(dom.disable).toHaveBeenCalledWith(textInput);
    });
  });

  describe('prepareCaptureHandler', () => {
    it('prepares the capture handler without throwing', () => {
      const dom = {
        hide: jest.fn(),
        disable: jest.fn(),
        querySelector: jest.fn(() => null),
      };
      const container = { id: 'container' };
      const textInput = { value: '' };

      expect(() =>
        captureFormShared.prepareCaptureHandler({ dom, container, textInput })
      ).not.toThrow();

      expect(dom.hide).toHaveBeenCalledWith(textInput);
      expect(dom.disable).toHaveBeenCalledWith(textInput);
      expect(dom.querySelector).toHaveBeenCalled();
    });
  });

  describe('registerGlobalListener', () => {
    it('registers a global listener and returns a cleanup disposer', () => {
      const addEventListener = jest.fn();
      const removeEventListener = jest.fn();
      const globalThisArg = { addEventListener, removeEventListener };
      const cleanupFns = [];
      const handler = jest.fn();

      captureFormShared.registerGlobalListener({
        globalThisArg,
        cleanupFns,
        type: 'keydown',
        handler,
      });

      expect(addEventListener).toHaveBeenCalledWith('keydown', handler);
      expect(cleanupFns).toHaveLength(1);

      cleanupFns[0]();

      expect(removeEventListener).toHaveBeenCalledWith('keydown', handler);
    });
  });

  describe('syncToyPayload', () => {
    it('persists the payload using the shared helpers', () => {
      const dom = { setValue: jest.fn() };
      const textInput = { value: '' };
      const payload = { nested: true };
      const checkbox = { checked: false, dispatchEvent: jest.fn() };

      captureFormShared.syncToyPayload(
        { dom, textInput, autoSubmitCheckbox: checkbox },
        payload
      );

      const serialised = JSON.stringify(payload);
      expect(dom.setValue).toHaveBeenCalledWith(textInput, serialised);
      expect(readStoredOrElementValue(textInput)).toBe(serialised);
      expect(checkbox.checked).toBe(true);
      expect(checkbox.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('makeCaptureFormBuilder', () => {
    it('returns a builder that renders the configured form', () => {
      const onFormReady = jest.fn();
      const builder = captureFormShared.makeCaptureFormBuilder(
        'capture-shell',
        onFormReady
      );
      const dom = {
        createElement: jest.fn(tag => ({
          tag,
          children: [],
          className: '',
          type: '',
        })),
        setClassName: jest.fn((element, className) => {
          element.className = className;
        }),
        setType: jest.fn((element, type) => {
          element.type = type;
        }),
        appendChild: jest.fn((parent, child) => {
          parent.children.push(child);
        }),
        getNextSibling: jest.fn(() => null),
        insertBefore: jest.fn((parent, child) => {
          parent.children.push(child);
        }),
        removeAllChildren: jest.fn(),
      };
      const container = { children: [] };
      const textInput = { value: '' };

      const form = builder({ dom, container, textInput });

      expect(form.className).toBe('capture-shell');
      expect(form.children[0].tag).toBe('button');
      expect(onFormReady).toHaveBeenCalledTimes(1);
      expect(onFormReady.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          dom,
          container,
          textInput,
          form,
        })
      );
    });
  });

  describe('getArticle', () => {
    it('returns the closest article.entry when present', () => {
      const article = { id: 'a1' };
      const container = { closest: jest.fn(() => article) };

      expect(captureFormShared.getArticle(container)).toBe(article);
      expect(container.closest).toHaveBeenCalledWith('article.entry');
    });

    it('returns null when no article is found', () => {
      const container = { closest: jest.fn(() => null) };
      expect(captureFormShared.getArticle(container)).toBeNull();
    });
  });

  describe('getAutoSubmitCheckbox', () => {
    it('returns the querySelector result when article exists', () => {
      const article = { id: 'article-1' };
      const checkbox = { checked: true };
      const dom = {
        querySelector: jest.fn(() => checkbox),
      };
      const container = { closest: jest.fn(() => article) };

      expect(captureFormShared.getAutoSubmitCheckbox(container, dom)).toBe(
        checkbox
      );
      expect(dom.querySelector).toHaveBeenCalledWith(
        article,
        '.auto-submit-checkbox'
      );
    });

    it('returns null when the article cannot be resolved', () => {
      const dom = { querySelector: jest.fn() };
      const container = { closest: jest.fn(() => null) };
      expect(
        captureFormShared.getAutoSubmitCheckbox(container, dom)
      ).toBeNull();
      expect(dom.querySelector).not.toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
