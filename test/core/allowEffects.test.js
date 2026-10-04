import ts from 'typescript';
import { resolve } from 'node:path';
import {
  createAllowEffects,
  createEffectHttpBoundary,
} from '../../src/cloud/allow-effects.js';
import { bindEffectResponder } from '../../src/local/allow-effects.js';

/**
 * Compile an isolated checked-JavaScript caller against the real capability.
 * @param {string} body Capability call under test.
 * @returns {import('typescript').Diagnostic[]} Compiler findings without suppression pragmas.
 */
function compile(body) {
  const filename = resolve('test/allow-effects-fixture.js');
  const text = `
    import { createAllowEffects } from '../src/cloud/allow-effects.js';
    /** @param {import('../types/allow-effects').AllowEffects} allowEffects */
    function command(allowEffects) { return allowEffects; }
    ${body}
  `;
  const options = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2023.d.ts'],
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, ...rest) =>
    name === filename
      ? ts.createSourceFile(
          filename,
          text,
          languageVersion,
          true,
          ts.ScriptKind.JS
        )
      : getSourceFile(name, languageVersion, ...rest);
  return ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
}

test('runtime factories mint distinct frozen permissions without a public structural brand', () => {
  const first = createAllowEffects();
  const second = createAllowEffects();
  expect(first).not.toBe(second);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.keys(first)).toEqual([]);
  expect(Object.getOwnPropertySymbols(first)).toHaveLength(1);
});

test('the real boundary capability type-checks as the first command argument', () => {
  expect(
    compile('command(createAllowEffects());').map(finding =>
      ts.flattenDiagnosticMessageText(finding.messageText, '\n')
    )
  ).toEqual([]);
});

test('HTTP adapters mint a fresh permission for each request and preserve public arguments', async () => {
  const calls = [];
  const handler = createEffectHttpBoundary(async (...args) => {
    calls.push(args);
  });
  const req = { body: 'submission' };
  const res = { status: 200 };
  await handler(req, res);
  await handler(req, res);
  expect(calls.map(call => call.slice(1))).toEqual([
    [req, res],
    [req, res],
  ]);
  expect(calls[0][0]).not.toBe(calls[1][0]);
  expect(calls.every(call => Object.isFrozen(call[0]))).toBe(true);
});

test('the local simulator boundary mints per command without changing its public request', async () => {
  const tokens = [];
  const route = bindEffectResponder(async (permission, request) => {
    tokens.push(permission);
    return request;
  });
  const request = { method: 'POST' };
  expect(await route(request)).toBe(request);
  expect(await route(request)).toBe(request);
  expect(tokens[0]).not.toBe(tokens[1]);
  expect(tokens.every(Object.isFrozen)).toBe(true);
});

test.each([
  ['command();', 2554],
  ['command({});', 2345],
  ['command({ AllowEffects: true });', 2353],
])('the compiler rejects forged or missing permission: %s', (source, code) => {
  expect(compile(source).map(finding => finding.code)).toContain(code);
});
