import assert from 'node:assert/strict';

/**
 * Encode the fixture domain without depending on native serializer representations.
 * @param {unknown} value Fixture value.
 * @param {Map<object, number>} [seen] Graph identities in traversal order.
 * @returns {unknown} Canonical tagged semantic tree.
 */
function canonical(value, seen = new Map()) {
  if (value === null) return ['null'];
  if (typeof value === 'number')
    return ['number', Object.is(value, -0) ? '-0' : String(value)];
  if (typeof value !== 'object') {
    assert.notEqual(typeof value, 'function');
    assert.notEqual(typeof value, 'symbol');
    return [
      'primitive',
      typeof value,
      typeof value === 'bigint' ? String(value) : value,
    ];
  }
  if (seen.has(value)) return ['reference', seen.get(value)];
  seen.set(value, seen.size);
  if (Array.isArray(value))
    return [
      'array',
      value.length,
      Object.keys(value).map(key => [key, canonical(value[key], seen)]),
    ];
  if (value instanceof Date) {
    assert.equal(Object.keys(value).length, 0);
    return ['date', String(value.getTime())];
  }
  if (value instanceof Map) {
    assert.equal(Object.keys(value).length, 0);
    return [
      'map',
      [...value].map(([key, item]) => [
        canonical(key, seen),
        canonical(item, seen),
      ]),
    ];
  }
  assert.ok(
    Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null
  );
  return [
    'object',
    Object.getPrototypeOf(value) === null ? 'null-prototype' : 'ordinary',
    Object.keys(value).map(key => [key, canonical(value[key], seen)]),
  ];
}

/**
 * Fingerprint complete semantic structure, retaining own-key order and aliasing.
 * @param {unknown} value Fixture value.
 * @returns {string} Deterministic canonical JSON.
 */
export function serializeCoverageSemantics(value) {
  return JSON.stringify(canonical(value));
}
