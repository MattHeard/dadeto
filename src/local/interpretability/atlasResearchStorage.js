import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAtlasResearchStorageCore as coreFactory } from '../../core/local/interpretability/atlasResearchStorage.js';

const handle = options =>
  coreFactory({
    bundle: {
      bundlePath: options.bundlePath,
      schemas: options.schemas,
      logic: options.logic,
    },
    fileSystem: {
      pathModule: options.pathModule ?? path,
      readFileImpl: options.readFileImpl ?? readFile,
      mkdirImpl: options.mkdirImpl ?? mkdir,
      writeFileImpl: options.writeFileImpl ?? writeFile,
      renameImpl: options.renameImpl ?? rename,
      rmImpl: options.rmImpl ?? rm,
    },
    lock: {
      lockTimeoutMs: options.lockTimeoutMs,
      retryDelayMs: options.retryDelayMs,
      sleepImpl: options.sleepImpl ?? delay,
      nowImpl: options.nowImpl ?? Date.now,
    },
    identity: {
      randomIdImpl: options.randomIdImpl ?? randomUUID,
      digestImpl:
        options.digestImpl ??
        (value => createHash('sha256').update(value).digest('hex')),
    },
  });

export { handle as createAtomicAtlasResearchStorage };

function delay(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
