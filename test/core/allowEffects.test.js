import ts from 'typescript';
import { resolve } from 'node:path';
import { createAllowEffects } from '../../src/runtime/allow-effects.js';

/**
 * Compile an isolated checked-JavaScript caller against the real capability.
 * @param {string} body Capability call under test.
 * @returns {import('typescript').Diagnostic[]} Compiler findings without suppression pragmas.
 */
function compile(body) {
  const filename = resolve('test/allow-effects-fixture.js');
  const text = `
    import { createAllowEffects } from '../src/runtime/allow-effects.js';
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

test.each([
  ['command();', 2554],
  ['command({});', 2345],
  ['command({ AllowEffects: true });', 2353],
])('the compiler rejects forged or missing permission: %s', (source, code) => {
  expect(compile(source).map(finding => finding.code)).toContain(code);
});
