import { jest } from '@jest/globals';
import { PassThrough } from 'node:stream';
import {
  createRunCheckHandle,
  createRunCheckSuite,
  runCheckSuiteTestOnly,
} from '../../src/core/check-runner.js';

const runCheckSuite = createRunCheckSuite({
  defaultSpawn: () => {
    throw new Error('unexpected spawn');
  },
  defaultStdout: process.stdout,
  defaultStderr: process.stderr,
  defaultNow: () => Date.now(),
});

/**
 * Create a writer stub that records everything written to it.
 * @returns {{ chunks: string[], write: (text: string) => void }} Buffered writer stub.
 */
function createWriter() {
  const chunks = [];
  return {
    chunks,
    write(text) {
      chunks.push(text);
    },
  };
}

/**
 * Create a fake child process with controllable lifecycle events.
 * @returns {{ stdout: PassThrough, stderr: PassThrough, kill: jest.Mock, on: (event: string, handler: (...args: unknown[]) => void) => unknown, emit: (event: string, ...args: unknown[]) => void }} Fake child process.
 */
function createChild() {
  return {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: jest.fn(() => true),
    on(event, handler) {
      if (!this.listeners) {
        this.listeners = {};
      }
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(handler);
      return this;
    },
    emit(event, ...args) {
      const handlers = this.listeners?.[event] ?? [];
      for (const handler of handlers) {
        handler(...args);
      }
    },
  };
}

/**
 * Create a minimal stream-like object that exposes `on` but not `setEncoding`.
 * @returns {{ on: (event: string, handler: (...args: unknown[]) => void) => unknown, emit: (event: string, ...args: unknown[]) => void }} Bare stream stub.
 */
function createBareStream() {
  return {
    on(event, handler) {
      if (!this.listeners) {
        this.listeners = {};
      }
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(handler);
      return this;
    },
    emit(event, ...args) {
      const handlers = this.listeners?.[event] ?? [];
      for (const handler of handlers) {
        handler(...args);
      }
    },
  };
}

/**
 * Build a spawn stub that returns the provided fake children in order.
 * @param {Array<ReturnType<typeof createChild>>} children Fake children to return from the spawn stub.
 * @returns {{ spawnImpl: jest.Mock, calls: Array<{ command: string, args: string[], child: ReturnType<typeof createChild> }> }} Spawn stub and call log.
 */
function createSpawnStub(children) {
  const calls = [];
  const spawnImpl = jest.fn((command, args) => {
    const child = children[calls.length];
    calls.push({ command, args, child });
    return child;
  });

  return { spawnImpl, calls };
}

/**
 * Parse structured JSON lines from the buffered writer output.
 * @param {string[]} chunks Buffered text fragments.
 * @returns {Array<{ type: string, [key: string]: unknown }>} Parsed events.
 */
function parseEvents(chunks) {
  return chunks
    .join('')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

describe('runCheckSuite', () => {
  it('creates a run-check command handle', async () => {
    const exitCodes = [];
    const suiteCalls = [];
    const handle = createRunCheckHandle({
      argv: ['node', 'src/scripts/run-check.js', '--fail-fast'],
      runSuite: async options => {
        suiteCalls.push(options);
        return { exitCode: 7 };
      },
      setExitCode: exitCode => {
        exitCodes.push(exitCode);
      },
    });

    await handle();

    expect(suiteCalls).toEqual([{ failFast: true }]);
    expect(exitCodes).toEqual([7]);
  });

  it('returns a passed summary when there are no commands', async () => {
    const stdout = createWriter();
    const stderr = createWriter();

    const result = await runCheckSuite({
      commands: [],
      stdout,
      stderr,
      now: () => 1000,
    });

    expect(result).toEqual({
      exitCode: 0,
      failures: [],
    });

    expect(parseEvents(stderr.chunks)).toEqual([
      expect.objectContaining({
        type: 'check-summary',
        status: 'passed',
        total: 0,
        failed: 0,
      }),
    ]);
  });

  it('uses the default writers and clock when no overrides are supplied', async () => {
    const stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    try {
      const result = await runCheckSuite({ commands: [] });

      expect(result).toEqual({
        exitCode: 0,
        failures: [],
      });
      expect(stdoutWrite).not.toHaveBeenCalled();
      expect(stderrWrite).toHaveBeenCalledTimes(1);
    } finally {
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }
  });

  it('resolves default runner options when none are supplied', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(4321);

    try {
      const resolved = runCheckSuiteTestOnly.resolveRunCheckOptions(
        {},
        {
          defaultSpawn: () => {
            throw new Error('unexpected spawn');
          },
          defaultStdout: process.stdout,
          defaultStderr: process.stderr,
          defaultNow: () => Date.now(),
        }
      );

      expect(resolved.commands).toHaveLength(8);
      expect(resolved.failFast).toBe(false);
      expect(resolved.stdout).toBe(process.stdout);
      expect(resolved.stderr).toBe(process.stderr);
      expect(resolved.now()).toBe(4321);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('handles children without output streams and uses the default clock', async () => {
    const child = createChild();
    child.stdout = null;
    child.stderr = null;
    const { spawnImpl } = createSpawnStub([child]);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [{ name: 'alpha', command: 'alpha', args: [] }],
      spawnImpl,
      stdout,
      stderr,
    });

    child.emit('close', 0, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(0);
    expect(stdout.chunks).toEqual([]);
    expect(parseEvents(stderr.chunks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'check-start',
          name: 'alpha',
        }),
        expect.objectContaining({
          type: 'check-success',
          name: 'alpha',
        }),
      ])
    );
  });

  it('streams each failure and reports all failures by default', async () => {
    const children = [createChild(), createChild()];
    const { spawnImpl, calls } = createSpawnStub(children);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: ['--one'] },
        { name: 'beta', command: 'beta', args: ['--two'] },
      ],
      spawnImpl,
      stdout,
      stderr,
      now: () => 1000,
    });

    children[0].emit('close', 1, null);
    expect(parseEvents(stderr.chunks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'check-start',
          name: 'alpha',
        }),
        expect.objectContaining({
          type: 'check-failure',
          name: 'alpha',
          exitCode: 1,
        }),
      ])
    );

    children[1].emit('close', 2, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(2);
    expect(calls).toHaveLength(2);

    const events = parseEvents(stderr.chunks);
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: 'check-summary',
        status: 'failed',
        failed: 2,
        total: 2,
      })
    );
    expect(events.filter(event => event.type === 'check-failure')).toHaveLength(
      2
    );
  });

  it('records spawn failures and keeps running the remaining checks', async () => {
    const children = [createChild()];
    const betaChild = children[0];
    const spawnImpl = jest.fn(command => {
      if (command === 'alpha') {
        throw 'spawn failed';
      }

      return children.shift();
    });
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: ['--one'] },
        { name: 'beta', command: 'beta', args: ['--two'] },
      ],
      spawnImpl,
      stdout,
      stderr,
      now: () => 2000,
    });

    betaChild.emit('close', 0, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        name: 'alpha',
        exitCode: 1,
        error: 'spawn failed',
      })
    );

    const events = parseEvents(stderr.chunks);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'check-failure',
          name: 'alpha',
          error: 'spawn failed',
        }),
        expect.objectContaining({
          type: 'check-success',
          name: 'beta',
        }),
      ])
    );
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: 'check-summary',
        status: 'failed',
        failed: 1,
        total: 2,
      })
    );
  });

  it('stops spawning later checks when a fail-fast spawn exception occurs', async () => {
    const child = createChild();
    const spawnImpl = jest.fn(command => {
      if (command === 'alpha') {
        throw new Error('spawn failed');
      }

      return child;
    });
    const stdout = createWriter();
    const stderr = createWriter();

    const result = await runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: [] },
        { name: 'beta', command: 'beta', args: [] },
      ],
      spawnImpl,
      stdout,
      stderr,
      failFast: true,
      now: () => 2100,
    });

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(spawnImpl).toHaveBeenCalledTimes(1);
    expect(child.kill).not.toHaveBeenCalled();
    expect(parseEvents(stderr.chunks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'check-failure',
          name: 'alpha',
          error: 'spawn failed',
        }),
        expect.objectContaining({
          type: 'check-summary',
          status: 'failed',
          total: 2,
          failed: 1,
        }),
      ])
    );
  });

  it('forwards child output, records signal exits, and ignores later close duplicates', async () => {
    const children = [createChild(), createChild()];
    const { spawnImpl } = createSpawnStub(children);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: [] },
        { name: 'beta', command: 'beta', args: [] },
      ],
      spawnImpl,
      stdout,
      stderr,
      now: () => 3000,
    });

    children[0].stdout.write('first line\n');
    children[0].stdout.write('second line\n');
    children[0].stderr.write('warn line\n');
    children[0].emit('close', 0, null);
    children[0].emit('error', new Error('ignored after close'));

    children[1].emit('close', null, 'SIGTERM');

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        name: 'beta',
        exitCode: null,
        signal: 'SIGTERM',
      })
    );
    expect(stdout.chunks).toEqual([
      '[alpha][stdout] first line\n',
      '[alpha][stdout] second line\n',
    ]);
    expect(stderr.chunks).toEqual([
      expect.stringContaining('"type":"check-start","name":"alpha"'),
      expect.stringContaining('"type":"check-start","name":"beta"'),
      '[alpha][stderr] warn line\n',
      expect.stringContaining('"type":"check-success","name":"alpha"'),
      expect.stringContaining('"type":"check-failure","name":"beta"'),
      expect.stringContaining('"type":"check-summary","name":"check-suite"'),
    ]);
    expect(
      parseEvents(
        stderr.chunks.filter(chunk => chunk.trim().startsWith('{'))
      ).filter(event => event.type === 'check-failure' && event.name === 'beta')
    ).toHaveLength(1);
  });

  it('flushes a buffered line when the output stream ends without a newline', async () => {
    const child = createChild();
    const { spawnImpl } = createSpawnStub([child]);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [{ name: 'alpha', command: 'alpha', args: [] }],
      spawnImpl,
      stdout,
      stderr,
      now: () => 3500,
    });

    child.stdout.write('tail only');
    child.stdout.end();
    await new Promise(resolve => setImmediate(resolve));
    child.emit('close', 0, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(0);
    expect(stdout.chunks).toEqual(['[alpha][stdout] tail only\n']);
  });

  it('stops the suite on the first failure when fail-fast is enabled', async () => {
    const children = [createChild(), { ...createChild(), kill: undefined }];
    const { spawnImpl } = createSpawnStub(children);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: [] },
        { name: 'beta', command: 'beta', args: [] },
      ],
      spawnImpl,
      stdout,
      stderr,
      failFast: true,
      now: () => 1000,
    });

    children[0].emit('close', 1, null);
    expect(children[1].kill).toBeUndefined();

    children[1].emit('close', 1, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);

    const events = parseEvents(stderr.chunks);
    expect(events.filter(event => event.type === 'check-failure')).toHaveLength(
      1
    );
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: 'check-summary',
        status: 'failed',
        failed: 1,
        total: 2,
      })
    );
  });

  it('aborts remaining checks when a child emits an error in fail-fast mode', async () => {
    const children = [createChild(), createChild()];
    const { spawnImpl } = createSpawnStub(children);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: [] },
        { name: 'beta', command: 'beta', args: [] },
      ],
      spawnImpl,
      stdout,
      stderr,
      failFast: true,
      now: () => 4000,
    });

    children[0].emit('error', new Error('boom'));
    expect(children[1].kill).toHaveBeenCalledWith('SIGTERM');
    children[0].emit('close', 1, null);
    children[1].emit('close', 1, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        name: 'alpha',
        error: 'boom',
      })
    );
    expect(
      parseEvents(stderr.chunks).filter(event => event.type === 'check-failure')
    ).toHaveLength(1);
  });

  it('ignores late child errors after fail-fast has already aborted the suite', async () => {
    const children = [createChild(), createChild()];
    const { spawnImpl } = createSpawnStub(children);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [
        { name: 'alpha', command: 'alpha', args: [] },
        { name: 'beta', command: 'beta', args: [] },
      ],
      spawnImpl,
      stdout,
      stderr,
      failFast: true,
      now: () => 5000,
    });

    children[0].emit('error', new Error('boom'));
    children[1].emit('error', new Error('late boom'));
    children[0].emit('close', 1, null);
    children[1].emit('close', 1, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(
      parseEvents(stderr.chunks).filter(event => event.type === 'check-failure')
    ).toHaveLength(1);
  });

  it('writes plain text lines only when they contain content', async () => {
    const child = createChild();
    const { spawnImpl } = createSpawnStub([child]);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [{ name: 'alpha', command: 'alpha', args: [] }],
      spawnImpl,
      stdout,
      stderr,
      now: () => 6000,
    });

    child.stdout.write('first\n\nsecond\n');
    child.stdout.end();
    await new Promise(resolve => setImmediate(resolve));
    child.emit('close', 0, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(0);
    expect(stdout.chunks).toEqual([
      '[alpha][stdout] first\n',
      '[alpha][stdout] second\n',
    ]);
  });

  it('handles a child stream without setEncoding', async () => {
    const child = createChild();
    child.stdout = createBareStream();
    child.stderr = createBareStream();
    const { spawnImpl } = createSpawnStub([child]);
    const stdout = createWriter();
    const stderr = createWriter();

    const suitePromise = runCheckSuite({
      commands: [{ name: 'alpha', command: 'alpha', args: [] }],
      spawnImpl,
      stdout,
      stderr,
      now: () => 7000,
    });

    child.stdout.emit('data', 'plain line\n');
    child.stdout.emit('close');
    child.emit('close', 0, null);

    const result = await suitePromise;

    expect(result.exitCode).toBe(0);
    expect(stdout.chunks).toEqual(['[alpha][stdout] plain line\n']);
  });
});
