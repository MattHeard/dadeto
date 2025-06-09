import { describe, test, expect } from '@jest/globals';
import { DOCTYPE } from '../../src/generator/html.js';

describe('DOCTYPE constant', () => {
  test('is standard HTML doctype', () => {
    expect(DOCTYPE).toBe('<!DOCTYPE html>');
  });
});
