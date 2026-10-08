import { jest } from '@jest/globals';
import {
  createFsAdapters,
  createJsonPostOptions,
} from '../../src/core/index.js';

test('creates JSON POST options with default headers and transport options', () => {
  expect(createJsonPostOptions({ value: 1 })).toEqual({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"value":1}',
  });
});

test('creates the injected synchronous filesystem adapter contract', () => {
  const fsModule = {
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    rmSync: jest.fn(),
    copyFileSync: jest.fn(),
    utimesSync: jest.fn(),
    readdirSync: jest.fn(() => ['entry']),
  };
  const adapters = createFsAdapters(fsModule);

  expect(adapters.directoryExists('dir')).toBe(true);
  adapters.createDirectory('dir');
  adapters.removeDirectory('dir');
  adapters.copyFile('a', 'b');
  expect(adapters.readDirEntries('dir')).toEqual(['entry']);
  expect(fsModule.mkdirSync).toHaveBeenCalled();
  expect(fsModule.rmSync).toHaveBeenCalledWith('dir', {
    recursive: true,
    force: true,
  });
  expect(fsModule.copyFileSync).toHaveBeenCalledWith('a', 'b');
  expect(fsModule.readdirSync).toHaveBeenCalledWith('dir', {
    withFileTypes: true,
  });
});
