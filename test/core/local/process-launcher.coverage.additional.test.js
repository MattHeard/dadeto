import path from 'node:path';
import { jest } from '@jest/globals';
import {
  closeRunLogHandles,
  createDetachedProcessLauncher,
} from '../../../src/core/local/process-launcher.js';

const deps = {
  pathModule: path,
  mkdirImpl: async () => {},
  openImpl: async filePath => ({
    fd: filePath.endsWith('stdout.log') ? 10 : 11,
    close: async () => {},
  }),
  closeErrorLabel: 'close failed',
  exitErrorLabel: 'exit failed',
};

test('covers resolver branches and rejected log closures', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  await closeRunLogHandles({}, 'none');
  await closeRunLogHandles(
    {
      stdoutHandle: { close: () => Promise.reject(new Error('stdout')) },
      stderrHandle: { close: () => Promise.reject(new Error('stderr')) },
    },
    'close failed'
  );

  let exitHandler;
  const launcher = createDetachedProcessLauncher({
    ...deps,
    command: 'codex',
    args: ['exec'],
    logDir: path.join('/tmp', 'custom'),
    resolveArgs: payload => ['resolved', String(payload.prompt)],
    resolveCwd: payload => path.join(payload.repoRoot, 'cwd'),
    resolveLogDir: payload => path.join(payload.repoRoot, 'resolved-logs'),
    exitErrorLabel: payload => `exit ${payload.runId}`,
    spawnImpl: (command, args, options) => ({
      pid: 9,
      once: (event, handler) => {
        if (event === 'exit') exitHandler = handler;
      },
      unref: () => {},
      command,
      args,
      options,
    }),
  });
  await launcher.launch({
    repoRoot: '/repo',
    runId: 'run-1',
    prompt: 'hello',
    onExit: async () => {
      throw new Error('exit hook');
    },
  });
  await exitHandler(1, 'SIGTERM');
  await new Promise(resolve => setImmediate(resolve));
  const explicitLogDirLauncher = createDetachedProcessLauncher({
    ...deps,
    command: 'codex',
    args: [],
    logDir: '/explicit-logs',
    spawnImpl: () => ({ pid: 1, once: () => {}, unref: () => {} }),
  });
  await explicitLogDirLauncher.launch({ repoRoot: '/repo', runId: 'run-2' });
  const fallbackLauncher = createDetachedProcessLauncher({
    ...deps,
    command: 'codex',
    args: [],
    spawnImpl: () => ({ pid: 2, once: () => {}, unref: () => {} }),
  });
  await fallbackLauncher.launch({ repoRoot: undefined, runId: 'run-3' });
  expect(error).toHaveBeenCalled();
  error.mockRestore();
});
