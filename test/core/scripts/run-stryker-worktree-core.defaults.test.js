import {
  jest,
  describe,
  expect,
  test,
  beforeAll,
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

await jest.unstable_mockModule('node:fs/promises', () => fsModule);

const { createRunStrykerWorktreeHandle } = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);
const { runCommand } = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);

describe('createRunStrykerWorktreeHandle defaults', () => {
  beforeAll(() => {
    spawnMock.mockClear();
  });

  afterAll(() => {
    spawnMock.mockClear();
  });

  test('uses default dependencies when options are omitted', async () => {
    const handle = createRunStrykerWorktreeHandle({
      processModule: { env: {} },
    });

    await handle();

    expect(spawnMock).toHaveBeenCalled();
    expect(fsModule.mkdtemp).toHaveBeenCalled();
    expect(fsModule.writeFile).toHaveBeenCalled();
    expect(fsModule.cp).toHaveBeenCalled();
  });

  test('uses the process env when runCommand env is omitted', async () => {
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
        env: process.env,
        stdio: 'inherit',
      })
    );
  });

  test('writes configured test files, timeout, and concurrency', async () => {
    const previous = {
      testFiles: process.env.STRYKER_TEST_FILES,
      timeout: process.env.STRYKER_TIMEOUT_MS,
      concurrency: process.env.STRYKER_CONCURRENCY,
    };
    process.env.STRYKER_TEST_FILES = "['test/example.test.js']";
    process.env.STRYKER_TIMEOUT_MS = '5000';
    process.env.STRYKER_CONCURRENCY = '2';

    try {
      const handle = createRunStrykerWorktreeHandle({
        processModule: { env: {} },
      });
      await handle();
      process.env.STRYKER_TIMEOUT_MS = 'invalid';
      process.env.STRYKER_CONCURRENCY = '0';
      await handle();
    } finally {
      for (const [key, value] of Object.entries({
        STRYKER_TEST_FILES: previous.testFiles,
        STRYKER_TIMEOUT_MS: previous.timeout,
        STRYKER_CONCURRENCY: previous.concurrency,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }

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
