import {
  boundedWorktreeFactory,
  boundedWorktreeCommand,
} from '../../helpers/worktree-completion.js';
import path from 'node:path';
import {
  jest,
  describe,
  expect,
  test,
  beforeEach,
  afterAll,
} from '@jest/globals';

const spawnMock = jest.fn(() => {
  const child = {
    once(event, listener) {
      if (event === 'exit') {
        listener(0);
      }
      return child;
    },
  };
  return child;
});

const fsModule = {
  mkdtemp: jest.fn(async prefix => `${prefix}tmp`),
  rm: jest.fn(async () => {}),
  cp: jest.fn(async () => {}),
  mkdir: jest.fn(async () => {}),
  writeFile: jest.fn(async () => {}),
  appendFile: jest.fn(async () => {}),
};

await jest.unstable_mockModule('node:child_process', () => ({
  spawn: spawnMock,
}));

const runnerModule = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);
const createRunStrykerWorktreeHandle = boundedWorktreeFactory(
  runnerModule.createRunStrykerWorktreeHandle
);
const runCommand = options =>
  boundedWorktreeCommand(runnerModule.runCommand, options);

describe('createRunStrykerWorktreeHandle defaults', () => {
  beforeEach(() => {
    spawnMock.mockClear();
    for (const mock of Object.values(fsModule)) mock.mockClear();
  });

  afterAll(() => {
    spawnMock.mockClear();
  });

  test('uses the supplied filesystem and spawn with an injected path bundle', async () => {
    const handle = createRunStrykerWorktreeHandle({
      fsModule,
      spawnImpl: spawnMock,
      pathModule: path,
      processModule: { env: {} },
    });

    await handle();

    expect(spawnMock).toHaveBeenCalled();
    expect(fsModule.mkdtemp).toHaveBeenCalled();
    expect(fsModule.writeFile).toHaveBeenCalled();
    expect(fsModule.cp).toHaveBeenCalled();
  });

  test('passes an explicitly empty environment without host defaults', async () => {
    await runCommand({
      spawnImpl: spawnMock,
      command: 'node',
      args: ['--version'],
      cwd: '/tmp/worktree',
    });

    expect(spawnMock).toHaveBeenCalledWith(
      'node',
      ['--version'],
      expect.objectContaining({
        cwd: '/tmp/worktree',
        env: {},
        stdio: 'inherit',
      })
    );
  });

  test('writes configured test files, timeout, and concurrency', async () => {
    const env = {
      STRYKER_TEST_FILES: "['test/example.test.js']",
      STRYKER_TIMEOUT_MS: '5000',
      STRYKER_CONCURRENCY: '2',
    };
    const handle = createRunStrykerWorktreeHandle({
      fsModule,
      spawnImpl: spawnMock,
      pathModule: path,
      processModule: { env },
    });
    await handle();
    env.STRYKER_TIMEOUT_MS = 'invalid';
    env.STRYKER_CONCURRENCY = '0';
    await handle();

    expect(fsModule.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("testFiles: ['test/example.test.js']")
    );
    expect(fsModule.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('timeoutMS: 5000')
    );
    expect(fsModule.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('concurrency: 2')
    );
  });
});
