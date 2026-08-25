import {
  abortRemainingChildren,
  buildSpawnFailure,
  forwardStreamLines,
  getDefaultOutputStream,
  handleChildClose,
  runEntriesInParallel,
  shouldIgnoreClosedChild,
  writeStableFileTimestamp,
} from '../../src/core/build/process-utils.js';
import { jest } from '@jest/globals';

describe('process utilities', () => {
  it('evaluates fail-fast close filtering and runs entries', async () => {
    expect(shouldIgnoreClosedChild(false, true, [{ name: 'a' }], 'b')).toBe(
      false
    );
    expect(shouldIgnoreClosedChild(true, false, [{ name: 'a' }], 'b')).toBe(
      false
    );
    expect(shouldIgnoreClosedChild(true, true, [], 'b')).toBe(false);
    expect(shouldIgnoreClosedChild(true, true, [{ name: 'a' }], 'b')).toBe(
      true
    );
    expect(shouldIgnoreClosedChild(true, true, [{ name: 'a' }], 'a')).toBe(
      false
    );
    await expect(
      runEntriesInParallel([], async () => 'unused')
    ).resolves.toEqual([]);
    await expect(
      runEntriesInParallel([1, 2], async value => value * 2)
    ).resolves.toEqual([2, 4]);
  });

  it('aborts every active child except the exempt command', () => {
    const killed = [];
    abortRemainingChildren(
      new Map([
        ['keep', { kill: signal => killed.push(['keep', signal]) }],
        ['stop', { kill: signal => killed.push(['stop', signal]) }],
        ['plain', {}],
      ]),
      'keep'
    );
    expect(killed).toEqual([['stop', 'SIGTERM']]);
  });

  it('forwards complete and split stream lines and flushes once', () => {
    const handlers = {};
    const writes = [];
    const stream = {
      setEncoding: jest.fn(),
      on: (event, handler) => {
        handlers[event] = handler;
      },
    };
    forwardStreamLines(stream, line => writes.push(line));
    expect(stream.setEncoding).toHaveBeenCalledWith('utf8');
    handlers.data('first\nsecond\npart');
    handlers.data('ial\n');
    handlers.end();
    handlers.close();
    expect(writes).toEqual(['first', 'second', 'partial']);
    const noEncodingHandlers = {};
    forwardStreamLines(
      {
        on: (event, handler) => {
          noEncodingHandlers[event] = handler;
        },
      },
      () => {}
    );
    noEncodingHandlers.data('\n');
    noEncodingHandlers.end();
  });

  it('handles missing streams and close-event success, failure, and ignored states', () => {
    const noStreamWrites = [];
    forwardStreamLines(null, line => noStreamWrites.push(line));
    expect(noStreamWrites).toEqual([]);
    const makeInput = overrides => ({
      activeChildren: new Map([['cmd', {}]]),
      command: { name: 'cmd', command: 'node', args: ['x'] },
      now: () => 120,
      startedAt: 100,
      exitCode: 0,
      signal: null,
      stderr: {},
      state: { settled: false, timeoutId: null },
      aborted: false,
      failFast: false,
      failures: [],
      emitEvent: jest.fn(),
      finishWithFailure: jest.fn(),
      resolve: jest.fn(),
      ...overrides,
    });
    const success = makeInput({ timeoutId: setTimeout(() => {}, 10000) });
    handleChildClose(success);
    expect(success.emitEvent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ type: 'check-success', durationMs: 20 })
    );
    expect(success.resolve).toHaveBeenCalledWith(undefined);
    const failure = makeInput({ exitCode: 1, signal: 'SIGTERM' });
    handleChildClose(failure);
    expect(failure.finishWithFailure).toHaveBeenCalledWith(
      expect.objectContaining({ exitCode: 1, signal: 'SIGTERM' }),
      true
    );
    const namedFailure = makeInput({
      command: { name: 'named', args: [] },
      exitCode: 2,
    });
    handleChildClose(namedFailure);
    expect(namedFailure.finishWithFailure).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'named' }),
      true
    );
    const settled = makeInput({ state: { settled: true, timeoutId: null } });
    handleChildClose(settled);
    const ignored = makeInput({
      aborted: true,
      failFast: true,
      failures: [{ name: 'other' }],
    });
    handleChildClose(ignored);
    expect(ignored.emitEvent).not.toHaveBeenCalled();
  });

  it('writes stable timestamps, builds spawn failures, and resolves output streams', async () => {
    const utimes = jest.fn().mockResolvedValue(undefined);
    await writeStableFileTimestamp({ utimes }, 'file.txt');
    expect(utimes).toHaveBeenCalledWith(
      'file.txt',
      expect.any(Date),
      expect.any(Date)
    );
    await expect(
      writeStableFileTimestamp({}, 'unused')
    ).resolves.toBeUndefined();
    expect(
      buildSpawnFailure(
        { name: 'cmd', command: 'node', args: ['x'] },
        10,
        new Error('bad'),
        () => 25
      )
    ).toEqual({
      name: 'cmd',
      command: 'node x',
      exitCode: 1,
      signal: null,
      durationMs: 15,
      error: 'bad',
    });
    expect(
      buildSpawnFailure(
        { name: 'cmd', command: 'node', args: [] },
        10,
        'bad',
        () => 5
      ).durationMs
    ).toBe(0);
    expect(getDefaultOutputStream('stdout')).toBe(process.stdout);
    expect(getDefaultOutputStream('stderr')).toBe(process.stderr);
  });
});
