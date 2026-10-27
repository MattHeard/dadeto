import { afterEach, expect, test } from '@jest/globals';
import { ESLint } from 'eslint';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import mutation from '../../stryker.config.mjs';
import { LOGIC_SOURCE_ROOTS } from '../../src/core/local/logic-source-paths.js';

const rootPaths = [...LOGIC_SOURCE_ROOTS];
const lint = new ESLint({ cache: false });
const types = JSON.parse(fs.readFileSync('tsconfig.jsdoc.json', 'utf8'));
const clones = JSON.parse(fs.readFileSync('.jscpd.json', 'utf8'));
const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

test.each(rootPaths)(
  'enforces source restrictions and existing capability selection under %s',
  async root => {
    const config = await lint.calculateConfigForFile(`${root}/example.js`);
    expect(config).toBeDefined();
    expect(config.rules['no-console'][0]).toBe(2);
    expect(config.rules['no-restricted-globals']).toEqual(
      expect.arrayContaining(['fetch', 'window', 'document', 'localStorage'])
    );
    expect(config.rules['repo/no-parameter-bag-arity-smuggling'][0]).toBe(2);
    expect(config.rules['no-restricted-imports'][0]).toBe(2);
    expect(config.linterOptions.noInlineConfig).toBe(true);
    const [result] = await lint.lintText(
      'export const view = window;\nconsole.log(view);\n',
      { filePath: `${root}/example.js` }
    );
    expect(result.messages.map(message => message.ruleId)).toEqual(
      expect.arrayContaining(['no-console', 'no-restricted-globals'])
    );
    const effects = await lint.calculateConfigForFile(
      `${root}/cloud/effectFetch.js`
    );
    expect(effects.rules['capability/allow-effects'][0]).toBe(2);
    const typePath = path.relative(`${root}/cloud`, 'types/allow-effects');
    const prefix = `/** @typedef {import('${typePath}').AllowEffects} AllowEffects */
/** @param {AllowEffects} permission */
function send(permission) {}
/** @param {AllowEffects} permission */
export function work(permission) { `;
    const [captured] = await lint.lintText(
      `${prefix}return () => send(permission); }`,
      { filePath: `${root}/cloud/effectFetch.js` }
    );
    expect(captured.messages.map(message => message.ruleId)).toContain(
      'capability/allow-effects'
    );
    const [explicit] = await lint.lintText(`${prefix}send(permission); }`, {
      filePath: `${root}/cloud/effectFetch.js`,
    });
    expect(explicit.messages.map(message => message.ruleId)).not.toContain(
      'capability/allow-effects'
    );

    const [minting] = await lint.lintText(
      "import { bindEffectBoundary } from '../../../local/allow-effects.js';\nexport { bindEffectBoundary };\n",
      { filePath: `${root}/example.js` }
    );
    expect(minting.messages.map(message => message.ruleId)).toContain(
      'no-restricted-imports'
    );
    const complexity = await lint.calculateConfigForFile(
      `${root}/browser/presenters/battleshipSolitaireClues.js`
    );
    expect(complexity.rules.complexity).toEqual([1, 4]);
    const input = await lint.calculateConfigForFile(
      `${root}/browser/inputHandlers/browserInputHandlersCore.js`
    );
    expect(input.rules['no-magic-numbers'][0]).toBe(2);
  }
);

test('TypeScript discovers JavaScript in all logic roots without new exclusions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logic-static-types-'));
  temporaryRoots.push(root);
  for (const folder of rootPaths) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    fs.writeFileSync(
      path.join(root, folder, 'example.js'),
      'export const value = 1;\n'
    );
  }
  const parsed = ts.parseJsonConfigFileContent(types, ts.sys, root);
  expect(parsed.fileNames.sort()).toEqual(
    rootPaths.map(folder => path.join(root, folder, 'example.js')).sort()
  );
  expect(types.exclude.filter(item => item.startsWith('src/logic/'))).toEqual(
    []
  );
  expect(types.compilerOptions.checkJs).toBe(true);
  expect(types.compilerOptions.noImplicitAny).toBe(true);
});

test.each(rootPaths)('mutation selection includes %s', root => {
  expect(mutation.mutate).toContain(`${root}/**/*.js`);
});

test('the lint command traverses both source namespaces', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(pkg.scripts.lint).toContain('"src/{core,logic}/**/*.js"');
});

test('the active clone config covers every logic root with unchanged strictness', () => {
  expect(clones.path).toEqual(rootPaths);
  expect(clones.minTokens).toBe(11);
  expect(clones.mode).toBe('mild');
  expect(clones.ignore).toBeUndefined();
});

test('the real clone scanner detects duplication across the two new namespaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logic-static-clones-'));
  temporaryRoots.push(root);
  for (const folder of rootPaths)
    fs.mkdirSync(path.join(root, folder), { recursive: true });
  const repeated = [
    'export function valueFor(input) {',
    '  const total = input.units * input.rate;',
    '  const label = input.label.toUpperCase();',
    '  return {',
    '    total,',
    '    label,',
    '    count: input.units,',
    '  };',
    '}',
    '',
  ].join('\n');
  for (const folder of ['src/logic/core', 'src/logic/boundary'])
    fs.writeFileSync(path.join(root, folder, 'example.js'), repeated);
  const config = {
    ...clones,
    path: clones.path.map(folder => path.join(root, folder)),
    reporters: ['json'],
    output: path.join(root, 'report'),
  };
  const configPath = path.join(root, 'clone-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  execFileSync(
    process.execPath,
    ['src/local/run-clone-scanner.js', configPath],
    { timeout: 10000 }
  );
  const report = JSON.parse(
    fs.readFileSync(path.join(root, 'report/jscpd-report.json'), 'utf8')
  );
  expect(report.duplicates.length).toBeGreaterThan(0);
  const files = report.duplicates.flatMap(duplicate => [
    duplicate.firstFile.name,
    duplicate.secondFile.name,
  ]);
  expect(files.some(file => file.includes('src/logic/core/'))).toBe(true);
  expect(files.some(file => file.includes('src/logic/boundary/'))).toBe(true);
});
