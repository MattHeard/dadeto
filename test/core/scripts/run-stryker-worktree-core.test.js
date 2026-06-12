import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { createRunStrykerWorktreeHandle } from '../../../src/core/scripts/run-stryker-worktree-core.js';

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

    const logPath = path.join(rootDir, 'reports', 'mutation', 'worktree-run.jsonl');
    const logText = await fs.readFile(logPath, 'utf8');
    const entries = logText.trim().split('\n').map(line => JSON.parse(line));

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
      expect.objectContaining({ cwd: expect.any(String) })
    );

    await fs.rm(rootDir, { recursive: true, force: true });
  });
});
