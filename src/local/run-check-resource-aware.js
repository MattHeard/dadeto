import { CHECK_COMMANDS } from '../core/commonCore.js';

const TEST_COMMAND = CHECK_COMMANDS.filter(command => command.name === 'test');
const NON_TEST_COMMANDS = CHECK_COMMANDS.filter(command => command.name !== 'test');

/**
 * Run the memory-heavy test gate before the other quality gates.
 *
 * @param {{ failFast: boolean, skipTests: boolean, runSuite: (...args: never[]) => unknown }} options Runner options.
 * @returns {Promise<{ exitCode: number, failures: unknown[] }>} Combined result.
 */
export async function runResourceAwareCheckSuite({
  failFast,
  skipTests,
  runSuite,
  ...options
}) {
  if (skipTests) {
    return runSuite({ ...options, failFast, commands: NON_TEST_COMMANDS });
  }

  const testResult = await runSuite({ ...options, failFast, commands: TEST_COMMAND });
  if (testResult.exitCode !== 0 && failFast) return testResult;

  const remainingResult = await runSuite({
    ...options,
    failFast,
    commands: NON_TEST_COMMANDS,
  });
  return {
    exitCode: testResult.exitCode || remainingResult.exitCode,
    failures: [...testResult.failures, ...remainingResult.failures],
  };
}
