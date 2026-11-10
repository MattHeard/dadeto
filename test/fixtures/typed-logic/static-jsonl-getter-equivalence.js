import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createStaticJsonlTable } from '../../../src/core/build/staticJsonlTable.js';
import {
  loadStaticJsonlOriginal,
  staticJsonlOriginal,
} from './static-jsonl-native-graph.js';
import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';

const observationUrl = new URL(
  './static-jsonl-getter-observations.json',
  import.meta.url
);

/**
 * Exercise ordered capability/descriptor getters with an exact injected failure.
 * @param {Function} factory Actual original/current factory.
 * @param {object} candidate Fault or changing-slot control.
 * @returns {object} Native results and complete getter/call order.
 */
function observe(factory, candidate) {
  const trace = [];
  let reads = 0;
  let targetReads = 0;
  const columns = ['a', 'b'];
  const sentinel = new RangeError('getter sentinel');
  const wrap = (label, object) =>
    new Proxy(object, {
      get(target, key, receiver) {
        reads += 1;
        trace.push(['get', label, String(key), reads]);
        if (reads === candidate.throwAt) throw sentinel;
        if (`${label}.${String(key)}` === candidate.target) {
          targetReads += 1;
          if (targetReads >= candidate.changeAt) return candidate.value;
        }
        return Reflect.get(target, key, receiver);
      },
    });
  const paths = wrap('paths', {
    isAbsolute(source) {
      trace.push(['isAbsolute', source, this === paths]);
      return path.posix.isAbsolute(source);
    },
    resolve(...parts) {
      trace.push(['resolve', parts, this === paths]);
      return path.posix.resolve(...parts);
    },
  });
  const fileSystem = wrap('fileSystem', {
    readFileSync(file, encoding) {
      trace.push(['readFileSync', file, encoding, this === fileSystem]);
      return '{"a":2,"b":"z"}\n{"a":1,"b":"x"}';
    },
  });
  const dependencies = wrap('dependencies', {
    paths,
    fileSystem,
    defaultDataRoot: '/authored',
  });
  const entry = wrap('entry', {
    source: 'table.jsonl',
    columns,
    collapsed: false,
  });
  const options = wrap('options', { dataRoot: undefined });
  let outcome;
  try {
    const bound = factory(dependencies);
    const value = bound[candidate.operation](entry, options);
    outcome = { returned: value, columnsAlias: value?.columns === columns };
  } catch (error) {
    outcome = {
      thrown: typeof error,
      name: error?.name,
      message: error?.message,
      sameSentinel: error === sentinel,
      causeIsSentinel: error?.cause === sentinel,
    };
  }
  return { candidate, outcome, trace };
}

/**
 * Generate failure-at-every-read and changing accepted raw-property controls.
 * @returns {object[]} Independent getter fault candidates.
 */
function candidates() {
  const cases = [];
  for (const operation of [
    'validateDefinition',
    'parseStaticJsonlTable',
    'renderStaticJsonlTable',
  ]) {
    cases.push({ operation });
    for (let throwAt = 1; throwAt <= 80; throwAt += 1)
      cases.push({ operation, throwAt });
    for (const target of [
      'entry.source',
      'entry.columns',
      'entry.collapsed',
      'options.dataRoot',
      'dependencies.defaultDataRoot',
    ])
      for (const changeAt of [1, 2, 3, 4, 8])
        for (const value of [
          undefined,
          null,
          false,
          '',
          '../escape',
          [],
          ['b', 'a'],
        ])
          cases.push({ operation, target, changeAt, value });
  }
  return cases;
}

/**
 * Compare the native graph and pin getter/failure semantics independently.
 * @returns {Promise<void>} Throws on semantic drift.
 */
async function main() {
  const original = await loadStaticJsonlOriginal(
    'src/core/build/staticJsonlTable.js'
  );
  const observations = candidates().map(candidate => {
    const legacy = observe(original.createStaticJsonlTable, candidate);
    const current = observe(createStaticJsonlTable, candidate);
    assert.equal(
      serialize(current),
      serialize(legacy),
      JSON.stringify(candidate)
    );
    return legacy;
  });
  const receipt = {
    revision: staticJsonlOriginal.revision,
    cases: observations.length,
    reads: observations.reduce(
      (count, item) =>
        count + item.trace.filter(event => event[0] === 'get').length,
      0
    ),
    sha256: createHash('sha256').update(serialize(observations)).digest('hex'),
  };
  if (process.argv.includes('--write-legacy'))
    writeFileSync(observationUrl, `${JSON.stringify(receipt, null, 2)}\n`);
  else
    assert.deepEqual(receipt, JSON.parse(readFileSync(observationUrl, 'utf8')));
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}
await main();
