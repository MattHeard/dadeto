import { PassThrough } from 'node:stream';
import { runCheckSuite } from '../../src/scripts/check-runner.js';

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

  it('stops the suite on the first failure when fail-fast is enabled', async () => {
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
      now: () => 1000,
    });

    children[0].emit('close', 1, null);
    expect(children[1].kill).toHaveBeenCalledWith('SIGTERM');

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
});
