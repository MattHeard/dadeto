import { jest } from '@jest/globals';
await jest.unstable_mockModule('node:child_process', () => ({
  spawn() {
    throw new Error('Native spawn disabled in runner unit tests');
  },
}));

const { createRunStrykerWorktreeHandle } = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);

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
  return { options, logPath, parent, root };
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
