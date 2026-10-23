import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAlgZooAccuracyReportCommandHandle as coreFactory } from '../core/local/algZooAccuracyReportCommand/index.js';

const handle = coreFactory({
  readFile: path => fs.readFileSync(path, 'utf8'),
  writeStdout: text => process.stdout.write(text),
  writeStderr: text => process.stderr.write(text),
  setExitCode: code => {
    process.exitCode = code;
  },
});

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  handle(process.argv.slice(2));
}
