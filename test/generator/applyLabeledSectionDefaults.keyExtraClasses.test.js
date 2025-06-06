import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, test, expect } from '@jest/globals';

async function load() {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src +=
    '\nexport { applyLabeledSectionDefaults };\n//# sourceURL=' + generatorPath;
  return import(`data:text/javascript,${encodeURIComponent(src)}`);
}

describe('applyLabeledSectionDefaults', () => {
  test('sets default keyExtraClasses', async () => {
    const { applyLabeledSectionDefaults } = await load();
    const args = { label: 'l', valueHTML: '<span>v</span>' };
    const result = applyLabeledSectionDefaults(args);
    expect(result.keyExtraClasses).toBe('');
    expect(result.wrapValueDiv).toBe(true);
  });
});
