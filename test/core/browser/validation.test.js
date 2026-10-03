import { describe, expect, jest, test } from '@jest/globals';
import * as validation from '../../../src/core/browser/validation.js';
import {
  isJsonObject,
  normalizeSegmentId,
} from '../../../src/core/browser/toys/2026-08-19/spacetimeInput.js';
import { normalizeUtcMinute } from '../../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';

describe('browser validation helpers', () => {
  test('object records preserve permissive prototypes and reject primitives and arrays', () => {
    for (const value of [
      {},
      new Date(),
      Object.create(null),
      new (class Record {})(),
    ]) {
      expect(validation.isObjectRecord(value)).toBe(true);
      expect(isJsonObject(value)).toBe(true);
    }
    for (const value of [
      null,
      undefined,
      [],
      0,
      false,
      '',
      Symbol('record'),
      1n,
      () => {},
    ]) {
      expect(validation.isObjectRecord(value)).toBe(false);
      expect(isJsonObject(value)).toBe(false);
    }
    expect(isJsonObject.name).toBe('isJsonObject');
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() => validation.isObjectRecord(revoked.proxy)).toThrow(TypeError);
    expect(() => isJsonObject(revoked.proxy)).toThrow(TypeError);
  });
  test('UTC-minute normalization shares its compatibility export and original parsing policy', () => {
    expect(normalizeUtcMinute).toBe(validation.normalizeUtcMinute);
    expect(normalizeUtcMinute(' 2026-08-21T09:05Z ')).toBe('2026-08-21T09:05Z');
    expect(normalizeUtcMinute('2026-02-30T09:05Z')).toBe('2026-02-30T09:05Z');
    for (const value of [
      null,
      undefined,
      0,
      false,
      '2026-13-21T09:05Z',
      '2026-08-21T09:05:00Z',
      '2026-08-21T09:05+00:00',
    ]) {
      expect(normalizeUtcMinute(value)).toBeNull();
    }
    const toString = jest.fn(() => '2026-08-21T09:05Z');
    expect(normalizeUtcMinute({ toString })).toBeNull();
    expect(toString).not.toHaveBeenCalled();
  });
  test('coercive trimming shares the segment-ID alias and preserves nullish and non-string behavior', () => {
    expect(normalizeSegmentId).toBe(validation.normalizeTrimmedString);
    for (const [value, expected] of [
      [null, ''],
      [undefined, ''],
      ['  id  ', 'id'],
      [0, '0'],
      [false, 'false'],
      [Symbol('id'), 'Symbol(id)'],
    ]) {
      expect(validation.normalizeTrimmedString(value)).toBe(expected);
    }
    const toString = jest.fn(() => '  object-id  ');
    expect(normalizeSegmentId({ toString })).toBe('object-id');
    expect(toString).toHaveBeenCalledTimes(1);
    expect(() =>
      normalizeSegmentId({
        toString() {
          throw new Error('coercion failed');
        },
      })
    ).toThrow('coercion failed');
  });
  test('covers primitive predicates and normalization', () => {
    expect(validation.isValidString('x')).toBe(true);
    expect(validation.isValidString('')).toBe(false);
    expect(validation.isValidString(1)).toBe(false);
    expect(validation.isValidString({ length: 1 })).toBe(false);
    expect(validation.isNullish(null)).toBe(true);
    expect(validation.isNullish(undefined)).toBe(true);
    expect(validation.isNullish(false)).toBe(false);
    expect(validation.normalizeNonStringValue(null)).toBe('');
    expect(validation.normalizeNonStringValue(4)).toBe('4');
    expect(validation.isNonEmptyString(' x ')).toBe(true);
    expect(validation.isNonEmptyString('  ')).toBe(false);
    expect(validation.isNonEmptyString(1)).toBe(false);
    expect(validation.normalizeMaybeNumber(4)).toBe(4);
    expect(validation.normalizeMaybeNumber('4')).toBeNull();
    expect(validation.isNotStringValue(4)).toBe(true);
    expect(validation.isNotStringValue('4')).toBe(false);
    expect(validation.isNotArrayValue({})).toBe(true);
    expect(validation.isNotArrayValue([])).toBe(false);
    expect(validation.isFiniteNumericValue(4)).toBe(true);
    expect(validation.isFiniteNumericValue(Infinity)).toBe(false);
    expect(validation.isFiniteNumericValue(NaN)).toBe(false);
  });

  test('parses and normalizes object, array, and string candidates', () => {
    expect(validation.parseJsonOrNull('{"a":1}')).toEqual({ a: 1 });
    expect(validation.parseJsonOrNull('{')).toBeNull();
    expect(validation.parseObjectRecord('{"a":1}')).toEqual({ a: 1 });
    expect(validation.parseObjectRecord({ a: 1 })).toEqual({ a: 1 });
    expect(validation.parseObjectRecord([])).toBeNull();
    expect(validation.parseObjectRecord(null)).toBeNull();
    expect(validation.parseObjectRecord(0)).toBeNull();
    expect(validation.arrayOrEmpty([1])).toEqual([1]);
    expect(validation.arrayOrEmpty(null)).toEqual([]);
    expect(validation.objectOrEmpty({ a: 1 })).toEqual({ a: 1 });
    expect(validation.objectOrEmpty(null)).toEqual({});
    expect(validation.getRecordOrNull({ a: 1 })).toEqual({ a: 1 });
    expect(validation.getRecordOrNull(null)).toBeNull();
    expect(validation.getRecordOrNull(0)).toBeNull();
    expect(validation.firstStringOrNull(' x ')).toBe('x');
    expect(validation.firstStringOrNull([' y '])).toBe('y');
    expect(validation.firstStringOrNull([''])).toBeNull();
    expect(validation.firstStringOrNull(1)).toBeNull();
    expect(validation.getStringCandidate('x')).toBe('x');
    expect(validation.getStringCandidate(1)).toBeUndefined();
    expect(validation.ensureString('x')).toBe('x');
    expect(validation.ensureString(null)).toBe('');
    expect(validation.trimmedStringOrEmpty(' x ')).toBe('x');
    expect(validation.trimmedStringOrEmpty(1)).toBe('');
  });

  test('covers callable, conditional, filesystem, and reporting helpers', () => {
    expect(() => validation.assertFunction(() => {}, 'fn')).not.toThrow();
    expect(() => validation.assertFunction(null, 'fn')).toThrow(
      'fn must be a function'
    );
    expect(validation.resolveWhenFallback(() => 1)()).toBe(1);
    expect(validation.resolveWhenFallback(null)()).toBeNull();
    const callback = jest.fn(value => value);
    expect(validation.whenType('x', 'string', callback)).toBe('x');
    expect(validation.whenType(1, 'string', callback)).toBeNull();
    expect(validation.whenTruthy('x', callback)).toBe('x');
    expect(validation.whenTruthy('', callback)).toBeNull();
    expect(validation.isNonNullObject({})).toBe(true);
    expect(validation.isNonNullObject(null)).toBe(false);
    expect(validation.isNonNullObject(0)).toBe(false);
    expect(validation.didExecutionFail(undefined)).toBe(true);
    expect(validation.didExecutionFail(null)).toBe(false);
    expect(validation.isMissingFileError({ code: 'ENOENT' })).toBe(true);
    expect(validation.isMissingFileError({ code: 'EACCES' })).toBe(false);
    expect(validation.isMissingFileError(null)).toBe(false);
    expect(validation.isMissingFileError('ENOENT')).toBe(false);
    expect(validation.requirePathModule({})).toEqual({});
    expect(() => validation.requirePathModule(null)).toThrow(
      'pathModule is required'
    );
    expect(
      validation.functionOrFallback(
        () => 1,
        () => 2
      )
    ).toBeInstanceOf(Function);
    expect(validation.functionOrFallback(null, () => 2)).toBe(2);
    const output = { error: jest.fn() };
    const setExitCode = jest.fn();
    expect(
      validation.reportFailuresAndExit({ failures: [], output, setExitCode })
    ).toBe(false);
    expect(
      validation.reportFailuresAndExit({
        failures: ['bad'],
        output,
        setExitCode,
      })
    ).toBe(true);
    expect(output.error).toHaveBeenCalledWith('bad');
    expect(setExitCode).toHaveBeenCalledWith(1);
  });
});
