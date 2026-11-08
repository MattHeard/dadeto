import * as current from '../../../src/logic/core/local/impact-commands.js';
import * as currentEffects from '../../../src/core/local/checkImpactPlan.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parse } from '@babel/parser';
import {
  impactContractCases,
  observeImpactContract,
} from './impact-contract.js';

const baseline = '1fcaebd28fc508558962ec51aaa7e7ba3648bd47';
const sourcePath = 'src/core/local/checkImpactPlan.js';
const sourceSha256 =
  '42138efb1065e2135dfc11025b22375222b013ee93367db312efd42eb60a26fd';
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
 * Load actual command construction, exposing private helpers without copying them.
 * @param {string} source Complete legacy module.
 * @returns {Promise<object>} Native module exports.
 */
async function load(source) {
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
  source += '\nexport { quotePath, commandOptions, JEST_RUNNER };\n';
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
}

/**
 * Retain undefined and special numeric values in reproducible digests.
 * @param {string} _key Object key.
 * @param {unknown} value Observable field.
 * @returns {unknown} Lossless JSON-compatible value.
 */
function encode(_key, value) {
  if (value === undefined) return { special: 'undefined' };
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || Object.is(value, -0))
  ) {
    return { number: Object.is(value, -0) ? '-0' : String(value) };
  }
  return value;
}

/**
 * Observe complete output, injected path operations and environment access order.
 * @param {object} implementation Original or current exports.
 * @param {object} vector Typed constructor input vector.
 * @returns {object} Complete deterministic observable result.
 */
function observe(implementation, vector) {
  const trace = [];
  const { rootDir, coverageDirectory, tests, sourceFiles, environment, port } =
    vector;
  const env = Object.assign(
    Object.create({ INHERITED: 'never copied' }),
    environment
  );
  Object.defineProperty(env, 'OBSERVED', {
    enumerable: true,
    get() {
      trace.push(['environment']);
      return 'value';
    },
  });
  const pathModule = {
    join(...parts) {
      assert.equal(this, pathModule);
      trace.push(['join', ...parts]);
      if (port === 'virtual') return `virtual:${parts.join('|')}`;
      return path[port].join(...parts);
    },
  };
  const options = Object.freeze({
    paths: Object.freeze({ rootDir, pathModule }),
    coverageDirectory,
    selection: Object.freeze({
      tests: Object.freeze([...tests]),
      sourceFiles: Object.freeze([...sourceFiles]),
    }),
    environment: Object.freeze(env),
  });
  const result = implementation.createScopedCoverageCommand(options);
  assert.deepEqual(options.selection.tests, tests);
  assert.deepEqual(options.selection.sourceFiles, sourceFiles);
  return { result, trace };
}

const original = await load(git.stdout);
const commandHash = createHash('sha256');
let commandCases = 0;
const vectors = Object.entries({
  rootDir: ['/repo', '.', '', "/repo with spaces/it's", 'C:\\repo'],
  coverageDirectory: [
    '/tmp/coverage',
    '',
    "coverage's path",
    '--runInBand',
    '--runTestsByPath',
    '--coverage',
    'scripts/run-jest.js',
    '<temporary-coverage-dir>',
  ],
  tests: [
    [],
    ['test/a.test.js'],
    ["test/a's.test.js", 'test/line\nbreak.test.js'],
    ['--runInBand'],
  ],
  sourceFiles: [
    [],
    ['src/core/a.js'],
    ['src/logic/core/a.js', "src/it's.js", '\n'],
  ],
  environment: [
    {},
    { NODE_ENV: 'fixture' },
    { DADETO_COVERAGE_SHARD: '0' },
    { UNSET: undefined, DADETO_COVERAGE_SHARD: undefined },
  ],
  port: ['posix', 'win32', 'virtual'],
}).reduce(
  (prefixes, [field, values]) =>
    prefixes.flatMap(prefix =>
      values.map(value => ({ ...prefix, [field]: value }))
    ),
  [{}]
);
for (const vector of vectors) {
  const expected = observe(original, vector);
  const actual = observe(current, vector);
  assert.deepEqual(actual, expected);
  assert.equal(
    JSON.stringify(actual, encode),
    JSON.stringify(expected, encode)
  );
  commandHash.update(
    `${JSON.stringify({ vector, outcome: expected }, encode)}\n`
  );
  commandCases += 1;
}

const helperHash = createHash('sha256');
let helperCases = 0;
for (const rootDir of ['/repo', '', '.', "it's a repo", 'C:\\repo']) {
  for (const timeout of [0, -0, -1, 1, 45_000, Infinity, NaN]) {
    for (const stream of [undefined, false, true]) {
      const expected = original.commandOptions(rootDir, timeout, stream);
      assert.deepEqual(
        current.commandOptions(rootDir, timeout, stream),
        expected
      );
      helperHash.update(
        `${JSON.stringify(
          { rootDir, timeout, stream, outcome: expected },
          encode
        )}\n`
      );
      helperCases += 1;
    }
  }
}
for (const value of [
  '',
  'abc',
  "it's",
  "''",
  'a b',
  'line\nbreak',
  'tab\tvalue',
  '\\',
  '"',
  '$(literal)',
  '`literal`',
  '\0',
]) {
  const expected = original.quotePath(value);
  assert.equal(current.quotePath(value), expected);
  helperHash.update(`${JSON.stringify({ value, outcome: expected })}\n`);
  helperCases += 1;
}
assert.equal(current.JEST_RUNNER, original.JEST_RUNNER);

let errorCases = 0;
for (const failure of [
  undefined,
  null,
  false,
  0,
  17,
  'failure',
  Symbol('failure'),
  {},
  new Error('failure'),
]) {
  for (const stage of ['path', 'environment', 'quote']) {
    const observeFailure = implementation => {
      const trace = [];
      let thrown = false;
      try {
        if (stage === 'quote') {
          implementation.quotePath({
            replaceAll() {
              trace.push('quote');
              throw failure;
            },
          });
        } else {
          const environment = Object.defineProperty({}, 'VALUE', {
            enumerable: true,
            get() {
              trace.push('environment');
              throw failure;
            },
          });
          implementation.createScopedCoverageCommand({
            paths: {
              rootDir: '/repo',
              pathModule: {
                join() {
                  trace.push('path');
                  if (stage === 'path') throw failure;
                  return '/runner';
                },
              },
            },
            coverageDirectory: '/coverage',
            selection: { tests: [], sourceFiles: [] },
            environment,
          });
        }
      } catch (error) {
        thrown = true;
        assert.equal(error, failure);
      }
      assert.ok(thrown);
      return trace;
    };
    assert.deepEqual(observeFailure(current), observeFailure(original));
    errorCases += 1;
  }
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
      commandCases,
      commandSha256: commandHash.digest('hex'),
      helperCases,
      helperSha256: helperHash.digest('hex'),
      errorCases,
      publicCases,
      publicSha256: publicHash.digest('hex'),
    },
    null,
    2
  )
);
