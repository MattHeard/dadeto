#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateThreefoldSpecCache } from '../core/local/threefoldSpecSync.js';

const targetPath = path.join(process.cwd(), 'docs/toys/threefold/spec.md');
const content = await readFile(targetPath, 'utf8');
validateThreefoldSpecCache(content);
console.log('THREEFOLD spec cache: valid.');
