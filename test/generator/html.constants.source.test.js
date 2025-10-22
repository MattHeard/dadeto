import { describe, test, expect } from '@jest/globals';
import { tagOpen, doctype } from '../../src/build/html.js';

describe('html constant functions', () => {
  test('tagOpen returns <', () => {
    expect(tagOpen()).toBe('<');
  });

  test('doctype returns the HTML doctype', () => {
    expect(doctype()).toBe('<!DOCTYPE html>');
  });
});
