import { describe, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import vm from 'vm';
import { pathToFileURL } from 'url';

async function loadParseJSONResult() {
  const url = pathToFileURL('./src/browser/toys.js');
  let code = await fs.readFile(url, 'utf8');
  code += '\nexport { parseJSONResult };';
  const context = vm.createContext(global);
  const mod = new vm.SourceTextModule(code, { identifier: url.href, context });
  async function linker(specifier, referencingModule) {
    const modUrl = new URL(specifier, referencingModule.identifier);
    const src = await fs.readFile(modUrl, 'utf8');
    const child = new vm.SourceTextModule(src, {
      identifier: modUrl.href,
      context,
    });
    await child.link(linker);
    return child;
  }
  await mod.link(linker);
  await mod.evaluate();
  return mod.namespace.parseJSONResult;
}

describe('parseJSONResult coverage', () => {
  it('returns null for invalid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('invalid')).toBeNull();
  });

  it('returns object for valid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
