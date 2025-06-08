import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/browser/toys.js');

describe('inputHandlers constant source', () => {
  test('definition includes text and default handlers', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const regex = /const inputHandlers = \{\s*text: \(dom, container, textInput\) => \{[\s\S]*?\},\s*default: \(dom, _container, textInput\) => \{[\s\S]*?\}\s*\};/s;
    expect(src).toMatch(regex);
  });
});
