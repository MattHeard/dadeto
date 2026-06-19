import { spawn as defaultSpawn } from 'node:child_process';
import {
  createRunCheckHandle,
  createRunCheckSuite,
  resolveRunCheckOptions,
} from '../core/commonCore.js';

const runCheckSuite = createRunCheckSuite({
  defaultSpawn,
  defaultStdout: process.stdout,
  defaultStderr: process.stderr,
  defaultNow: () => Date.now(),
});

const handle = createRunCheckHandle({
  argv: process.argv,
  runSuite: runCheckSuite,
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

await handle();

export { createRunCheckHandle, runCheckSuite };

export const runCheckSuiteTestOnly = {
  resolveRunCheckOptions: options =>
    resolveRunCheckOptions(options, {
      defaultSpawn,
      defaultStdout: process.stdout,
      defaultStderr: process.stderr,
      defaultNow: () => Date.now(),
    }),
};
