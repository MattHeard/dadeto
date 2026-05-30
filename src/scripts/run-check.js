import { createRunCheckHandle, runCheckSuite } from '../core/check-runner.js';

const handle = createRunCheckHandle({
  argv: process.argv,
  runSuite: runCheckSuite,
  setExitCode: exitCode => {
    process.exitCode = exitCode;
  },
});

await handle();
