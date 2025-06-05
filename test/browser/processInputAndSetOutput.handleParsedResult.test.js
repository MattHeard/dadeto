import { describe, it, expect, jest } from '@jest/globals';
import { readFileSync, writeFileSync, promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const filePath = require.resolve('../../src/browser/toys.js');

async function loadProcessInputAndSetOutput() {
  const code = readFileSync(filePath, 'utf8');
  const modified = code.replace(
    /function handleParsedResult\(parsed, env, options\) {/,
    '$&\n  globalThis.__handledArg = parsed;'
  );
  const tempPath = join(dirname(filePath), `piaso.${Date.now()}.mjs`);
  writeFileSync(
    tempPath,
    `${modified}\nexport { processInputAndSetOutput as __fn };`
  );
  const module = await import(pathToFileURL(tempPath).href);
  await fsPromises.unlink(tempPath);
  return module.__fn;
}

describe('processInputAndSetOutput', () => {
  it('passes null to handleParsedResult when JSON parsing fails', async () => {
    const fn = await loadProcessInputAndSetOutput();
    const elements = {
      inputElement: { value: 'ignored' },
      article: { id: 'post1' },
      outputSelect: { value: 'text' },
      outputParentElement: {},
    };
    const processingFunction = jest.fn(() => 'not json');
    const env = {
      createEnv: jest.fn(() => new Map()),
      dom: {
        removeAllChildren: jest.fn(),
        createElement: jest.fn(() => ({})),
        setTextContent: jest.fn(),
        appendChild: jest.fn(),
      },
      fetchFn: jest.fn(),
    };
    global.__handledArg = undefined;
    fn(elements, processingFunction, env);
    expect(global.__handledArg).toBeNull();
  });
});
