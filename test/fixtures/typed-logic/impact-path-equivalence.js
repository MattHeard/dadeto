import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  normalizeImpactPath,
  classifyImpactPath,
} from '../../../src/logic/boundary/local/impact-paths.js';
import { createCheckImpactPlan } from '../../../src/core/local/checkImpactPlan.js';

const baseline = process.argv[2] ?? 'ca94b6428d03fc179746cc31ef98d39d9fdf7998';
assert.match(baseline, /^[a-f0-9]{40}$/);
const source = spawnSync(
  'git',
  ['show', `${baseline}:src/core/local/checkImpactPlan.js`],
  { encoding: 'utf8' }
);
assert.equal(source.status, 0, source.stderr);
const originalFile = new URL(
  '../../../src/core/local/checkImpactPlan.js',
  import.meta.url
);
const imported = source.stdout.replace(
  /from '([^']+)'/g,
  (_match, specifier) => `from '${new URL(specifier, originalFile).href}'`
);
const original = await import(
  `data:text/javascript;base64,${Buffer.from(`${imported}\nexport { normalizePath, classifyPath };`).toString('base64')}`
);
const hash = createHash('sha256');
const tokens = [
  '',
  './',
  'src/',
  'test/',
  'test/e2e/',
  '../',
  '..',
  '/',
  '\\',
  '\n',
  '\r',
  '\0',
  '.js',
  '.test.js',
  'a',
  'a..b',
  'λ',
];
let cases = 0;
let level = [''];
for (let length = 0; length <= 4; length += 1) {
  for (const value of level) {
    const normalized = original.normalizePath(value);
    assert.equal(normalizeImpactPath(value), normalized, JSON.stringify(value));
    assert.equal(
      classifyImpactPath(value),
      original.classifyPath(value),
      JSON.stringify(value)
    );
    assert.equal(
      classifyImpactPath(normalized),
      original.classifyPath(normalized),
      JSON.stringify(value)
    );
    hash.update(
      JSON.stringify([
        value,
        normalized,
        original.classifyPath(value),
        original.classifyPath(normalized),
      ])
    );
    cases += 1;
  }
  if (length < 4)
    level = level.flatMap(prefix => tokens.map(token => prefix + token));
}
for (const value of [
  undefined,
  null,
  true,
  false,
  0,
  1.5,
  1n,
  Symbol('path'),
  [],
  {},
  () => 'path',
]) {
  assert.equal(normalizeImpactPath(value), original.normalizePath(value));
  cases += 1;
}
const planHash = createHash('sha256');
let planCases = 0;
const lists = [
  undefined,
  [],
  ['src/core/a.js'],
  ['test/core/a.test.js'],
  [null, undefined, 42],
  new Array(1),
  ['src/core/a.js', 'z/unsupported.md'],
  ['test/core/z.test.js', './test\\core\\a.test.js'],
  null,
  42,
  {},
  'text',
];
/**
 * Observe the public programmatic result or outward error contract.
 * @param {Function} createPlan Original or current planner.
 * @param {object} options Candidate options.
 * @returns {object} Exact public data or error class/message.
 */
function observePlan(createPlan, options) {
  try {
    return { ok: true, plan: createPlan(options) };
  } catch (error) {
    return { ok: false, error: error.name, message: error.message };
  }
}
for (const changedPaths of lists) {
  for (const relatedTestPaths of lists) {
    for (const relatedTestsResolved of [undefined, false, true]) {
      for (const collectionError of ['', 'collection failed']) {
        const options = {
          changedPaths,
          relatedTestPaths,
          relatedTestsResolved,
          collectionError,
        };
        const expected = observePlan(original.createCheckImpactPlan, options);
        assert.deepEqual(
          observePlan(createCheckImpactPlan, options),
          expected,
          `programmatic case ${planCases}`
        );
        planHash.update(JSON.stringify(expected));
        planCases += 1;
      }
    }
  }
}
process.stdout.write(
  `${JSON.stringify({ baseline, cases, sha256: hash.digest('hex'), planCases, planSha256: planHash.digest('hex') })}\n`
);
