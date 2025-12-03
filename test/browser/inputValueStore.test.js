import { describe, it, expect } from '@jest/globals';
import {
  setInputValue,
  hasInputValue,
  clearInputValue,
} from '../../src/core/browser/inputValueStore.js';
import { getInputValue } from '../../src/core/browser/browser-core.js';

describe('inputValueStore', () => {
  it('ignores falsy elements when storing or clearing', () => {
    expect(() => setInputValue(null, 'value')).not.toThrow();
    expect(getInputValue(null)).toBe('');
    expect(() => clearInputValue(null)).not.toThrow();
  });

  it('normalizes stored values to strings', () => {
    const element = {};
    setInputValue(element, 42);
    expect(hasInputValue(element)).toBe(true);
    expect(getInputValue(element)).toBe('42');
  });

  it('returns stored values preferentially over element.value', () => {
    const element = { value: 'from element' };
    setInputValue(element, 'from store');
    expect(getInputValue(element)).toBe('from store');
    clearInputValue(element);
  });

  it('falls back to element.value when no stored value exists', () => {
    const element = { value: 'fallback' };
    expect(hasInputValue(element)).toBe(false);
    expect(getInputValue(element)).toBe('fallback');
  });

  it('returns empty string when value is missing and clears entries', () => {
    const element = {};
    expect(getInputValue(element)).toBe('');
    setInputValue(element, true);
    expect(getInputValue(element)).toBe('true');
    clearInputValue(element);
    expect(hasInputValue(element)).toBe(false);
    expect(getInputValue(element)).toBe('');
  });
});
