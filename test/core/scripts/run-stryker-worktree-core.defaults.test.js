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
    const handle = createRunStrykerWorktreeHandle();

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
});
