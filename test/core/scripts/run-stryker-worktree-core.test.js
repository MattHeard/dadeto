import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { createRunStrykerWorktreeHandle } from '../../../src/core/scripts/run-stryker-worktree-core.js';

/**
 * Create a spawn stub that reports success on exit.
 * @returns {ReturnType<typeof jest.fn>} Spawn stub.
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
 * Create a spawn stub that reports an error event.
 * @returns {ReturnType<typeof jest.fn>} Spawn stub.
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
 * Create a temporary worktree directory with mutation reports.
 * @param {string} prefix Temp directory prefix.
 * @returns {Promise<string>} Directory path.
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

/**
 * Create an fs module that captures generated config writes.
 * @returns {{ fsModule: Record<string, unknown>, configWrites: Array<[string, string]> }}
 */
function createFsModuleWithConfigCapture() {
  const configWrites = [];
  return {
    configWrites,
    fsModule: {
      ...fs,
      mkdtemp: createWorktreeDir,
      writeFile: async (filePath, contents, ...rest) => {
        if (String(filePath).endsWith('stryker.worktree.config.mjs')) {
          configWrites.push([String(filePath), String(contents)]);
        }
        return fs.writeFile(filePath, contents, ...rest);
      },
    },
  };
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

  test('writes a mutate target into the generated worktree config', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
    const spawnImpl = createSpawnImpl();
    const { fsModule, configWrites } = createFsModuleWithConfigCapture();
    const handle = createRunStrykerWorktreeHandle({
      rootDir,
      mutateTargetDir: 'src/core/cloud',
      spawnImpl,
      processModule: { env: {} },
      fsModule,
      pathModule: path,
    });

    await handle();

    expect(configWrites).toHaveLength(1);
    expect(configWrites[0][1]).toContain(`mutate: ["src/core/cloud"]`);

    await fs.rm(rootDir, { recursive: true, force: true });
  }, 60000);

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

  test('rejects when an early command exits nonzero', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
    const spawnImpl = jest.fn(() => {
      const child = new EventEmitter();
      child.once = (event, listener) => {
        EventEmitter.prototype.once.call(child, event, listener);
        if (event === 'exit') {
          listener(2);
        }
        return child;
      };
      return child;
    });
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

    await expect(handle()).rejects.toThrow('exited with code 2');

    await fs.rm(rootDir, { recursive: true, force: true });
  });

  test('keeps cleaning up when worktree removal and file cleanup fail', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-stryker-'));
    const spawnImpl = jest.fn((command, args) => {
      if (command === 'git' && args[1] === 'remove') {
        throw new Error('cleanup spawn failed');
      }
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
    const handle = createRunStrykerWorktreeHandle({
      rootDir,
      spawnImpl,
      processModule: { env: {} },
      fsModule: {
        ...fs,
        mkdtemp: createWorktreeDir,
        rm: jest.fn(async () => {
          throw new Error('rm failed');
        }),
      },
      pathModule: path,
    });

    await handle();

    expect(spawnImpl).toHaveBeenCalled();

    await fs.rm(rootDir, { recursive: true, force: true });
  });
});
