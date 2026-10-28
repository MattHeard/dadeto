import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import { createChildCapabilities } from '../../../src/local/gcp-simulator/child-process-adapter.js';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

test('maps permission-first child operations to native event names and current state', () => {
  const raw = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    exitCode: null,
    signalCode: null,
    kill: jest.fn(() => true),
  });
  const child = createChildCapabilities(raw);
  const permission = createAllowEffects();
  const onExit = jest.fn();
  const onError = jest.fn();
  const stdout = jest.fn();
  const stderr = jest.fn();
  raw.on('error', () => {});
  child.onceExit(permission, onExit);
  child.onceError(permission, onError);
  child.onStdout(permission, stdout);
  child.onStderr(permission, stderr);
  const failure = new Error('fake failure');
  raw.emit('error', failure);
  raw.emit('exit', 3, 'SIGTERM');
  raw.emit('exit', 4, null);
  raw.stdout.emit('data', 'out');
  raw.stderr.emit('data', 'err');
  expect(onError.mock.calls).toEqual([[failure]]);
  expect(onExit.mock.calls).toEqual([[3, 'SIGTERM']]);
  expect(stdout.mock.calls).toEqual([['out']]);
  expect(stderr.mock.calls).toEqual([['err']]);
  expect(child.status(permission)).toEqual({
    exitCode: null,
    signalCode: null,
  });
  raw.exitCode = 9;
  raw.signalCode = 'SIGKILL';
  expect(child.status(permission)).toEqual({
    exitCode: 9,
    signalCode: 'SIGKILL',
  });
  child.kill(permission, 'SIGTERM');
  expect(raw.kill.mock.calls).toEqual([['SIGTERM']]);
});

test('removes exactly the native error and exit listeners and handles absent streams', () => {
  const raw = Object.assign(new EventEmitter(), {
    stdout: null,
    stderr: undefined,
    exitCode: null,
    signalCode: null,
  });
  const child = createChildCapabilities(raw);
  const permission = createAllowEffects();
  const listener = jest.fn();
  child.onceError(permission, listener);
  child.onceExit(permission, listener);
  expect(raw.listenerCount('error')).toBe(1);
  expect(raw.listenerCount('exit')).toBe(1);
  child.offError(permission, listener);
  child.offExit(permission, listener);
  expect(raw.listenerCount('error')).toBe(0);
  expect(raw.listenerCount('exit')).toBe(0);
  expect(child.onStdout(permission, listener)).toBeUndefined();
  expect(child.onStderr(permission, listener)).toBeUndefined();
});
