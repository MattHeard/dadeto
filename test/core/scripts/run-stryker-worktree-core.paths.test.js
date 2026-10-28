import {
  boundedWorktreeFactory,
  boundedWorktreeCommand,
} from '../../helpers/worktree-completion.js';
import { jest } from '@jest/globals';
await jest.unstable_mockModule('node:child_process', () => ({
  spawn() {
    throw new Error('Native spawn disabled in runner unit tests');
  },
}));

const runnerModule = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);
const createRunStrykerWorktreeHandle = boundedWorktreeFactory(
  runnerModule.createRunStrykerWorktreeHandle
);
const runCommand = options =>
  boundedWorktreeCommand(runnerModule.runCommand, options);

/**
 * Create a fully controlled runner with deliberately non-native path results.
 * @param {string} [name] Independent fixture identity.
 * @returns {object} Runner options and path expectations.
 */
function fixture(name = 'case') {
  const join = (...parts) => `${name}[${parts.join('|')}]`;
  const root = `${name}-root`;
  const logPath = join(join(root, 'reports/mutation'), 'worktree-run.jsonl');
  const parent = `${name}-parent(${logPath})`;
  const pathModule = {
    resolve: jest.fn(() => root),
    join: jest.fn(join),
    dirname: jest.fn(file => `${name}-parent(${file})`),
    normalize: jest.fn(file => `${name}-normalized(${file})`),
    relative: jest.fn((_base, file) => `${name}-relative(${file})`),
  };
  const fsModule = Object.fromEntries(
    ['mkdir', 'writeFile', 'appendFile', 'cp', 'rm'].map(method => [
      method,
      jest.fn(async () => {}),
    ])
  );
  fsModule.mkdtemp = jest.fn(async () => `${name}-generated`);
  const spawnImpl = jest.fn(() => {
    const child = {
      once(event, listener) {
        if (event === 'exit') listener(0);
        return child;
      },
    };
    return child;
  });
  const options = {
    pathModule,
    fsModule,
    spawnImpl,
    processModule: { env: { STRYKER_REUSE_WORKTREE_PATH: `${name}-worktree` } },
    log: jest.fn(),
  };
  return { options, logPath, parent, root, join };
}

test('machine logging uses the injected dirname for every entry', async () => {
  const { options, logPath, parent, root } = fixture();
  await createRunStrykerWorktreeHandle(options)();
  expect(options.pathModule.resolve).toHaveBeenCalledWith('.');
  expect(options.pathModule.dirname.mock.calls).toEqual(
    Array(8).fill([logPath])
  );
  expect(options.fsModule.mkdir).toHaveBeenCalledWith(parent, {
    recursive: true,
  });
  expect(options.fsModule.appendFile.mock.calls.map(([file]) => file)).toEqual(
    Array(8).fill(logPath)
  );
  const entries = options.fsModule.appendFile.mock.calls.map(([, line]) =>
    JSON.parse(line)
  );
  expect(entries[0]).toMatchObject({ type: 'start', mainRoot: root });
  expect(entries.map(entry => entry.type)).toEqual([
    'start',
    'config-written',
    'command-start',
    'command-success',
    'reports-sync-start',
    'reports-sync-success',
    'cleanup-start',
    'cleanup-complete',
  ]);
  expect(options.spawnImpl).toHaveBeenCalledTimes(1);
  expect(options.fsModule.rm).not.toHaveBeenCalled();
});

test('an injected dirname failure propagates before logging or spawning', async () => {
  const { options } = fixture();
  const failure = new Error('path adapter failed');
  options.pathModule.dirname.mockImplementation(() => {
    throw failure;
  });
  await expect(createRunStrykerWorktreeHandle(options)()).rejects.toBe(failure);
  expect(options.fsModule.appendFile).not.toHaveBeenCalled();
  expect(options.spawnImpl).not.toHaveBeenCalled();
});

test('independent runner instances keep their own path bundle', async () => {
  const left = fixture('left');
  const right = fixture('right');
  const runLeft = createRunStrykerWorktreeHandle(left.options);
  const runRight = createRunStrykerWorktreeHandle(right.options);
  await runRight();
  await runLeft();
  expect(left.options.pathModule.dirname.mock.calls).toEqual(
    Array(8).fill([left.logPath])
  );
  expect(right.options.pathModule.dirname.mock.calls).toEqual(
    Array(8).fill([right.logPath])
  );
});

test('a configured runner requires its path bundle', () => {
  const { options } = fixture();
  delete options.pathModule;
  expect(() => createRunStrykerWorktreeHandle(options)).toThrow(TypeError);
});

/**
 * Create a controlled synchronous completion event.
 * @param {number|null|Error} status Exit status or error.
 * @returns {object} Child process fixture.
 */
function childWithStatus(status) {
  const child = {
    once(event, listener) {
      if (event === 'error' && status instanceof Error) listener(status);
      if (event === 'exit' && !(status instanceof Error)) listener(status);
      return child;
    },
  };
  return child;
}

test('fresh lifecycle preserves all commands, paths and environment overrides', async () => {
  const { options, root, join } = fixture('fresh');
  options.processModule.env = { BASE: 'kept', BEADS_NO_DAEMON: '0' };
  await createRunStrykerWorktreeHandle(options)();
  const worktree = 'fresh-generated';
  const env = { BASE: 'kept', BEADS_NO_DAEMON: '1' };
  const commandOptions = cwd => ({ cwd, env, stdio: 'inherit' });
  expect(options.fsModule.mkdir).toHaveBeenCalledWith(
    join(root, '.worktrees'),
    { recursive: true }
  );
  expect(options.fsModule.mkdtemp.mock.calls).toEqual([
    [join(join(root, '.worktrees'), 'stryker-')],
  ]);
  expect(options.fsModule.cp.mock.calls).toEqual([
    [
      join(worktree, 'reports/mutation'),
      join(root, 'reports/mutation'),
      { recursive: true },
    ],
  ]);
  expect(options.fsModule.rm.mock.calls).toEqual([
    [worktree, { recursive: true, force: true }],
  ]);
  expect(options.spawnImpl.mock.calls).toEqual([
    ['git', ['worktree', 'add', '--detach', worktree], commandOptions(root)],
    ['npm', ['install'], commandOptions(worktree)],
    [
      'node',
      [
        '--experimental-vm-modules',
        './node_modules/.bin/stryker',
        'run',
        'stryker.worktree.config.mjs',
      ],
      { ...commandOptions(worktree), env: { ...env, STRYKER_TEST_ENV: '1' } },
    ],
    ['git', ['worktree', 'remove', '--force', worktree], commandOptions(root)],
  ]);
  expect(options.log.mock.calls).toEqual([
    [
      `Synced mutation reports to fresh-relative(${join(root, 'reports/mutation')})`,
    ],
  ]);
});

test('a reused lifecycle does not create or remove a worktree', async () => {
  const { options, root, join } = fixture();
  await createRunStrykerWorktreeHandle(options)();
  expect(options.fsModule.mkdir).not.toHaveBeenCalledWith(
    join(root, '.worktrees'),
    expect.anything()
  );
  expect(options.fsModule.mkdtemp).not.toHaveBeenCalled();
  expect(options.fsModule.rm).not.toHaveBeenCalled();
});

test.each(['nonzero', 'sync-error', 'event-error'])(
  'cleanup remains best effort for %s',
  async kind => {
    const { options } = fixture('cleanup');
    options.processModule.env = {};
    options.spawnImpl.mockImplementation((command, args) => {
      if (command !== 'git' || args[1] !== 'remove') return childWithStatus(0);
      if (kind === 'sync-error') throw new Error('cleanup failed');
      return childWithStatus(
        kind === 'event-error' ? new Error('cleanup failed') : 7
      );
    });
    await expect(
      createRunStrykerWorktreeHandle(options)()
    ).resolves.toBeUndefined();
    expect(options.fsModule.rm).toHaveBeenCalledWith('cleanup-generated', {
      recursive: true,
      force: true,
    });
    const calls = options.fsModule.appendFile.mock.calls;
    expect(JSON.parse(calls[calls.length - 1][1]).type).toBe(
      'cleanup-complete'
    );
  }
);

test.each([0, 7, null])(
  'command settlement and exact diagnostics for exit %s',
  async code => {
    const { options } = fixture();
    options.spawnImpl.mockReturnValue(childWithStatus(code));
    const result = runCommand({
      spawnImpl: options.spawnImpl,
      command: 'tool',
      args: ['--one', '--two'],
      cwd: '/controlled',
    });
    if (code === 0) await expect(result).resolves.toBeUndefined();
    else
      await expect(result).rejects.toThrow(
        new Error(`tool --one --two exited with code ${code}`)
      );
  }
);

test.each([false, true])(
  'command error settlement respects allowFailure=%s',
  async allowFailure => {
    const { options } = fixture();
    const error = new Error('spawn failed');
    options.spawnImpl.mockReturnValue(childWithStatus(error));
    const result = runCommand({
      spawnImpl: options.spawnImpl,
      command: 'tool',
      args: [],
      cwd: '/controlled',
      allowFailure,
    });
    if (allowFailure) await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toBe(error);
  }
);

test.each([
  { label: 'defaults', values: {}, concurrency: 1, timeout: 10000 },
  {
    label: 'positive minimum',
    values: { STRYKER_CONCURRENCY: '1', STRYKER_TIMEOUT_MS: '1' },
    concurrency: 1,
    timeout: 1,
  },
  {
    label: 'configured',
    values: {
      STRYKER_CONCURRENCY: '2',
      STRYKER_TIMEOUT_MS: '5000',
      STRYKER_TEST_FILES: "['test/example.test.js']",
    },
    concurrency: 2,
    timeout: 5000,
    target: 'src/core/cloud',
  },
  {
    label: 'zero',
    values: { STRYKER_CONCURRENCY: '0', STRYKER_TIMEOUT_MS: '0' },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'negative',
    values: { STRYKER_CONCURRENCY: '-1', STRYKER_TIMEOUT_MS: '-3' },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'fraction',
    values: { STRYKER_CONCURRENCY: '1.5', STRYKER_TIMEOUT_MS: '2.5' },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'invalid',
    values: { STRYKER_CONCURRENCY: 'invalid', STRYKER_TIMEOUT_MS: 'invalid' },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'empty',
    values: {
      STRYKER_CONCURRENCY: '',
      STRYKER_TIMEOUT_MS: '',
      STRYKER_TEST_FILES: '',
    },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'infinite',
    values: { STRYKER_CONCURRENCY: 'Infinity', STRYKER_TIMEOUT_MS: 'Infinity' },
    concurrency: 1,
    timeout: 10000,
  },
  {
    label: 'exponent',
    values: { STRYKER_CONCURRENCY: '2e0', STRYKER_TIMEOUT_MS: '5e3' },
    concurrency: 2,
    timeout: 5000,
  },
])(
  'generated config is exact for $label',
  async ({ values, concurrency, timeout, target }) => {
    {
      const { options } = fixture();
      Object.assign(options.processModule.env, values);
      if (target) options.mutateTargetDir = target;
      await createRunStrykerWorktreeHandle(options)();
      const mutate = target
        ? `  mutate: ["case-normalized(${target})"],\n`
        : '';
      const files = values.STRYKER_TEST_FILES
        ? `  testFiles: ${values.STRYKER_TEST_FILES},\n`
        : '';
      expect(options.fsModule.writeFile.mock.calls[0][1])
        .toBe(`import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
${mutate}  // Keep mutation runs resource-bounded in the worktree.
${files}${'  '}
  timeoutMS: ${timeout},
  concurrency: ${concurrency},
};
`);
    }
  }
);
