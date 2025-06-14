import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/browser/toys.js');

describe('inputHandlersMap constant source', () => {
  test('definition includes expected handler mappings', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const regex =
      /const inputHandlersMap = \{\s*text: textHandler,\s*number: numberHandler,\s*kv: kvHandler,\s*'dendrite-story': dendriteStoryHandler,\s*default: defaultHandler,?\s*\};/s;
    expect(src).toMatch(regex);
  });
});
