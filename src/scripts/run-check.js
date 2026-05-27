import { runCheckSuite } from './check-runner.js';

const failFast = process.argv.includes('--fail-fast');

const result = await runCheckSuite({ failFast });
process.exitCode = result.exitCode;
