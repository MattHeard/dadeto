import { classifyFunctionsFromSource } from '../../classify-functions.js';
import fs from 'node:fs';
import path from 'node:path';
import { createCheckParseNotValidateHandle } from '../core/scripts/check-core-parse.js';

const handle = createCheckParseNotValidateHandle({
  classifySource: classifyFunctionsFromSource,
  fsModule: fs,
  pathModule: path,
  stdout: console,
  rootDir: process.cwd(),
});

const result = handle();
process.exitCode = result.exitCode;
