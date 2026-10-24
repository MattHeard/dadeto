#!/usr/bin/env node
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { runThreefoldSpecSyncCli } from '../core/local/threefoldSpecSync.js';
import {
  bindEffectBoundary,
  createEffectFetchFn,
} from './allow-effects.js';

const message = await runThreefoldSpecSyncCli({
  args: process.argv.slice(2),
  token: process.env.NOTION_THREEFOLD_SPEC_READ_TOKEN,
  targetPath: path.join(process.cwd(), 'docs/toys/threefold/spec.md'),
  dependencies: {
    fetchImpl: createEffectFetchFn(globalThis.fetch),
    bindEffectBoundary,
    readFileImpl: (_permission, filePath, encoding) =>
      readFile(filePath, encoding),
    writeFileImpl: (_permission, filePath, content, encoding) =>
      writeFile(filePath, content, encoding),
    renameImpl: (_permission, from, to) => rename(from, to),
    unlinkImpl: (_permission, filePath) => unlink(filePath),
  },
});
if (message) console.log(message);
