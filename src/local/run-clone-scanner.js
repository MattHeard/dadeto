import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createCloneScanHandle } from '../core/local/clone-scanner.js';
import { escapeHtml } from '../core/build/html.js';
import { bindEffectBoundary } from './allow-effects.js';

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
  escapeHtml,
  createStatistics: () => new core.Statistic(),
  createDetector: options => new core.Detector(new tokenizer.Tokenizer(), new core.MemoryStore(), [], {
    ...options,
    hashFunction: value => createHash('md5').update(value).digest('hex'),
  }),
  makeDirectory: (_permission, target) =>
    fs.mkdirSync(target, { recursive: true }),
  writeFile: (_permission, target, content) => fs.writeFileSync(target, content),
  bindEffectBoundary,
}, process.argv[2]);

handle().then(report => {
  console.log(`Detected ${report.duplicates.length} clones; reports saved to the configured output.`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
