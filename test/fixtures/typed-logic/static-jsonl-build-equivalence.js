import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';

const fixtureUrl = new URL(
  './static-jsonl-legacy-source.json',
  import.meta.url
);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));
const tablePath = 'src/core/tableCore.js';
const buildPath = 'src/core/build/staticJsonlTable.js';
const observationsUrl = new URL(
  './static-jsonl-build-observations.json',
  import.meta.url
);

/**
 * Hash exact source or canonical observations.
 * @param {string} value Exact bytes as UTF-8.
 * @returns {string} SHA256 digest.
 */
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Import the frozen native graph without replacing its implementations.
 * @returns {Promise<object>} Original comparator and factory exports.
 */
async function original() {
  for (const entry of Object.values(fixture.modules))
    assert.equal(digest(entry.source), entry.sha256);
  const tableUrl = `data:text/javascript;base64,${Buffer.from(fixture.modules[tablePath].source).toString('base64')}`;
  const source = fixture.modules[buildPath].source;
  assert.equal(source.split("'../tableCore.js'").length, 2);
  const buildUrl = `data:text/javascript;base64,${Buffer.from(source.replace("'../tableCore.js'", JSON.stringify(tableUrl))).toString('base64')}`;
  return { ...(await import(tableUrl)), ...(await import(buildUrl)) };
}

/**
 * Record failures including wrapped cause without stack/path instability.
 * @param {Function} operation Native operation.
 * @returns {object} Returned value or native failure.
 */
function observe(operation) {
  try {
    return { returned: operation() };
  } catch (error) {
    return {
      thrown: typeof error,
      name: error?.name,
      message: error?.message,
      cause: error?.cause && {
        name: error.cause.name,
        message: error.cause.message,
      },
    };
  }
}

/**
 * Exercise independent authored source/definition policy categories.
 * @returns {object[]} Fresh inputs for each native implementation.
 */
function cases() {
  const valid = { source: 'table.jsonl', columns: ['a', 'b'] };
  const rows = '{"a":2,"b":"z"}\n{"a":1,"b":"x"}\n{"a":1,"b":"x"}';
  const result = [{ name: 'stable-numeric', entry: valid, source: rows }];
  for (const [index, entry] of [
    null,
    undefined,
    false,
    0,
    '',
    [],
    {},
    { ...valid, source: '' },
    { ...valid, source: ' ' },
    { ...valid, source: '/absolute' },
    { ...valid, source: '../escape' },
    { ...valid, source: 'nested\\..\\escape' },
    { ...valid, source: './safe' },
    { ...valid, source: 'nested/../escape' },
    { ...valid, source: 'a..b' },
    { ...valid, columns: [] },
    { ...valid, columns: ['a', 'a'] },
    { ...valid, columns: ['', 'a'] },
    { ...valid, columns: [1] },
    { ...valid, columns: [' '] },
    { ...valid, columns: new Array(2) },
  ].entries())
    result.push({ name: `definition-${index}`, entry, source: rows });
  for (const [index, source] of [
    '',
    '\n \r\n',
    '{}',
    'null',
    '[]',
    '1',
    'true',
    '"text"',
    '{',
    '\n\n{',
    '{"a":null,"b":"x"}',
    '{"a":true,"b":"x"}',
    '{"a":{},"b":"x"}',
    '{"a":[],"b":"x"}',
    '{"a":1e400,"b":"x"}',
    '{"a":1,"b":"x"}\n{"a":"1","b":"y"}',
    '{"a":-0,"b":"x"}\r\n\r\n{"a":0,"b":"y"}',
    '{"a":"<&>\\\"","b":"</script>"}',
  ].entries())
    result.push({ name: `source-${index}`, entry: valid, source });
  for (const collapsed of [true, false, 0, 1, 'true', null, undefined])
    result.push({
      name: `collapsed-${String(collapsed)}`,
      entry: { ...valid, collapsed },
      source: rows,
    });
  result.push({
    name: 'prototype-column',
    entry: { source: 'keys', columns: ['__proto__', 'constructor'] },
    source: '{"__proto__":2,"constructor":3}',
  });
  result.push({
    name: 'read-failure',
    entry: valid,
    source: rows,
    readFailure: true,
  });
  result.push({
    name: 'resolve-failure',
    entry: valid,
    source: rows,
    resolveFailure: true,
  });
  return result;
}

/**
 * Capture source capability order, aliases and both public projections.
 * @param {object} api Actual exported functions.
 * @param {object} candidate Native invocation case.
 * @param {boolean} construct Exercise ordinary/new factory calls.
 * @returns {object} Observed native behavior.
 */
function runCase(api, candidate, construct) {
  const trace = [];
  const dependencies = {
    defaultDataRoot: '/authored',
    paths: {
      isAbsolute(value) {
        trace.push(['absolute', value]);
        return path.posix.isAbsolute(value);
      },
      resolve(...parts) {
        trace.push(['resolve', parts]);
        if (candidate.resolveFailure) throw new RangeError('resolve sentinel');
        return path.posix.resolve(...parts);
      },
    },
    fileSystem: {
      readFileSync(file, encoding) {
        trace.push(['read', file, encoding]);
        if (candidate.readFailure) throw new Error('read sentinel');
        return candidate.source;
      },
    },
  };
  const factory = api.createStaticJsonlTable;
  const bound = construct ? new factory(dependencies) : factory(dependencies);
  const parsed = observe(() => {
    const result = bound.parseStaticJsonlTable(candidate.entry);
    return {
      result,
      columnsAlias: result.columns === candidate.entry.columns,
      rowKeys: result.rows.map(row => Object.keys(row.values)),
      prototypeSlot: result.rows.map(
        row => row.values.__proto__ === Object.prototype
      ),
    };
  });
  const rendered = observe(() => bound.renderStaticJsonlTable(candidate.entry));
  const repeated = observe(() => bound.parseStaticJsonlTable(candidate.entry));
  return { name: candidate.name, construct, parsed, rendered, repeated, trace };
}

/**
 * Compare numeric/lexical coercion categories without assuming validated callers.
 * @param {object} api Actual comparator export.
 * @returns {object[]} Native comparator observations.
 */
function comparisons(api) {
  const values = [
    -Infinity,
    -1,
    -0,
    0,
    1,
    Infinity,
    NaN,
    '',
    '2',
    '10',
    null,
    undefined,
    true,
    {},
    [],
  ];
  const results = [];
  for (const type of [undefined, 'number', 'string', 'unknown'])
    for (const [leftIndex, left] of values.entries())
      for (const [rightIndex, right] of values.entries())
        results.push({
          type,
          leftIndex,
          rightIndex,
          outcome: observe(() => api.compareTableValues(left, right, type)),
        });
  return results;
}

/**
 * Compare native outputs to an immutable original, then pin original observations.
 * @returns {Promise<void>} Throws on source or behavioral drift.
 */
async function main() {
  const legacy = await original();
  const current = {
    ...(await import(pathToFileURL(path.resolve(tablePath)).href)),
    ...(await import(pathToFileURL(path.resolve(buildPath)).href)),
  };
  const baseline = {
    comparisons: comparisons(legacy),
    cases: [false, true].flatMap(construct =>
      cases().map(candidate => runCase(legacy, candidate, construct))
    ),
  };
  const actual = {
    comparisons: comparisons(current),
    cases: [false, true].flatMap(construct =>
      cases().map(candidate => runCase(current, candidate, construct))
    ),
  };
  assert.equal(serialize(actual), serialize(baseline));
  const pinned = {
    revision: fixture.revision,
    comparisons: baseline.comparisons.length,
    cases: baseline.cases.length,
    sha256: digest(serialize(baseline)),
  };
  if (process.argv.includes('--write-legacy')) {
    assert.equal(
      process.argv.filter(value => value === '--write-legacy').length,
      1
    );
    writeFileSync(observationsUrl, `${JSON.stringify(pinned, null, 2)}\n`);
  } else
    assert.deepEqual(pinned, JSON.parse(readFileSync(observationsUrl, 'utf8')));
  process.stdout.write(`${JSON.stringify(pinned, null, 2)}\n`);
}
await main();
