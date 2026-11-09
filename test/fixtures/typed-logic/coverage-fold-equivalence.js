import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';
import * as currentEffects from '../../../src/core/local/checkImpactPlan.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import {
  impactContractCases,
  observeImpactContract,
} from './impact-contract.js';

const baseline = 'bd05ee9acb946e77b1f0a338295a0dbb9a82e809';
const sourcePath = 'src/core/local/checkImpactPlan.js';
const sourceSha256 =
  'ff612b63219d311046f734737be5809480ddd6162335c830d6a2f6cff36424df';
const moduleUrl = new URL(
  '../../../src/core/local/checkImpactPlan.js',
  import.meta.url
);
const source = spawnSync('git', ['show', `${baseline}:${sourcePath}`], {
  encoding: 'utf8',
});
assert.equal(source.status, 0, source.stderr);
assert.equal(
  createHash('sha256').update(source.stdout).digest('hex'),
  sourceSha256
);

/**
 * Expose actual private fold helpers without copying their implementation.
 * @param {string} text Complete source.
 * @param {URL} [location] Actual source location for import resolution.
 * @param {string[]} [exposed] Private helpers to expose without copying bodies.
 * @returns {Promise<object>} Native module exports.
 */
async function load(
  text,
  location = moduleUrl,
  exposed = [
    'mergeCoverageRecords',
    'mergeCoverageRecord',
    'addCoverageCounters',
    'addCoverageBranches',
  ]
) {
  const tree = parse(text, { sourceType: 'module' });
  const imports = tree.program.body
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of imports)
    text =
      text.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, location).href) +
      text.slice(specifier.end);
  text += `\nexport { ${exposed.join(', ')} };\n`;
  return import(
    `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
  );
}

const shared = {};
for (const [left, right] of [
  [0, -0],
  [NaN, null],
  [undefined, null],
  [[], Array(1)],
  [[undefined], Array(1)],
  [
    { a: 1, b: 2 },
    { b: 2, a: 1 },
  ],
  [new Map([['a', 1]]), { a: 1 }],
  [new Date(0), {}],
  [
    [shared, shared],
    [{}, {}],
  ],
])
  assert.notEqual(serialize(left), serialize(right));

const original = await load(source.stdout);
const currentUrl = new URL(
  '../../../src/logic/core/local/coverage-records.js',
  import.meta.url
);
const current = await load(readFileSync(currentUrl, 'utf8'), currentUrl, [
  'mergeCoverageRecord',
  'addCoverageCounters',
  'addCoverageBranches',
]);
const variants = [
  {},
  { s: {}, f: {}, b: {} },
  { s: { a: 0 }, f: { f: 0 }, b: { b: [0] } },
  { s: { a: 1 }, f: { f: 2 }, b: { b: [1, 0] } },
  { s: { z: 3, a: 0 }, f: { z: 4 }, b: { z: [0, 2, 0] } },
  { s: { a: -0 }, f: { f: -0 }, b: { b: [-0] } },
  { s: { a: Infinity }, f: { f: NaN }, b: { b: [Infinity, NaN] } },
  { s: { a: -Infinity }, b: { b: [-Infinity] } },
  { b: { b: Array(3) } },
  { b: { b: [undefined, 2] }, s: { a: undefined } },
  {
    statementMap: { a: { start: { line: 8 } } },
    branchMap: { b: { line: 9 } },
    path: 'first',
    s: { a: 0 },
    b: { b: [0] },
  },
  {
    statementMap: { x: { start: { line: 99 } } },
    branchMap: { x: { line: 100 } },
    path: 'later',
    s: { x: 2 },
    b: { x: [2] },
  },
  {
    s: JSON.parse('{"__proto__":1,"constructor":2,"a":0}'),
    metadata: new Map([['key', { value: 1 }]]),
  },
  { metadata: new Date('2026-11-09T00:00:00Z'), f: { z: 1, a: 2 } },
];
const foldHash = createHash('sha256');
let foldCases = 0;
let level = [[]];
for (let length = 0; length <= 3; length += 1) {
  for (const vector of level) {
    const records = structuredClone(vector);
    const before = serialize(records);
    const expected = original.mergeCoverageRecords(records);
    assert.deepEqual(serialize(records), before);
    const actual = current.mergeCoverageRecords(records);
    assert.deepEqual(actual, expected);
    assert.deepEqual(serialize(actual), serialize(expected));
    assert.deepEqual(serialize(records), before);
    if (records.length) {
      assert.notEqual(actual, records[0]);
      Object.keys(records[0])
        .filter(key => records[0][key] && typeof records[0][key] === 'object')
        .forEach(key => assert.notEqual(actual[key], records[0][key]));
    }

    foldHash.update(serialize({ input: records, output: expected }));
    foldCases += 1;
  }
  level = level.flatMap(prefix => variants.map(record => [...prefix, record]));
}

const helperHash = createHash('sha256');
let helperCases = 0;
const counters = [
  undefined,
  {},
  { a: 0 },
  { a: -0 },
  { a: 2, z: 1 },
  { z: 3 },
  { a: Infinity },
  { a: NaN },
];
const branches = [
  undefined,
  {},
  { a: [] },
  { a: [0] },
  { a: [1, 2] },
  { z: [3], a: [0, 0, 1] },
  { a: Array(3) },
  { a: [undefined, NaN] },
];
for (const [name, inputs] of [
  ['addCoverageCounters', counters],
  ['addCoverageBranches', branches],
]) {
  for (const left of inputs) {
    for (const right of inputs) {
      const before = serialize({ left, right });
      const expected = original[name](left, right);
      const actual = current[name](left, right);
      assert.deepEqual(actual, expected);
      assert.deepEqual(serialize(actual), serialize(expected));
      assert.deepEqual(serialize({ left, right }), before);
      helperHash.update(serialize({ name, left, right, output: expected }));
      helperCases += 1;
    }
  }
}

let errorCases = 0;
for (const failure of [
  undefined,
  null,
  false,
  0,
  'failure',
  Symbol('failure'),
  {},
  new Error('original'),
]) {
  for (const implementation of [original, current]) {
    let thrown = false;
    const record = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        throw failure;
      },
    });
    try {
      implementation.mergeCoverageRecords([record]);
    } catch (error) {
      thrown = true;
      assert.equal(error, failure);
    }
    assert.ok(thrown);
  }
  errorCases += 1;
}
for (const value of [() => 'uncloneable', Symbol('uncloneable')]) {
  const observe = implementation => {
    try {
      implementation.mergeCoverageRecords([{ value }]);
    } catch (error) {
      return { name: error.name, message: error.message };
    }
    return assert.fail('uncloneable value must remain an error');
  };
  assert.deepEqual(observe(current), observe(original));
  errorCases += 1;
}
const publicHash = createHash('sha256');
let publicCases = 0;
for (const input of impactContractCases()) {
  const expected = observeImpactContract(original, input);
  assert.deepEqual(observeImpactContract(currentEffects, input), expected);
  publicHash.update(`${JSON.stringify(expected)}\n`);
  publicCases += 1;
}
console.log(
  JSON.stringify(
    {
      baseline,
      sourceSha256,
      foldCases,
      foldSha256: foldHash.digest('hex'),
      helperCases,
      helperSha256: helperHash.digest('hex'),
      errorCases,
      publicCases,
      publicSha256: publicHash.digest('hex'),
      serialization:
        'canonical semantic JSON; key order, sparse arrays and graph aliases retained',
    },
    null,
    2
  )
);
