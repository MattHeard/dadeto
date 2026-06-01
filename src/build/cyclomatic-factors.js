import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import escomplex from 'typhonjs-escomplex';
import { createCyclomaticFactorsHandle } from '../core/build/cyclomatic-factors.js';

async function readStdIn() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

async function readInput() {
  const [fileArg] = process.argv.slice(2);
  if (fileArg) {
    return fs.readFileSync(path.resolve(fileArg), 'utf8');
  }
  if (!process.stdin.isTTY) {
    return readStdIn();
  }
  process.stderr.write(
    'Provide JavaScript code via a file argument or pipe it through stdin.\n'
  );
  process.exit(1);
}

const handle = createCyclomaticFactorsHandle({
  parser: escomplex,
  readInput,
  stdout: process.stdout,
});

export const { describeCyclomaticFactors } = handle;

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  handle.runFromCli().catch(error => {
    process.stderr.write(`Failed to analyze code: ${error.message}\n`);
    process.exit(1);
  });
}

export { handle };
