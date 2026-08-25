import { describe, expect, test } from '@jest/globals';
import {
  buildRegistry,
  nonNullRecords,
  normalizeCoordinate,
  normalizeCoordinateRecord,
  parseRegistry,
  serializeRegistry,
  sortByStableKey,
} from '../../../src/core/browser/toys/2026-08-18/registryUtils.js';

describe('registryUtils', () => {
  test('filters null records and sorts in place by stable key', () => {
    const records = [{ id: 'b' }, null, { id: 'a' }];
    expect(nonNullRecords(records)).toEqual([{ id: 'b' }, { id: 'a' }]);
    expect(sortByStableKey(records.filter(Boolean), value => value.id)).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  test('normalizes bounded numeric and string coordinates', () => {
    expect(normalizeCoordinate(12.3456789, -90, 90)).toBe('12.345679');
    expect(normalizeCoordinate('12.5', -90, 90)).toBe('12.500000');
    for (const value of [null, {}, Infinity, -91])
      expect(normalizeCoordinate(value, -90, 90)).toBeNull();
    expect(
      normalizeCoordinateRecord(
        { code: ' P1 ', latitude: '1.2', longitude: 3 },
        'code'
      )
    ).toEqual({ id: 'P1', latitude: '1.200000', longitude: '3.000000' });
    expect(normalizeCoordinateRecord({ code: 'P2' }, 'code')).toBeNull();
    expect(normalizeCoordinateRecord({ code: 'P2' }, 'code', true)).toEqual({
      id: 'P2',
      latitude: null,
      longitude: null,
    });
    expect(
      normalizeCoordinateRecord({ code: 'P3', latitude: 1 }, 'code')
    ).toBeNull();
    expect(
      normalizeCoordinateRecord({ code: 'P3', latitude: 1 }, 'code', true)
    ).toEqual({ id: 'P3', latitude: '1.000000', longitude: null });
    expect(
      normalizeCoordinateRecord({ latitude: 1, longitude: 2 }, 'code', true)
    ).toBeNull();
    expect(normalizeCoordinateRecord(null, 'code')).toBeNull();
    expect(normalizeCoordinateRecord('value', 'code')).toBeNull();
    expect(normalizeCoordinateRecord([], 'code')).toBeNull();
    expect(normalizeCoordinate(0, 0, 1)).toBe('0.000000');
    expect(normalizeCoordinate(1, 0, 1)).toBe('1.000000');
    expect(normalizeCoordinate(2, 0, 1)).toBeNull();
  });

  test('parses malformed payloads as empty records and serializes summaries', () => {
    expect(parseRegistry('{"items":[1]}')).toEqual({ items: [1] });
    expect(parseRegistry('{')).toEqual({});
    expect(serializeRegistry('items', [{ id: 'a' }], 'count')).toBe(`{
  "items": [
    {
      "id": "a"
    }
  ],
  "summary": {
    "count": 1
  }
}`);
  });

  test('builds, normalizes, sorts, and counts a registry', () => {
    expect(
      buildRegistry('{"source":[{"id":"b"},null,{"id":"a"}]}', {
        collectionKey: 'items',
        countKey: 'total',
        sourceKey: 'source',
        normalize: value => (value ? value : null),
        sortKey: value => value.id,
      })
    ).toContain('"total": 2');
    expect(
      buildRegistry('{"source":{}}', {
        collectionKey: 'items',
        countKey: 'total',
        sourceKey: 'source',
        normalize: value => value,
        sortKey: () => '',
      })
    ).toContain('"total": 0');
  });
});
