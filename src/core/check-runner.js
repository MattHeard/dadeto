import { spawn as defaultSpawn } from 'node:child_process';

import {
  CHECK_COMMANDS,
  createRunCheckHandle as createRunCheckHandleCore,
  createRunCheckSuite as createRunCheckSuiteCore,
  resolveRunCheckOptions as resolveRunCheckOptionsCore,
} from './commonCore.js';

const runCheckSuite = createRunCheckSuiteCore({
  defaultSpawn,
  defaultStdout: process.stdout,
  defaultStderr: process.stderr,
  defaultNow: () => Date.now(),
});

export {
  CHECK_COMMANDS,
  createRunCheckHandleCore as createRunCheckHandle,
  runCheckSuite,
};

export const runCheckSuiteTestOnly = {
  resolveRunCheckOptions: options =>
    resolveRunCheckOptionsCore(options, {
      defaultSpawn,
      defaultStdout: process.stdout,
      defaultStderr: process.stderr,
      defaultNow: () => Date.now(),
    }),
};
