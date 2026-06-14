import { describe, expect, jest, test } from '@jest/globals';
import { executeStandardGate } from '../../../src/core/scripts/gate-utils.js';

function createWriter() {
  const chunks = [];
  return {
    chunks,
    write(text) {
      chunks.push(text);
    },
  };
}

describe('executeStandardGate', () => {
  test('returns a launch failure when the command cannot start', () => {
    const stderr = createWriter();
    const spawnImpl = jest.fn(() => ({
      error: new Error('boom'),
      signal: null,
    }));

    const result = executeStandardGate({
      spawnImpl,
      command: 'demo',
      args: ['--flag'],
      rootDir: '/repo',
      stderr,
      launchLabel: 'Demo gate',
      commandLabel: 'demo',
      readResult: () => null,
      onSuccess: jest.fn(),
    });

    expect(result).toEqual({ exitCode: 1, count: 0 });
    expect(stderr.chunks.join('')).toContain(
      'Demo gate failed to launch demo: boom'
    );
  });

  test('returns a read failure when the result is missing', () => {
    const stderr = createWriter();
    const onSuccess = jest.fn();
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));

    const result = executeStandardGate({
      spawnImpl,
      command: 'demo',
      args: ['--flag'],
      rootDir: '/repo',
      stderr,
      launchLabel: 'Demo gate',
      commandLabel: 'demo',
      readResult: () => null,
      onSuccess,
    });

    expect(result).toEqual({ exitCode: 1, count: 0 });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('returns the reported failure count and message when violations exist', () => {
    const stderr = createWriter();
    const onSuccess = jest.fn();
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));

    const result = executeStandardGate({
      spawnImpl,
      command: 'demo',
      args: ['--flag'],
      rootDir: '/repo',
      stderr,
      launchLabel: 'Demo gate',
      commandLabel: 'demo',
      readResult: () => ({
        exitCode: 1,
        count: 2,
        message: 'Two violations found.\n',
      }),
      onSuccess,
    });

    expect(result).toEqual({ exitCode: 1, count: 2 });
    expect(stderr.chunks.join('')).toContain('Two violations found.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('returns the reported failure count when violations exist without a message', () => {
    const stderr = createWriter();
    const onSuccess = jest.fn();
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));

    const result = executeStandardGate({
      spawnImpl,
      command: 'demo',
      args: ['--flag'],
      rootDir: '/repo',
      stderr,
      launchLabel: 'Demo gate',
      commandLabel: 'demo',
      readResult: () => ({
        exitCode: 1,
        count: 1,
      }),
      onSuccess,
    });

    expect(result).toEqual({ exitCode: 1, count: 1 });
    expect(stderr.chunks).toEqual([]);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('calls success callback when the result count is zero', () => {
    const stderr = createWriter();
    const onSuccess = jest.fn();
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));

    const result = executeStandardGate({
      spawnImpl,
      command: 'demo',
      args: ['--flag'],
      rootDir: '/repo',
      stderr,
      launchLabel: 'Demo gate',
      commandLabel: 'demo',
      readResult: () => ({ exitCode: 0, count: 0 }),
      onSuccess,
    });

    expect(result).toEqual({ exitCode: 0, count: 0 });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
