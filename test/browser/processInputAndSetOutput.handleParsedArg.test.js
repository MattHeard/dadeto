import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import vm from 'vm';
import { describe, it, expect } from '@jest/globals';

async function loadModuleWithCapture() {
  const url = pathToFileURL('./src/browser/toys.js');
  let code = await fs.readFile(url, 'utf8');
  code = code.replace(
    'function handleParsedResult(parsed, env, options) {',
    'function handleParsedResult(parsed, env, options) {\n  globalThis.__captured = parsed;'
  );
  const context = vm.createContext({ globalThis });
  async function linker(specifier, referencingModule) {
    const modUrl = new URL(specifier, referencingModule.identifier);
    const src = await fs.readFile(modUrl, 'utf8');
    const m = new vm.SourceTextModule(src, { identifier: modUrl.href, context });
    await m.link(linker);
    return m;
  }
  const mod = new vm.SourceTextModule(code, { identifier: url.href, context });
  await mod.link(linker);
  await mod.evaluate();
  return {
    processInputAndSetOutput: mod.namespace.processInputAndSetOutput,
    globalObj: context.globalThis,
  };
}

describe('processInputAndSetOutput parsed arg', () => {
  it('passes null to handleParsedResult when JSON is invalid', async () => {
    const { processInputAndSetOutput, globalObj } = await loadModuleWithCapture();

    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', () => {}],
    ]);
    const env = {
      createEnv: () => toyEnv,
      fetchFn: () => Promise.resolve({ text: () => Promise.resolve('') }),
      dom: {
        setTextContent: () => {},
        removeAllChildren: () => {},
        appendChild: () => {},
        createElement: () => ({}),
        addWarning: () => {},
        removeWarning: () => {},
      },
      errorFn: () => {},
      loggers: { logInfo: () => {}, logError: () => {}, logWarning: () => {} },
    };

    processInputAndSetOutput(elements, () => 'not json', env);

    expect(globalObj.__captured).toBeNull();
  });
});
