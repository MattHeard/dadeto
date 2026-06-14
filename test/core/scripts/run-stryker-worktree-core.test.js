import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  createRunStrykerWorktreeHandle,
  handleRunCommandError,
  handleRunCommandExit,
} from '../../../src/core/scripts/run-stryker-worktree-core.js';

/**
 *
 */
function createSpawnImpl() {
  return jest.fn(() => {
    const child = new EventEmitter();
    child.once = (event, listener) => {
      EventEmitter.prototype.once.call(child, event, listener);
      if (event === 'exit') {
        listener(0);
      }
      return child;
    };
    return child;
  });
}

/**
 *
 */
function createErrorSpawnImpl() {
  return jest.fn(() => {
    const child = new EventEmitter();
    child.once = (event, listener) => {
      EventEmitter.prototype.once.call(child, event, listener);
      if (event === 'error') {
        listener(new Error('boom'));
      }
      return child;
    };
    return child;
  });
}

/**
 *
 * @param prefix
 */
async function createWorktreeDir(prefix) {
  const dir = await fs.mkdtemp(prefix);
  await fs.mkdir(path.join(dir, 'reports', 'mutation'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'reports', 'mutation', 'summary.txt'),
    'ok'
  );
  return dir;
}

describe('createRunStrykerWorktreeHandle', () => {
  test('persists machine-level logs in the main reports directory', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
    const spawnImpl = createSpawnImpl();
    const handle = createRunStrykerWorktreeHandle({
      rootDir,
      spawnImpl,
      processModule: { env: {} },
      fsModule: {
        ...fs,
        mkdtemp: createWorktreeDir,
      },
      pathModule: path,
    });

    await handle();

    const logPath = path.join(
      rootDir,
      'reports',
      'mutation',
      'worktree-run.jsonl'
    );
    const logText = await fs.readFile(logPath, 'utf8');
    const entries = logText
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    expect(entries.map(entry => entry.type)).toEqual([
      'start',
      'command-start',
      'command-success',
      'command-start',
      'command-success',
      'config-written',
      'command-start',
      'command-success',
      'reports-sync-start',
      'reports-sync-success',
      'cleanup-start',
      'cleanup-complete',
    ]);
    expect(entries[0]).toMatchObject({ mainRoot: rootDir });
    expect(spawnImpl).toHaveBeenCalledWith(
      'node',
      [
        '--experimental-vm-modules',
        './node_modules/.bin/stryker',
        'run',
        'stryker.worktree.config.mjs',
      ],
      expect.objectContaining({
        cwd: expect.any(String),
        env: expect.objectContaining({
          BEADS_NO_DAEMON: '1',
          STRYKER_TEST_ENV: '1',
        }),
      })
    );

    await fs.rm(rootDir, { recursive: true, force: true });
  }, 60000);

  test('resolves when a command exits nonzero and failures are allowed', () => {
    const resolve = jest.fn();
    const reject = jest.fn();

    handleRunCommandExit(
      'git',
      ['worktree', 'remove'],
      1,
      true,
      resolve,
      reject
    );

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  test('rejects when a command exits nonzero and failures are not allowed', () => {
    const resolve = jest.fn();
    const reject = jest.fn();

    handleRunCommandExit(
      'git',
      ['worktree', 'remove'],
      2,
      false,
      resolve,
      reject
    );

    expect(resolve).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledWith(expect.any(Error));
  });

  test('rejects when a command errors and failures are not allowed', () => {
    const error = new Error('boom');
    const resolve = jest.fn();
    const reject = jest.fn();

    handleRunCommandError(error, false, resolve, reject);

    expect(resolve).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledWith(error);
  });

  test('resolves when a command errors and failures are allowed', () => {
    const error = new Error('boom');
    const resolve = jest.fn();
    const reject = jest.fn();

    handleRunCommandError(error, true, resolve, reject);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  test('propagates a spawned command error from the runner', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
    const handle = createRunStrykerWorktreeHandle({
      rootDir,
      spawnImpl: createErrorSpawnImpl(),
      processModule: { env: {} },
      fsModule: {
        ...fs,
        mkdtemp: createWorktreeDir,
      },
      pathModule: path,
    });

    await expect(handle()).rejects.toThrow('boom');

    await fs.rm(rootDir, { recursive: true, force: true });
  });
});
