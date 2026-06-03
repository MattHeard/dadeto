import fs from 'node:fs';
import path from 'node:path';
import {
  createCheckNonCoreThinHandle,
  formatNonCoreThinFailure,
  getNonCoreThinStatus as getNonCoreThinStatusCore,
  nonCoreThinStatusTestOnly,
} from '../../core/local/non-core-thin/status.js';

export function getNonCoreThinStatus(options = {}) {
  return getNonCoreThinStatusCore({
    ...options,
    fsModule: options.fsModule ?? fs,
    pathModule: options.pathModule ?? path,
    repoRoot: options.repoRoot ?? process.cwd(),
  });
}

export {
  createCheckNonCoreThinHandle,
  formatNonCoreThinFailure,
  nonCoreThinStatusTestOnly,
};
