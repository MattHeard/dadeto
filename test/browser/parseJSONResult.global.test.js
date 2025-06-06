import { describe, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import vm from 'vm';
import { pathToFileURL } from 'url';

async function loadParseJSONResult() {
  const mainUrl = pathToFileURL('./src/browser/toys.js');
  let code = await fs.readFile(mainUrl, 'utf8');
  code += '\nglobalThis.__test_parseJSONResult = parseJSONResult;';
  const context = vm.createContext(globalThis);
  async function linker(specifier, referencingModule) {
    const url = new URL(specifier, referencingModule.identifier);
    const src = await fs.readFile(url, 'utf8');
    const m = new vm.SourceTextModule(src, { identifier: url.href, context });
    await m.link(linker);
    return m;
  }
  const mod = new vm.SourceTextModule(code, { identifier: mainUrl.href, context });
  await mod.link(linker);
  await mod.evaluate();
  return context.__test_parseJSONResult;
}

describe('parseJSONResult via vm global', () => {
  it('returns null for invalid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('returns object for valid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
