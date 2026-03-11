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
