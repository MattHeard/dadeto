import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { parse } from '@babel/parser';

const moduleUrl = new URL(
  '../../../src/core/build/copy-cloud.js',
  import.meta.url
);
const source = readFileSync(moduleUrl, 'utf8');
const fixture = JSON.parse(
  readFileSync(
    new URL('./cloud-path-runtime-cases.json', import.meta.url),
    'utf8'
  )
);
assert.equal(
  createHash('sha256').update(source).digest('hex'),
  fixture.sourceSha256
);

/**
 * Load the exact source under test while preserving generated export templates.
 * @param {string} text Original or replacement source.
 * @returns {Promise<object>} Native module exports.
 */
async function load(text) {
  const declarations = parse(text, { sourceType: 'module' })
    .program.body.filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source)
    .toSorted((left, right) => right.start - left.start);
  for (const specifier of declarations) {
    text =
      text.slice(0, specifier.start) +
      JSON.stringify(new URL(specifier.value, moduleUrl).href) +
      text.slice(specifier.end);
  }
  return import(
    `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
  );
}

/**
 * Verify the control propagates its injected error, but bad paths fail before injection.
 * @param {Function} copyCloud Actual copy implementation.
 * @returns {Promise<{error: Error, injected: number, failure: Error}>} Observable rejection.
 */
async function outcome(copyCloud) {
  const target =
    '/repo/infra/cloud-functions/object-minute-rental-search/firestore.js';
  const failure = Object.assign(new Error('isolated final batch failure'), {
    code: 'EACCES',
  });
  let injected = 0;
  let error;
  try {
    await copyCloud({
      fileURLToPathFn: () => '/repo/src/core/build/copy-cloud.js',
      dirnameFn: path.posix.dirname,
      pathModule: path.posix,
      fsPromisesModule: {
        readdir: async () => [],
        mkdir: async () => undefined,
        copyFile: async () => undefined,
        writeFile: async () => undefined,
        readFile: async file => {
          if (file === target) {
            injected += 1;
            throw failure;
          }
          return '';
        },
      },
    });
  } catch (caught) {
    error = caught;
  }
  await setImmediate();
  return { error, injected, failure };
}

const control = await outcome((await load(source)).createCopyCloudHandle);
assert.equal(control.error, control.failure);
assert.equal(control.injected, 1);
const lines = source.split('\n');
const offset = point =>
  lines
    .slice(0, point.line - 1)
    .reduce((sum, line) => sum + line.length + 1, 0) +
  point.column -
  1;
const results = [];
for (const mutation of fixture.cases) {
  const replacement =
    source.slice(0, offset(mutation.location.start)) +
    mutation.replacement +
    source.slice(offset(mutation.location.end));
  const result = await outcome((await load(replacement)).createCopyCloudHandle);
  assert.ok(result.error instanceof TypeError, `mutant ${mutation.id}`);
  assert.equal(result.injected, 0, `mutant ${mutation.id}`);
  results.push({
    id: mutation.id,
    rejection: result.error.name,
    injected: result.injected,
  });
}
assert.equal(results.length, 9);
console.log(
  JSON.stringify(
    {
      control: 'original EACCES propagated',
      mutants: results,
      unhandledRejections: 0,
    },
    null,
    2
  )
);
