import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import escomplex from 'typhonjs-escomplex';
import { createComplexityProfileHandle } from '../core/build/complexity-profile.js';

function readSource(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

const handle = createComplexityProfileHandle({
  analyzer: escomplex,
  readSource,
  stdout: process.stdout,
  argv: process.argv,
});

export const { buildComplexityProfile, compareComplexityProfiles } = handle;

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  try {
    handle.runFromCli();
  } catch (error) {
    process.stderr.write(
      `Failed to compare complexity profiles: ${error.message}\n`
    );
    process.exit(1);
  }
}

export { handle };
