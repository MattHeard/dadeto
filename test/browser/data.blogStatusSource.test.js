import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/browser/data.js');

// Ensure BLOG_STATUS constant contains expected keys and values
// This guards against mutations that change the object structure
// or the string values used for each status.
describe('BLOG_STATUS constant source', () => {
  test('definition includes all expected status values', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const regex =
      /const BLOG_STATUS = \{\s*IDLE: 'idle',\s*LOADING: 'loading',\s*LOADED: 'loaded',\s*ERROR: 'error',?\s*\};/s;
    expect(src).toMatch(regex);
  });
});
