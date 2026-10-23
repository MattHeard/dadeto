#!/usr/bin/env node
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createThreefoldSpecSyncCommand } from '../core/local/threefoldSpecSync.js';
import {
  bindEffectBoundary,
  createEffectFetchFn,
} from './allow-effects.js';

const mode = parseMode(process.argv.slice(2));
if (mode === 'help') {
  console.log('Usage: npm run threefold:spec:check|refresh');
} else {
  const token = process.env.NOTION_THREEFOLD_SPEC_READ_TOKEN;
  if (!token?.trim()) {
    throw new Error(
      'Missing NOTION_THREEFOLD_SPEC_READ_TOKEN. Configure a dedicated read-only Notion integration token.'
    );
  }
  const handle = createThreefoldSpecSyncCommand({
    fetchImpl: createEffectFetchFn(globalThis.fetch),
    bindEffectBoundary,
    readFileImpl: (_permission, filePath, encoding) =>
      readFile(filePath, encoding),
    writeFileImpl: (_permission, filePath, content, encoding) =>
      writeFile(filePath, content, encoding),
    renameImpl: (_permission, from, to) => rename(from, to),
    unlinkImpl: (_permission, filePath) => unlink(filePath),
  });
  const result = await handle({
    mode,
    token,
    targetPath: path.join(process.cwd(), 'docs/toys/threefold/spec.md'),
  });
  console.log(`THREEFOLD spec sync: ${result}.`);
}

/** @param {string[]} args Command arguments. @returns {'check'|'refresh'|'help'} Mode. */
function parseMode(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--check')) {
    return 'check';
  }
  if (args.length === 1 && args[0] === '--refresh') return 'refresh';
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    return 'help';
  }
  throw new Error('Use either --check or --refresh.');
}
