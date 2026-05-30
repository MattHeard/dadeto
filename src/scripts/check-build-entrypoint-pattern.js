import fs from 'node:fs';
import path from 'node:path';
import { createBuildEntrypointPatternHandle } from '../core/build/entrypoint-pattern.js';

const handle = createBuildEntrypointPatternHandle({
  readJson: filePath =>
    JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')),
  readSource: filePath => fs.readFileSync(path.resolve(filePath), 'utf8'),
  output: console,
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

handle();
