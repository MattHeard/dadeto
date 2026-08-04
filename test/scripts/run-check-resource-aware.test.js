import { jest } from '@jest/globals';
import { runResourceAwareCheckSuite } from '../../src/local/run-check-resource-aware.js';

describe('runResourceAwareCheckSuite', () => {
  test('runs tests before the remaining checks and combines results', async () => {
    const calls = [];
    const runSuite = async ({ commands }) => {
      calls.push(commands.map(command => command.name));
      return calls.length === 1
        ? { exitCode: 0, failures: [] }
        : { exitCode: 1, failures: ['lint'] };
    };

    await expect(
      runResourceAwareCheckSuite({ failFast: false, runSuite })
    ).resolves.toEqual({ exitCode: 1, failures: ['lint'] });
    expect(calls[0]).toEqual(['test']);
    expect(calls[1]).not.toContain('test');
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
});
