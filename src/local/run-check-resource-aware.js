import { CHECK_COMMANDS, FULL_CHECK_COMMANDS } from '../core/commonCore.js';

const IMPACT_TEST_COMMAND = CHECK_COMMANDS.filter(
  command => command.name === 'test:impact'
);
const FULL_TEST_COMMAND = FULL_CHECK_COMMANDS.filter(
  command => command.name === 'test'
);
const STATIC_COMMANDS = CHECK_COMMANDS.filter(
  command => command.name !== 'test:impact'
);
const FULL_STATIC_COMMANDS = FULL_CHECK_COMMANDS.filter(
  command => command.name !== 'test'
);

/**
 * Run the selected test gate before the other quality gates.
 *
 * @param {{ failFast: boolean, skipTests: boolean, fullCheck?: boolean, runSuite: (...args: never[]) => unknown }} options Runner options.
 * @returns {Promise<{ exitCode: number, failures: unknown[] }>} Combined result.
 */
export async function runResourceAwareCheckSuite({
  failFast,
  skipTests,
  fullCheck = false,
  runSuite,
  ...options
}) {
  const nonTestCommands = fullCheck ? FULL_STATIC_COMMANDS : STATIC_COMMANDS;
  if (skipTests) {
    return runSuite({ ...options, failFast, commands: nonTestCommands });
  }

  const testCommands = fullCheck ? FULL_TEST_COMMAND : IMPACT_TEST_COMMAND;
  const testResult = await runSuite({ ...options, failFast, commands: testCommands });
  if (testResult.exitCode !== 0 && failFast) return testResult;

  const remainingResult = await runSuite({
    ...options,
    failFast,
    commands: nonTestCommands,
  });
  return {
    exitCode: testResult.exitCode || remainingResult.exitCode,
    failures: [...testResult.failures, ...remainingResult.failures],
  };
}
