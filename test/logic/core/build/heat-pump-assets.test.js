import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { createAssetCopies } from '../../../../src/logic/core/build/asset-copies.js';
import { createHeatPumpAssetCopies } from '../../../../src/logic/core/build/heat-pump-assets.js';

const entries = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-assets.json',
      import.meta.url
    ),
    'utf8'
  )
);

test('includes every authoritative domain module and each stable compatibility URL', () => {
  expect(createHeatPumpAssetCopies('/src', '/out', posix.join)).toEqual(
    entries.map(([source, target]) => ({
      source: `/src/${source}`,
      target: `/out/${target}`,
    }))
  );
});

test('projects arbitrary explicit pairs in order through the supplied path port', () => {
  const calls = [];
  const join = (...parts) => {
    calls.push(parts);
    return parts.join('::');
  };
  expect(
    createAssetCopies(
      [
        ['one', 'two'],
        ['three', 'four'],
      ],
      'SRC',
      'OUT',
      join
    )
  ).toEqual([
    { source: 'SRC::one', target: 'OUT::two' },
    { source: 'SRC::three', target: 'OUT::four' },
  ]);
  expect(calls).toEqual([
    ['SRC', 'one'],
    ['OUT', 'two'],
    ['SRC', 'three'],
    ['OUT', 'four'],
  ]);
  expect(createAssetCopies([], 'SRC', 'OUT', join)).toEqual([]);
});

test('propagates a path-port failure unchanged from the domain projection', () => {
  const error = new Error('path failed');
  expect(() =>
    createHeatPumpAssetCopies('/src', '/out', () => {
      throw error;
    })
  ).toThrow(error);
});
