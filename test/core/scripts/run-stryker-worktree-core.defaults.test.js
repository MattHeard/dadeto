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
const { runCommand, resolveIfAllowed } = await import(
  '../../../src/core/scripts/run-stryker-worktree-core.js'
);
const { buildChildEnv, buildStrykerConfig } = await import(
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

  test('uses default runCommand options when none are provided', async () => {
    await runCommand(spawnMock, 'node', ['--version'], '/tmp/worktree');

    expect(spawnMock).toHaveBeenCalledWith(
      'node',
      ['--version'],
      expect.objectContaining({
        cwd: '/tmp/worktree',
        env: expect.any(Object),
        stdio: 'inherit',
      })
    );
  });

  test('returns false when resolveIfAllowed is called without permission', () => {
    const resolve = jest.fn();

    expect(resolveIfAllowed(false, resolve)).toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });

  test('returns true when resolveIfAllowed is called with permission', () => {
    const resolve = jest.fn();

    expect(resolveIfAllowed(true, resolve)).toBe(true);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  test('builds child env from base values and overrides', () => {
    expect(buildChildEnv({ A: '1' }, { B: '2' })).toEqual({
      A: '1',
      B: '2',
    });
  });

  test('builds the Stryker config text', () => {
    expect(buildStrykerConfig()).toContain('concurrency: 1');
    expect(buildStrykerConfig()).toContain('testRunnerNodeArgs');
  });
});
