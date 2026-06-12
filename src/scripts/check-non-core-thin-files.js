import {
  createCheckNonCoreThinHandle,
  formatNonCoreThinFailure,
  getNonCoreThinStatus as getNonCoreThinStatusCore,
} from '../core/local/non-core-thin/status.js';
import fs from 'node:fs';
import path from 'node:path';

const getNonCoreThinStatus = options =>
  getNonCoreThinStatusCore({
    ...options,
    fsModule: options?.fsModule ?? fs,
    pathModule: options?.pathModule ?? path,
    repoRoot: options?.repoRoot ?? process.cwd(),
  });

const handle = createCheckNonCoreThinHandle({
  getStatus: getNonCoreThinStatus,
  formatFailure: formatNonCoreThinFailure,
  output: console,
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

const hadFailures = handle();

if (!hadFailures) {
  process.exit(0);
}
