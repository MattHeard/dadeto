import { jest } from '@jest/globals';
import { createWorktreeSpawn } from '../../src/adapters/worktree.js';

test('launches the requested command and exposes only classified event registration', () => {
  const child = {
    once: jest.fn(function () {
      return this;
    }),
    kill: jest.fn(),
  };
  const spawn = jest.fn(() => child);
  const launch = createWorktreeSpawn(spawn);
  expect(spawn).not.toHaveBeenCalled();
  const permission = Object.freeze({});
  const input = { cwd: '/controlled', env: {}, stdio: 'inherit' };
  const adapted = launch(permission, 'node', ['--version'], input);
  expect(spawn).toHaveBeenCalledWith('node', ['--version'], input);
  const listener = jest.fn();
  expect(adapted.once(permission, 'error', listener)).toBe(child);
  expect(adapted.once(permission, 'exit', listener)).toBe(child);
  expect(child.once.mock.calls).toEqual([
    ['error', listener],
    ['exit', listener],
  ]);
  expect(child.once.mock.contexts).toEqual([child, child]);
  expect(Object.keys(adapted)).toEqual(['once']);
  expect(Object.isFrozen(adapted)).toBe(true);
});

test('preserves synchronous process launcher errors', () => {
  const error = new Error('unavailable');
  const launch = createWorktreeSpawn(() => {
    throw error;
  });
  expect(() =>
    launch({}, 'node', [], { cwd: '.', env: {}, stdio: 'inherit' })
  ).toThrow(error);
});
