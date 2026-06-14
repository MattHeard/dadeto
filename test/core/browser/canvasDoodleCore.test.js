import { describe, expect, test } from '@jest/globals';
import {
  createCanvasDoodleFallbackPayload,
  parseCanvasDoodle,
} from '../../../src/core/browser/canvasDoodleCore.js';

describe('canvasDoodleCore', () => {
  test('parses canvas doodle JSON payloads', () => {
    expect(parseCanvasDoodle('{"width":123,"height":45}')).toEqual({
      width: 123,
      height: 45,
    });
  });

  test('returns null for invalid canvas doodle payloads', () => {
    expect(parseCanvasDoodle('not json')).toBeNull();
    expect(parseCanvasDoodle('[]')).toEqual([]);
  });

  test('provides a fallback payload with default dimensions and shapes', () => {
    const payload = createCanvasDoodleFallbackPayload();

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.height).toBeGreaterThan(0);
    expect(payload.shapes).toHaveLength(4);
  });
});
