import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  createRunStrykerWorktreeHandle,
  runCommand,
} from '../../../src/core/scripts/run-stryker-worktree-core.js';

/**
 * Create a child-process mock that exits with the supplied code.
 * @param {number} code Exit code.
 * @returns {jest.Mock} Mock spawn function.
 */
function spawnWithExit(code) {
  return jest.fn(() => {
    const child = new EventEmitter();
    child.once = (event, listener) => {
      EventEmitter.prototype.once.call(child, event, listener);
      if (event === 'exit') listener(code);
      return child;
    };
    return child;
  });
}

test('runs a reused worktree without setup or teardown commands', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
  const reused = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dadeto-stryker-reuse-')
  );
  await fs.mkdir(path.join(reused, 'reports', 'mutation'), { recursive: true });
  await fs.writeFile(
    path.join(reused, 'reports', 'mutation', 'summary.txt'),
    'ok'
  );
  const spawnImpl = spawnWithExit(0);
  const handle = createRunStrykerWorktreeHandle({
    rootDir,
    mutateTargetDir: '.',
    spawnImpl,
    processModule: { env: { STRYKER_REUSE_WORKTREE_PATH: reused } },
  });

  await handle();

  expect(spawnImpl).toHaveBeenCalledTimes(1);
  expect(spawnImpl.mock.calls[0][2].env).toEqual(
    expect.objectContaining({ STRYKER_TEST_ENV: '1', BEADS_NO_DAEMON: '1' })
  );
  await fs.rm(rootDir, { recursive: true, force: true });
  await fs.rm(reused, { recursive: true, force: true });
});

test('uses default filesystem and path dependencies', async () => {
  expect(createRunStrykerWorktreeHandle()).toEqual(expect.any(Function));
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
  const reused = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dadeto-stryker-reuse-')
  );
  await fs.mkdir(path.join(reused, 'reports', 'mutation'), { recursive: true });
  const handle = createRunStrykerWorktreeHandle({
    rootDir,
    mutateTargetDir: 'src/../src/core',
    spawnImpl: spawnWithExit(0),
    processModule: { env: { STRYKER_REUSE_WORKTREE_PATH: reused } },
  });

  await handle();

  await fs.rm(rootDir, { recursive: true, force: true });
  await fs.rm(reused, { recursive: true, force: true });
});

test('allows a failing cleanup command and failing cleanup spawn error', async () => {
  const spawnImpl = jest.fn(() => {
    const child = new EventEmitter();
    child.once = (event, listener) => {
      EventEmitter.prototype.once.call(child, event, listener);
      if (event === 'error') listener(new Error('cleanup'));
      return child;
    };
    return child;
  });

  await expect(
    runCommand({
      spawnImpl,
      command: 'git',
      args: ['worktree', 'remove'],
      cwd: '.',
      allowFailure: true,
    })
  ).resolves.toBeUndefined();
});

test('allows a nonzero cleanup exit code', async () => {
  await expect(
    runCommand({
      spawnImpl: spawnWithExit(7),
      command: 'git',
      args: ['worktree', 'remove'],
      cwd: '.',
      allowFailure: true,
    })
  ).resolves.toBeUndefined();
});
