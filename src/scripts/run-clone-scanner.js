import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createCloneScanHandle } from '../core/scripts/clone-scanner.js';

const require = createRequire(import.meta.url);
const core = require('@jscpd/core');
const tokenizer = require('@jscpd/tokenizer');
const bytes = require('bytes');
const handle = createCloneScanHandle({
  readFile: target => fs.readFileSync(target, 'utf8'),
  readDirectory: root => fs.readdirSync(root, { recursive: true, withFileTypes: true }),
  fileSize: target => fs.statSync(target).size,
  joinPath: path.join,
  parseSize: bytes.parse,
  getDefaultOptions: core.getDefaultOptions,
  resolveMode: core.getModeHandler,
  formatFor: tokenizer.getFormatByFile,
  createStatistics: () => new core.Statistic(),
  createDetector: options => new core.Detector(new tokenizer.Tokenizer(), new core.MemoryStore(), [], {
    ...options,
    hashFunction: value => createHash('md5').update(value).digest('hex'),
  }),
  makeDirectory: target => fs.mkdirSync(target, { recursive: true }),
  writeFile: fs.writeFileSync,
}, process.argv[2]);

handle().then(report => {
  console.log(`Detected ${report.duplicates.length} clones; reports saved to the configured output.`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
