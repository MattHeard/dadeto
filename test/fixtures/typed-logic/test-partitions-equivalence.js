import { parseTestShardSize } from '../../../src/logic/boundary/local/test-shard-size.js';
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
 * Load actual full modules and expose the private shard interpreter/partitioner.
 * @param {string} source Original or current complete module.
 * @param {boolean} original Whether to expose the original private resolver.
 * @returns {Promise<object>} Native actual functions.
 */
async function load(source, original = true) {
  const imports = parse(source, { sourceType: 'module' })
    .program.body.filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of imports)
    source =
      source.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, moduleUrl).href) +
      source.slice(specifier.end);
  source += original
    ? '\nexport { partitionTests, resolveImpactShardSize };\n'
    : '\nexport { partitionTests };\n';
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
}
const original = await load(git.stdout);
const current = {
  ...(await load(readFileSync(moduleUrl, 'utf8'), false)),
  resolveImpactShardSize: deps => parseTestShardSize(deps.impactShardSize),
};
const resolverHash = createHash('sha256');
let resolverCases = 0;
const candidates = [
  undefined,
  null,
  -0,
  0,
  -1,
  1,
  2,
  199,
  200,
  201,
  2 ** 53,
  Number.MAX_VALUE,
  1.5,
  NaN,
  Infinity,
  -Infinity,
  true,
  false,
  '',
  '2',
  1n,
  Symbol('size'),
  {},
  [],
  [2],
  new Number(2),
  () => 2,
];
for (const [index, value] of candidates.entries()) {
  const expected = original.resolveImpactShardSize({ impactShardSize: value });
  assert.equal(
    current.resolveImpactShardSize({ impactShardSize: value }),
    expected
  );
  assert.ok(Number.isInteger(expected) && expected > 0);
  resolverHash.update(`${serialize({ index, result: expected })}\n`);
  resolverCases += 1;
}
let coercions = 0;
const opaque = {
  valueOf() {
    coercions += 1;
    throw new Error('must remain lazy');
  },
  toString() {
    coercions += 1;
    throw new Error('must remain lazy');
  },
};
assert.equal(original.resolveImpactShardSize({ impactShardSize: opaque }), 200);
assert.equal(current.resolveImpactShardSize({ impactShardSize: opaque }), 200);
assert.equal(coercions, 0);
const readTrace = implementation => {
  let reads = 0;
  const result = implementation.resolveImpactShardSize({
    get impactShardSize() {
      reads += 1;
      return 3;
    },
  });
  return { reads, result };
};
assert.deepEqual(readTrace(current), { reads: 1, result: 3 });
assert.deepEqual(readTrace(current), readTrace(original));
let errorCases = 0;
for (const error of [
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
    try {
      implementation.resolveImpactShardSize({
        get impactShardSize() {
          throw error;
        },
      });
    } catch (actual) {
      thrown = true;
      assert.equal(actual, error);
    }
    assert.ok(thrown);
  }
  errorCases += 1;
}
const partitionHash = createHash('sha256');
let partitionCases = 0;
for (const length of [0, 1, 2, 3, 7, 199, 200, 201, 401]) {
  for (const sparse of [false, true]) {
    const tests = Array.from(
      { length },
      (_, index) => `test/core/${index}.test.js`
    );
    if (sparse)
      for (let index = 1; index < tests.length; index += 3) delete tests[index];
    const before = serialize(tests);
    for (const size of [1, 2, 3, 7, 200, 2 ** 53]) {
      // Only proven positive integers reach the original loop; rejected sizes can hang.
      const expected = original.partitionTests(tests, size);
      const actual = current.partitionTests(tests, size);
      assert.deepEqual(actual, expected);
      assert.equal(serialize(actual), serialize(expected));
      assert.equal(serialize(tests), before);
      assert.notEqual(actual, tests);
      for (const shard of actual) {
        assert.notEqual(shard, tests);
        assert.ok(shard.length > 0 && shard.length <= size);
      }
      partitionHash.update(
        `${serialize({ length, sparse, size, result: expected })}\n`
      );
      partitionCases += 1;
    }
  }
}
const shared = {};
const identityInput = [shared, shared];
const identityResult = current.partitionTests(identityInput, 1);
assert.equal(identityResult[0][0], shared);
assert.equal(identityResult[1][0], shared);
const publicHash = createHash('sha256');
let publicCases = 0;
for (const input of impactContractCases()) {
  const expected = observeImpactContract(original, input);
  assert.deepEqual(observeImpactContract(current, input), expected);
  publicHash.update(`${JSON.stringify(expected)}\n`);
  publicCases += 1;
}
console.log(
  JSON.stringify(
    {
      baseline,
      sourceSha256,
      resolverCases,
      resolverSha256: resolverHash.digest('hex'),
      errorCases,
      partitionCases,
      partitionSha256: partitionHash.digest('hex'),
      publicCases,
      publicSha256: publicHash.digest('hex'),
    },
    null,
    2
  )
);
