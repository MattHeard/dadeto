import { jest } from '@jest/globals';
import {
  CHECK_COMMANDS,
  FULL_CHECK_COMMANDS,
} from '../../src/core/commonCore.js';
import { runResourceAwareCheckSuite } from '../../src/local/run-check-resource-aware.js';

describe('runResourceAwareCheckSuite', () => {
  test('keeps coverage commands out of the fast check and preserves full checks', () => {
    expect(
      CHECK_COMMANDS.find(command => command.name === 'test:impact')
    ).toEqual({
      name: 'test:impact',
      command: 'npm',
      args: ['run', 'test:impact'],
    });
    expect(
      CHECK_COMMANDS.some(
        command =>
          command.args[0] === 'test' || command.args.includes('test:unit')
      )
    ).toBe(false);
    expect(
      FULL_CHECK_COMMANDS.find(command => command.name === 'test')
    ).toEqual({
      name: 'test',
      command: 'npm',
      args: ['test'],
    });
  });

  test('runs tests before the remaining checks and combines results', async () => {
    const calls = [];
    const runSuite = async ({ commands }) => {
      calls.push(commands.map(command => command.name));
      if (calls.length === 1) return { exitCode: 0, failures: [] };
      return { exitCode: 1, failures: ['lint'] };
    };

    await expect(
      runResourceAwareCheckSuite({ failFast: false, runSuite })
    ).resolves.toEqual({ exitCode: 1, failures: ['lint'] });
    expect(calls[0]).toEqual(['test:impact']);
    expect(calls[1]).not.toContain('test:impact');
  });

  test('does not start remaining checks after a fail-fast test failure', async () => {
    const runSuite = jest
      .fn()
      .mockResolvedValue({ exitCode: 1, failures: ['test'] });

    await expect(
      runResourceAwareCheckSuite({ failFast: true, runSuite })
    ).resolves.toEqual({ exitCode: 1, failures: ['test'] });
    expect(runSuite).toHaveBeenCalledTimes(1);
  });

  test('runs every non-test check when tests are skipped', async () => {
    const runSuite = jest.fn().mockResolvedValue({ exitCode: 0, failures: [] });

    await expect(
      runResourceAwareCheckSuite({ failFast: false, skipTests: true, runSuite })
    ).resolves.toEqual({ exitCode: 0, failures: [] });

    expect(runSuite).toHaveBeenCalledTimes(1);
    expect(
      runSuite.mock.calls[0][0].commands.map(command => command.name)
    ).not.toContain('test:impact');
  });

  test('uses the full suite and coverage command only for full checks', async () => {
    const calls = [];
    const runSuite = async ({ commands }) => {
      calls.push(commands.map(command => [command.name, ...command.args]));
      return { exitCode: 0, failures: [] };
    };

    await runResourceAwareCheckSuite({
      failFast: false,
      fullCheck: true,
      runSuite,
    });

    expect(calls[0]).toEqual([['test', 'test']]);
    expect(calls[1]).not.toContainEqual(['test:impact', 'run', 'test:impact']);
  });
});

test('fast and full checks both enforce cloud template drift', () => {
  const command = {
    name: 'cloud:templates:check',
    command: 'npm',
    args: ['run', 'cloud:templates:check'],
  };
  expect(CHECK_COMMANDS.filter(item => item.name === command.name)).toEqual([
    command,
  ]);
  expect(
    FULL_CHECK_COMMANDS.filter(item => item.name === command.name)
  ).toEqual([command]);
});
