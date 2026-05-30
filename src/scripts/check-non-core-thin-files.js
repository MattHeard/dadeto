import {
  createCheckNonCoreThinHandle,
  formatNonCoreThinFailure,
  getNonCoreThinStatus,
} from '../core/local/non-core-thin/status.js';

const handle = createCheckNonCoreThinHandle({
  getStatus: getNonCoreThinStatus,
  formatFailure: formatNonCoreThinFailure,
  output: console,
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

handle();
