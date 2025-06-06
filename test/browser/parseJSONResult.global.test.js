import { describe, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import vm from 'vm';
import { pathToFileURL } from 'url';

async function loadParseJSONResult() {
  const url = pathToFileURL('./src/browser/toys.js');
  let code = await fs.readFile(url, 'utf8');
  code += '\nglobal.__test_parseJSONResult = parseJSONResult;';
  const context = vm.createContext(global);
  async function linker(specifier, referencingModule) {
    const modUrl = new URL(specifier, referencingModule.identifier);
    const src = await fs.readFile(modUrl, 'utf8');
    const m = new vm.SourceTextModule(src, {
      identifier: modUrl.href,
      context,
    });
    await m.link(linker);
    return m;
  }
  const mod = new vm.SourceTextModule(code, { identifier: url.href, context });
  await mod.link(linker);
  await mod.evaluate();
  return global.__test_parseJSONResult;
}

describe('parseJSONResult global', () => {
  it('returns null for invalid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });
});
