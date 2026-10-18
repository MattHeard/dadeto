import { spawn as defaultSpawn } from 'node:child_process';
import { createRunCheckHandle, createRunCheckSuite, resolveRunCheckOptions } from '../core/commonCore.js';
import { runResourceAwareCheckSuite } from './run-check-resource-aware.js';

const runCheckSuite = createRunCheckSuite({
  defaultSpawn,
  defaultStdout: process.stdout,
  defaultStderr: process.stderr,
  defaultNow: () => Date.now(),
  defaultTimeoutMs: Number(
    process.env.DADETO_CHECK_TIMEOUT_MS ?? 120 * 60 * 1000
  ),
  defaultProgressIntervalMs: Number(
    process.env.DADETO_CHECK_PROGRESS_INTERVAL_MS ?? 3000
  ),
});

const handle = createRunCheckHandle({
  argv: process.argv,
  runSuite: options => runResourceAwareCheckSuite({ ...options, runSuite: runCheckSuite }),
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

await handle();

export { createRunCheckHandle, runCheckSuite, runResourceAwareCheckSuite };

export const runCheckSuiteTestOnly = {
  resolveRunCheckOptions: options =>
    resolveRunCheckOptions(options, {
      defaultSpawn,
      defaultStdout: process.stdout,
      defaultStderr: process.stderr,
      defaultNow: () => Date.now(),
    }),
};
