import path from 'node:path';
import { jest } from '@jest/globals';

const handle = jest.fn();
const createRunner = jest.fn(() => handle);
const fs = Object.fromEntries(
  ['mkdtemp', 'mkdir', 'rm', 'cp', 'writeFile', 'appendFile'].map(name => [
    name,
    jest.fn(async () => name),
  ])
);
const child = { once: jest.fn() };
const spawn = jest.fn(() => child);
await jest.unstable_mockModule('node:fs/promises', () => fs);
await jest.unstable_mockModule('node:child_process', () => ({ spawn }));
await jest.unstable_mockModule(
  '../../src/core/scripts/run-stryker-worktree-core.js',
  () => ({
    createRunStrykerWorktreeHandle: createRunner,
  })
);
const wrapper = await import('../../src/local/run-stryker-worktree.js');

test('wires native dependencies without starting a worktree on import', () => {
  expect(wrapper.handle).toBe(handle);
  expect(createRunner).toHaveBeenCalledTimes(1);
  const [options] = createRunner.mock.calls[0];
  expect(options.pathModule).toBe(path);
  expect(options.processModule).toBe(process);
  expect(options.rootDir).toBe(path.resolve('.'));
  expect(options.mutateTargetDir).toBe(process.argv[2]);
  expect(handle).not.toHaveBeenCalled();
  expect(spawn).not.toHaveBeenCalled();
  for (const method of Object.values(fs)) expect(method).not.toHaveBeenCalled();
});

test('forwards native filesystem arguments and results without the permission', async () => {
  const [options] = createRunner.mock.calls[0];
  const permission = Object.freeze({});
  for (const [method, args] of Object.entries({
    mkdtemp: ['/prefix-'],
    mkdir: ['/directory', { recursive: true }],
    rm: ['/worktree', { recursive: true, force: true }],
    cp: ['/source', '/destination', { recursive: true }],
    writeFile: ['/config', 'contents'],
    appendFile: ['/log', 'entry'],
  })) {
    await expect(options.fsModule[method](permission, ...args)).resolves.toBe(
      method
    );
    expect(fs[method]).toHaveBeenCalledWith(...args);
  }
});

test('wires the real clock, log, permission boundary and classified launcher', async () => {
  const [options] = createRunner.mock.calls[0];
  await options.bindEffectBoundary(async permission => {
    expect(Object.isFrozen(permission)).toBe(true);
    const timestamp = options.now(permission);
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      options.log(permission, 'report synced');
      expect(log).toHaveBeenCalledWith('report synced');
    } finally {
      log.mockRestore();
    }
    const commandOptions = { cwd: '.', env: {}, stdio: 'inherit' };
    const result = options.spawnImpl(
      permission,
      'node',
      ['--version'],
      commandOptions
    );
    expect(spawn).toHaveBeenCalledWith('node', ['--version'], commandOptions);
    const listener = jest.fn();
    result.once(permission, 'exit', listener);
    expect(child.once).toHaveBeenCalledWith('exit', listener);
  });
});
