import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect } from '@jest/globals';

async function loadModuleWithCapture() {
  const srcPath = path.join(process.cwd(), 'src/browser/toys.js');
  let code = fs.readFileSync(srcPath, 'utf8');
  code = code.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  code = code.replace(
    'function handleParsedResult(parsed, env, options) {',
    'function handleParsedResult(parsed, env, options) {\n  globalThis.__captured = parsed;'
  );
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}

describe('processInputAndSetOutput via dynamic import', () => {
  it('captures parsed result from invalid JSON', async () => {
    const mod = await loadModuleWithCapture();
    const { processInputAndSetOutput } = mod;
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

    expect(globalThis.__captured).toBeNull();
  });

  it('captures parsed object from valid JSON', async () => {
    const mod = await loadModuleWithCapture();
    const { processInputAndSetOutput } = mod;
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
    const obj = { request: { url: 'u' } };

    processInputAndSetOutput(elements, () => JSON.stringify(obj), env);

    expect(globalThis.__captured).toEqual(obj);
  });
});

