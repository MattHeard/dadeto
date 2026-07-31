import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanCoreMutants } from '../../scripts/scan-core-mutants.js';

describe('scanCoreMutants', () => {
  test('prepares one worktree, isolates reports, and resumes successes', async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'dadeto-core-scan-')
    );
    await fs.mkdir(path.join(rootDir, 'src', 'core', 'nested'), {
      recursive: true,
    });
    await fs.writeFile(path.join(rootDir, 'src', 'core', 'b.js'), '');
    await fs.writeFile(
      path.join(rootDir, 'src', 'core', 'nested', 'a.mjs'),
      ''
    );
    const calls = [];
    const runCommand = async options => {
      calls.push(options);
      if (options.args[0] === 'run') {
        const file = options.args.at(-1);
        await fs.writeFile(
          path.join(rootDir, 'reports', 'mutation', 'mutation.json'),
          JSON.stringify({
            files: {
              [file]: {
                mutants: {
                  survived: { status: 'Survived' },
                  killed: { status: 'Killed' },
                },
              },
            },
          })
        );
      }
      return { code: 0, timedOut: false, signal: null };
    };

    const first = await scanCoreMutants({
      rootDir,
      timeoutMs: 1000,
      runCommand,
    });
    expect(first).toMatchObject({
      total: 2,
      completed: 2,
      pending: 0,
      survivors: 2,
    });
    expect(calls.filter(call => call.args.includes('add'))).toHaveLength(1);
    expect(calls.filter(call => call.args[0] === 'install')).toHaveLength(1);
    expect(calls.filter(call => call.args[0] === 'run')).toHaveLength(2);

    const secondCalls = [];
    const second = await scanCoreMutants({
      rootDir,
      timeoutMs: 1000,
      runCommand: async options => {
        secondCalls.push(options);
        return { code: 0, timedOut: false, signal: null };
      },
    });
    expect(second).toMatchObject({
      total: 2,
      completed: 2,
      pending: 0,
      survivors: 2,
    });
    expect(secondCalls.filter(call => call.args[0] === 'run')).toHaveLength(0);

    const survivorList = JSON.parse(
      await fs.readFile(
        path.join(
          rootDir,
          'reports',
          'mutation',
          'core-files-with-surviving-mutants.json'
        ),
        'utf8'
      )
    );
    expect(survivorList).toEqual([
      { file: 'src/core/b.js', survivingMutants: 1 },
      { file: 'src/core/nested/a.mjs', survivingMutants: 1 },
    ]);
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  test('records timeout results and retries them on the next run', async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'dadeto-core-scan-')
    );
    await fs.mkdir(path.join(rootDir, 'src', 'core'), { recursive: true });
    await fs.writeFile(path.join(rootDir, 'src', 'core', 'a.js'), '');
    let timedOut = true;
    const runCommand = async options => {
      if (options.args[0] === 'run' && timedOut) {
        timedOut = false;
        return { code: null, timedOut: true, signal: 'SIGTERM' };
      }
      if (options.args[0] === 'run') {
        await fs.writeFile(
          path.join(rootDir, 'reports', 'mutation', 'mutation.json'),
          JSON.stringify({ files: { 'src/core/a.js': { mutants: {} } } })
        );
      }
      return { code: 0, timedOut: false, signal: null };
    };

    const first = await scanCoreMutants({
      rootDir,
      timeoutMs: 1000,
      runCommand,
    });
    expect(first).toMatchObject({ timedOut: 1, pending: 0 });
    const second = await scanCoreMutants({
      rootDir,
      timeoutMs: 1000,
      runCommand,
    });
    expect(second).toMatchObject({ completed: 1, timedOut: 0, failed: 0 });
    await fs.rm(rootDir, { recursive: true, force: true });
  });
});
