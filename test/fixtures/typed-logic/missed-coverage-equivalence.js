import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
 * Load immutable/current actual interpretation and full report without copying bodies.
 * @param {string} source Complete module.
 * @param {string} exports Private names exposed for comparison.
 * @param {URL} url Actual source import base.
 * @returns {Promise<object>} Actual exports plus private observers.
 */
async function load(
  source,
  exports = 'listUncoveredLines, listUncoveredBranches, createScopedCoverageReport',
  url = moduleUrl
) {
  const imports = parse(source, { sourceType: 'module' })
    .program.body.filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of imports)
    source =
      source.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, url).href) +
      source.slice(specifier.end);
  source += `\nexport { ${exports} };\n`;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
}

/**
 * Retain returned evidence or exact native error category/message.
 * @param {Function} callback Actual operation.
 * @returns {object} Stable outcome.
 */
function outcome(callback) {
  try {
    return { kind: 'return', value: callback() };
  } catch (error) {
    return {
      kind: 'throw',
      type: typeof error,
      name: error?.name,
      message: error?.message,
    };
  }
}

const original = await load(git.stdout);
const boundaryUrl = new URL(
  '../../../src/logic/boundary/local/missed-coverage.js',
  import.meta.url
);
const current = {
  ...(await load(
    readFileSync(moduleUrl, 'utf8'),
    'createScopedCoverageReport'
  )),
  ...(await load(
    readFileSync(boundaryUrl, 'utf8'),
    'listUncoveredLines, listUncoveredBranches',
    boundaryUrl
  )),
};
const interpretationHash = createHash('sha256');
const reportHash = createHash('sha256');
let interpretationCases = 0;
let reportCases = 0;

/**
 * Compare actual field interpretation and whole requested-file projection.
 * @param {string} label Stable fixture identity including opaque candidate categories.
 * @param {unknown} record Unparsed record candidate.
 * @returns {void} Equality assertions.
 */
function compare(label, record) {
  const interpret = implementation =>
    outcome(() => ({
      uncoveredLines: implementation.listUncoveredLines(record),
      uncoveredBranches: implementation.listUncoveredBranches(record),
    }));
  const expected = interpret(original);
  assert.deepEqual(interpret(current), expected);
  interpretationHash.update(`${serialize({ label, outcome: expected })}\n`);
  interpretationCases += 1;
  const report = implementation =>
    outcome(() =>
      implementation.createScopedCoverageReport(
        ['src/core/a.js', 'src/logic/core/missing.js'],
        [
          {
            coverage: { '/fixture/src/core/a.js': record },
            command: 'fixture coverage',
          },
        ],
        { rootDir: '/fixture', pathModule: path.posix }
      )
    );
  const expectedReport = report(original);
  assert.deepEqual(report(current), expectedReport);
  reportHash.update(`${serialize({ label, outcome: expectedReport })}\n`);
  reportCases += 1;
}

const lines = [
  undefined,
  null,
  -0,
  0,
  -3,
  1,
  2,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  Infinity,
  NaN,
  '1',
  true,
  0n,
  Symbol('line'),
  {},
  [],
];
const counts = [0, -0, 1, -1, NaN, '0', null, undefined, false, {}, []];
for (const [lineIndex, line] of lines.entries()) {
  for (const [countIndex, count] of counts.entries()) {
    compare(`line-${lineIndex}-count-${countIndex}`, {
      s: { a: count, b: 0 },
      statementMap: { a: { start: { line } }, b: { start: { line } } },
      b: { a: [count, 0] },
      branchMap: { a: { line } },
    });
  }
  for (const [fallbackIndex, fallback] of lines.entries()) {
    for (const shape of ['line', 'missing-start', 'null-location']) {
      const location =
        shape === 'line'
          ? { start: { line } }
          : shape === 'missing-start'
            ? {}
            : null;
      compare(`arm-${lineIndex}-fallback-${fallbackIndex}-${shape}`, {
        b: { a: [0, 1, 0] },
        branchMap: { a: { line: fallback, locations: [location] } },
      });
    }
  }
}
for (const [index, value] of [
  undefined,
  null,
  false,
  0,
  '',
  17,
  true,
  'data',
  [],
  {},
].entries())
  compare(`root-${index}`, value);
for (const [index, value] of [
  undefined,
  null,
  1,
  'bad',
  {},
  [0],
  Array(2),
].entries())
  compare(`malformed-arm-${index}`, {
    b: { a: value },
    branchMap: { a: { line: 7 } },
  });
compare('ordered-lines-and-arms', {
  s: { z: 0, a: 0, b: 0 },
  statementMap: {
    z: { start: { line: 10 } },
    a: { start: { line: -2 } },
    b: { start: { line: 10 } },
  },
  b: { z: [0, 0], a: [0] },
  branchMap: { z: { line: 8 }, a: { line: 1 } },
});
compare('sparse-arms', { b: { a: Array(3) }, branchMap: { a: { line: 9 } } });

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
  for (const field of ['statementMap', 's', 'branchMap', 'b']) {
    const observe = implementation => {
      const trace = [];
      const record = {};
      for (const name of ['statementMap', 's', 'branchMap', 'b'])
        Object.defineProperty(record, name, {
          enumerable: true,
          get() {
            trace.push(name);
            if (name === field) throw failure;
            return {};
          },
        });
      let thrown = false;
      try {
        implementation.listUncoveredLines(record);
        implementation.listUncoveredBranches(record);
      } catch (error) {
        thrown = true;
        assert.equal(error, failure);
      }
      assert.ok(thrown);
      return trace;
    };
    assert.deepEqual(observe(current), observe(original));
    errorCases += 1;
  }
}
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
      interpretationCases,
      interpretationSha256: interpretationHash.digest('hex'),
      reportCases,
      reportSha256: reportHash.digest('hex'),
      errorCases,
      publicCases,
      publicSha256: publicHash.digest('hex'),
    },
    null,
    2
  )
);
