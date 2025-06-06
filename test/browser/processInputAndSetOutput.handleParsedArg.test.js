import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect } from '@jest/globals';

async function loadModuleWithCapture() {
  const filePath = path.join(process.cwd(), 'src/browser/toys.js');
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  code = code.replace(
    'function handleParsedResult(parsed, env, options) {',
    'function handleParsedResult(parsed, env, options) {\n  globalThis.__captured = parsed;'
  );
  // processInputAndSetOutput is already exported in the source file
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}

describe('processInputAndSetOutput parsed arg', () => {
  it('passes null to handleParsedResult when JSON is invalid', async () => {
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
});
