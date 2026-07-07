import fs from 'node:fs';
import path from 'node:path';
import { createCheckParseNotValidateHandle } from '../core/scripts/check-core-parse.js';

const handle = createCheckParseNotValidateHandle({
  fsModule: fs,
  pathModule: path,
  stdout: console,
  rootDir: process.cwd(),
  configPath: 'core-parse-exemptions.json',
});

const result = handle();
process.exitCode = result.exitCode;
