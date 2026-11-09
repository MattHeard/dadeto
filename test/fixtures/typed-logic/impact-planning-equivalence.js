import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';
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
const git = spawnSync('git', ['show', `${baseline}:${sourcePath}`], {
  encoding: 'utf8',
});
assert.equal(git.status, 0, git.stderr);
assert.equal(
  createHash('sha256').update(git.stdout).digest('hex'),
  sourceSha256
);

/**
 * Load actual complete modules, rewriting only import locations.
 * @param {string} source Immutable or current module source.
 * @returns {Promise<object>} Native actual exports.
 */
async function load(source) {
  const imports = parse(source, { sourceType: 'module' })
    .program.body.filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of imports)
    source =
      source.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, moduleUrl).href) +
      source.slice(specifier.end);
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
}
const original = await load(git.stdout);
const current = await load(readFileSync(moduleUrl, 'utf8'));

/**
 * Observe returned plan or native failure category, preserving opaque reason identity.
 * @param {object} implementation Actual module exports.
 * @param {unknown} options Candidate planner options.
 * @returns {object} Complete outcome.
 */
function observe(implementation, options) {
  try {
    return {
      kind: 'return',
      value: implementation.createCheckImpactPlan(options),
    };
  } catch (error) {
    return {
      kind: 'throw',
      type: typeof error,
      name: error?.name,
      message: error?.message,
    };
  }
}

/**
 * Encode output while representing opaque function/symbol reason payloads by fixture identity.
 * Actual identity is separately asserted before using this stable receipt.
 * @param {object} outcome Actual outcome.
 * @param {string} label Stable candidate identity.
 * @returns {string} Canonical semantic fingerprint input.
 */
function encode(outcome, label) {
  if (
    outcome.kind === 'return' &&
    ['function', 'symbol'].includes(typeof outcome.value.reason)
  ) {
    return serialize({
      ...outcome,
      value: {
        ...outcome.value,
        reason: { opaque: typeof outcome.value.reason, label },
      },
    });
  }
  return serialize(outcome);
}
const planHash = createHash('sha256');
let planCases = 0;

/**
 * Compare actual complete planner outcomes and retained reason aliases.
 * @param {string} label Stable input identity.
 * @param {unknown} options Input candidate.
 * @param {unknown} reason Optional known input collection-error payload.
 * @returns {void} Equality assertions.
 */
function compare(label, options, reason) {
  const expected = observe(original, options);
  const actual = observe(current, options);
  assert.deepEqual(actual, expected);
  if (expected.kind === 'return' && reason) {
    assert.equal(expected.value.reason, reason);
    assert.equal(actual.value.reason, reason);
  }
  assert.equal(encode(actual, label), encode(expected, label));
  planHash.update(`${label}:${encode(expected, label)}\n`);
  planCases += 1;
}
const changes = [
  undefined,
  [],
  ['src/core/a.js'],
  ['src/logic/core/a.js', 'test/core/a.test.js'],
  ['src/browser/a.js'],
  ['test/core/a.test.js'],
  ['docs/a.md'],
  ['../escape.js'],
  ['', null, Symbol('path')],
  Array(1),
  ['src/core/a.js', '.\\src\\core\\a.js'],
  [undefined, 'src/core/a.js'],
  null,
  17,
  'src/core/a.js',
];
const related = [
  undefined,
  [],
  ['test/core/a.test.js'],
  ['src/core/a.js'],
  ['test/e2e/a.test.js'],
  [null, 'test/core/a.test.js'],
  Array(1),
  null,
  17,
  'test/core/a.test.js',
];
const resolved = [undefined, false, true, 0, 1];
const reasons = [
  undefined,
  '',
  'collection failed',
  0,
  false,
  null,
  1,
  true,
  {},
  [],
  Symbol('reason'),
  () => 'opaque',
];
for (const [changeIndex, changedPaths] of changes.entries()) {
  for (const [relatedIndex, relatedTestPaths] of related.entries()) {
    for (const [resolvedIndex, relatedTestsResolved] of resolved.entries()) {
      for (const [reasonIndex, collectionError] of reasons.entries()) {
        compare(
          `${changeIndex}-${relatedIndex}-${resolvedIndex}-${reasonIndex}`,
          {
            changedPaths,
            relatedTestPaths,
            relatedTestsResolved,
            collectionError,
          },
          collectionError
        );
      }
    }
  }
}
for (const [index, options] of [
  undefined,
  null,
  false,
  0,
  '',
  17,
  true,
  'options',
  [],
  Symbol('options'),
  () => {},
].entries())
  compare(`root-${index}`, options);
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
  for (const field of [
    'changedPaths',
    'relatedTestPaths',
    'relatedTestsResolved',
    'collectionError',
  ]) {
    const read = implementation => {
      const trace = [];
      const options = {};
      const fields = [
        'changedPaths',
        'relatedTestPaths',
        'relatedTestsResolved',
        'collectionError',
      ];
      for (const name of fields)
        Object.defineProperty(options, name, {
          get() {
            trace.push(name);
            if (name === field) throw failure;
            return undefined;
          },
        });
      let thrown = false;
      try {
        implementation.createCheckImpactPlan(options);
      } catch (error) {
        thrown = true;
        assert.equal(error, failure);
      }
      assert.ok(thrown);
      assert.deepEqual(trace, fields.slice(0, fields.indexOf(field) + 1));
      return trace;
    };
    assert.deepEqual(read(current), read(original));
    errorCases += 1;
  }
}
const access = implementation => {
  const trace = [];
  const changedPaths = ['src/core/a.js'];
  Object.defineProperty(changedPaths, 0, {
    get() {
      trace.push('changed-entry');
      return 'src/core/a.js';
    },
  });
  const relatedTestPaths = ['test/core/a.test.js'];
  Object.defineProperty(relatedTestPaths, 0, {
    get() {
      trace.push('related-entry');
      return 'test/core/a.test.js';
    },
  });
  const options = {};
  for (const [name, value] of Object.entries({
    changedPaths,
    relatedTestPaths,
    relatedTestsResolved: true,
    collectionError: '',
  }))
    Object.defineProperty(options, name, {
      get() {
        trace.push(name);
        return value;
      },
    });
  const plan = implementation.createCheckImpactPlan(options);
  return { trace, plan };
};
assert.deepEqual(access(current), access(original));
assert.deepEqual(access(current).trace, [
  'changedPaths',
  'relatedTestPaths',
  'relatedTestsResolved',
  'collectionError',
  'changed-entry',
  'related-entry',
]);
const publicHash = createHash('sha256');
let publicCases = 0;
for (const input of impactContractCases()) {
  const expected = observeImpactContract(original, input);
  assert.deepEqual(observeImpactContract(current, input), expected);
  publicHash.update(`${JSON.stringify(expected)}\n`);
  publicCases += 1;
}
const receipt = {
  baseline,
  sourceSha256,
  planCases,
  planSha256: planHash.digest('hex'),
  errorCases,
  publicCases,
  publicSha256: publicHash.digest('hex'),
};
assert.equal(receipt.planCases, 9011);
assert.equal(
  receipt.planSha256,
  '4d0646a7388982263545a58fdb57f3b952364cf8c7cfc12761d5ae6d37a823da'
);
assert.equal(receipt.errorCases, 32);
assert.equal(receipt.publicCases, 576);
assert.equal(
  receipt.publicSha256,
  '72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5'
);
console.log(JSON.stringify(receipt, null, 2));
