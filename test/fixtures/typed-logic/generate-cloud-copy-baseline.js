import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import {
  observeCloudCopyEffects,
  summarizeCloudCopyEffects,
} from './cloud-copy-effects.js';

const baseline =
  process.argv.slice(2).find(argument => !argument.startsWith('--')) ??
  'bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1';
assert.match(baseline, /^[a-f0-9]{40}$/);
const source = execFileSync(
  'git',
  ['show', `${baseline}:src/core/build/copy-cloud.js`],
  { encoding: 'utf8' }
);
const originalFile = new URL(
  '../../../src/core/build/copy-cloud.js',
  import.meta.url
);
const syntax = parse(source, { sourceType: 'module' });
const imports = syntax.program.body
  .filter(
    node =>
      [
        'ImportDeclaration',
        'ExportAllDeclaration',
        'ExportNamedDeclaration',
      ].includes(node.type) && node.source
  )
  .map(node => node.source)
  .filter(node => node.value.startsWith('.'))
  .toSorted((left, right) => right.start - left.start);
let imported = source;
for (const specifier of imports) {
  imported =
    imported.slice(0, specifier.start) +
    JSON.stringify(new URL(specifier.value, originalFile).href) +
    imported.slice(specifier.end);
}
const original = await import(
  `data:text/javascript;base64,${Buffer.from(imported).toString('base64')}`
);
const strings = new Set();
/**
 * Collect original relative import tokens without deriving expected effects from current code.
 * @param {unknown} node Original syntax tree or node field.
 * @returns {void}
 */
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'StringLiteral' && node.value.startsWith('.'))
    strings.add(node.value);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(syntax);
const payloads = [
  '',
  [...strings]
    .sort()
    .map(value => `import '${value}';`)
    .join('\n'),
];
const scenarios = [];
for (const payload of payloads) {
  const effects = await observeCloudCopyEffects(
    original.createCopyCloudHandle,
    payload
  );
  scenarios.push({
    payload,
    effects: process.argv.includes('--full')
      ? effects
      : summarizeCloudCopyEffects(effects),
  });
}
console.log(
  JSON.stringify(
    {
      baseline,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      legacyWgs84Copies: [
        [
          '/reference/src/core/wgs84.js',
          '/reference/infra/cloud-functions/object-minute-rental-search/core/wgs84.js',
        ],
        [
          '/reference/src/core/wgs84/index.js',
          '/reference/infra/cloud-functions/object-minute-rental-search/core/wgs84/index.js',
        ],
        [
          '/reference/src/core/wgs84/wgs84.js',
          '/reference/infra/cloud-functions/object-minute-rental-search/core/wgs84/wgs84.js',
        ],
      ],
      scenarios,
    },
    null,
    2
  )
);
