import { parseImpactArguments } from '../../../src/logic/boundary/local/impact-arguments.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from '@babel/parser';
import * as current from '../../../src/core/local/checkImpactPlan.js';
import {
  impactContractCases,
  observeImpactContract,
} from './impact-contract.js';

const baseline = 'bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1';
const originalPath = 'src/core/local/checkImpactPlan.js';
const expectedSourceSha256 =
  '42138efb1065e2135dfc11025b22375222b013ee93367db312efd42eb60a26fd';
const moduleUrl = new URL(
  '../../../src/core/local/checkImpactPlan.js',
  import.meta.url
);
const git = spawnSync('git', ['show', `${baseline}:${originalPath}`], {
  encoding: 'utf8',
});
assert.equal(git.status, 0, git.stderr);
const originalSource = git.stdout;
const digest = value => createHash('sha256').update(value).digest('hex');
assert.equal(digest(originalSource), expectedSourceSha256);

/**
 * Load a native module after rewriting only actual import declarations.
 * @param {string} source Original implementation.
 * @returns {Promise<object>} Original public factories.
 */
async function loadOriginal(source) {
  const imports = parse(source, { sourceType: 'module' })
    .program.body.filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of imports) {
    source =
      source.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, moduleUrl).href) +
      source.slice(specifier.end);
  }
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
}

/**
 * Expose the private parser without copying or reimplementing its behavior.
 * @param {string} source Complete module source.
 * @returns {Promise<Function>} Exact parser under native evaluation.
 */
async function loadParser(source) {
  const declaration = parse(source, { sourceType: 'module' }).program.body.find(
    node =>
      node.type === 'FunctionDeclaration' &&
      node.id.name === 'parseImpactArguments'
  );
  assert.ok(declaration, 'actual parser declaration must exist');
  const code = `export ${source.slice(declaration.start, declaration.end)}`;
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    )
  ).parseImpactArguments;
}

/**
 * Preserve return/throw distinctions and exact special primitive values.
 * @param {Function} parser Actual implementation.
 * @param {unknown} argv Input argument collection.
 * @param {unknown} defaultBaseRef Optional default.
 * @returns {object} Stable observable result.
 */
function observe(parser, argv, defaultBaseRef) {
  try {
    return { kind: 'return', value: parser(argv, defaultBaseRef) };
  } catch (error) {
    return { kind: 'throw', name: error.name, message: error.message };
  }
}

const originalParser = await loadParser(originalSource);
/**
 * Observe the actual total boundary through its original public throw contract.
 * @param {string[]} argv Unparsed option primitives.
 * @param {string | undefined} defaultBaseRef Optional default ref.
 * @returns {object} Original interpreted options.
 */
function currentParser(argv, defaultBaseRef) {
  const parsed = parseImpactArguments(argv, defaultBaseRef);
  if (!parsed.ok) throw parsed.error;
  return parsed.input;
}
const hash = createHash('sha256');
let parserCases = 0;
const samples = [];
/**
 * Compare one immutable-original and current parser outcome.
 * @param {unknown} argv Untrusted option collection.
 * @param {unknown} defaultBaseRef Optional default comparison ref.
 */
function compare(argv, defaultBaseRef) {
  const expected = observe(originalParser, argv, defaultBaseRef);
  const actual = observe(currentParser, argv, defaultBaseRef);
  assert.deepEqual(actual, expected);
  hash.update(
    JSON.stringify(
      { argv, defaultBaseRef, outcome: expected },
      (_key, value) => (value === undefined ? { special: 'undefined' } : value)
    )
  );
  hash.update('\n');
  parserCases += 1;
  if (samples.length < 8)
    samples.push({ argv, defaultBaseRef, outcome: expected });
}

const tokens = [
  '--files',
  '--base',
  '--unknown',
  '',
  'main',
  'src/core/a.js',
  'test/core/a.test.js',
  '--',
];
let vectors = [[]];
for (let length = 0; length <= 4; length += 1) {
  for (const argv of vectors) {
    for (const base of [undefined, '', 'default-main']) compare(argv, base);
  }
  vectors = vectors.flatMap(prefix => tokens.map(token => [...prefix, token]));
}
for (const argv of [
  undefined,
  null,
  true,
  17,
  {},
  '--base',
  [],
  Array(2),
  ['--files', undefined],
  ['--files', null],
  ['--files', {}],
  ['--base', undefined],
  ['--base', null],
  ['--base', {}],
  [null],
  [undefined],
  [{ toString: () => 'custom' }],
]) {
  compare(argv, undefined);
}

let originalErrorCases = 0;
for (const failure of [
  undefined,
  null,
  false,
  0,
  17,
  'sentinel',
  Symbol.for('impact-options-failure'),
  {},
  new Error('original failure'),
]) {
  const inputs = [
    () =>
      Object.defineProperty({}, 'length', {
        get() {
          throw failure;
        },
      }),
    () =>
      Object.defineProperty([undefined], '0', {
        get() {
          throw failure;
        },
      }),
    () => [
      '--files',
      {
        startsWith() {
          throw failure;
        },
      },
    ],
    () => [
      {
        toString() {
          throw failure;
        },
      },
    ],
  ];
  for (const input of inputs) {
    for (const implementation of [originalParser, currentParser]) {
      let thrown = false;
      try {
        implementation(input());
      } catch (error) {
        thrown = true;
        assert.equal(
          error,
          failure,
          'preserve the exact original thrown value'
        );
      }
      assert.ok(thrown, 'throwing input must remain observable');
    }
    originalErrorCases += 1;
  }
}

const original = await loadOriginal(originalSource);
const publicHash = createHash('sha256');
let publicCases = 0;
for (const input of impactContractCases()) {
  const expected = observeImpactContract(original, input);
  assert.deepEqual(observeImpactContract(current, input), expected);
  publicHash.update(JSON.stringify(expected));
  publicHash.update('\n');
  publicCases += 1;
}
console.log(
  JSON.stringify(
    {
      baseline,
      baselineSourceSha256: expectedSourceSha256,
      parserCases,
      parserSha256: hash.digest('hex'),
      publicCases,
      publicSha256: publicHash.digest('hex'),
      originalErrorCases,
      samples,
    },
    null,
    2
  )
);
