import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { createFakeStorageClass } from '../../core/local/gcp-simulator/fake-storage.js';
import { bindEffectBoundary } from '../allow-effects.js';

const handle = createFakeStorageClass({
  fileSystem: {
    mkdir: (_permission, target, options) => mkdir(target, options),
    writeFile: (_permission, target, content) => writeFile(target, content),
    stat: target => stat(target),
    readFile: target => readFile(target),
  },
  paths: path,
  toBytes: content => Buffer.from(content),
  bindEffectBoundary,
});

export { handle as FakeStorage };
