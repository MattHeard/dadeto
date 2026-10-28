import fs from 'node:fs';
import path from 'node:path';
import { createStaticJsonlTable } from '../core/build/staticJsonlTable.js';

const handle = createStaticJsonlTable({
  fileSystem: fs,
  paths: path,
  defaultDataRoot: path.resolve(process.cwd(), 'src/content/blog-data'),
});

export const {
  parseStaticJsonlTable,
  renderStaticJsonlTable,
  validateDefinition,
} = handle;
export { compareValues, compareRows } from '../core/build/staticJsonlTable.js';
