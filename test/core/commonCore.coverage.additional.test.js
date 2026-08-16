import { describe, expect, jest, test } from '@jest/globals';
import {
  ADMIN_UID,
  buildCopyLogMessage,
  createRunCheckHandle,
  createRunCheckSuite,
  commonCoreTestUtils,
  createMappedTask,
  forEachMappedEntries,
  formatPathRelativeToProject,
  isMissingFileError,
  isNonEmptyString,
  normalizeMaybeNumber,
  objectOrEmpty,
  parseJsonOrNull,
  reportFailuresAndExit,
  reportFailuresAndMaybeLogSuccess,
  requirePathModule,
  resolveCallable,
  selectReadablePath,
  runEntriesInParallel,
  stringOr,
  stringOrFallback,
  tryOr,
  when,
} from '../../src/core/commonCore.js';

describe('commonCore additional coverage', () => {
  test('covers primitive validation and reporting helpers', () => {
    expect(ADMIN_UID).toBeTruthy();
    expect(isMissingFileError({ code: 'ENOENT' })).toBe(true);
    expect(isMissingFileError({ code: 'EACCES' })).toBe(false);
    expect(isMissingFileError(null)).toBe(false);
    const fn = jest.fn();
    expect(resolveCallable(fn)).toBe(fn);
    expect(parseJsonOrNull('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonOrNull('bad')).toBeNull();
    expect(
      requirePathModule({ join: fn, resolve: fn, relative: fn, sep: '/' })
    ).toBeDefined();
    expect(() => requirePathModule(null)).toThrow('pathModule is required.');
    expect(normalizeMaybeNumber(3)).toBe(3);
    expect(normalizeMaybeNumber('3')).toBeNull();
    expect(isNonEmptyString(' value ')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(stringOr('value', 'fallback')).toBe('value');
    expect(stringOr(' ', 'fallback')).toBe('fallback');
    expect(stringOrFallback('value', () => 'fallback')).toBe('value');
    expect(objectOrEmpty({ value: 1 })).toEqual({ value: 1 });
    expect(objectOrEmpty(null)).toEqual({});
  });

  test('reports failure and success outcomes', () => {
    const output = { error: jest.fn(), log: jest.fn() };
    const setExitCode = jest.fn();
    expect(reportFailuresAndExit({ failures: [], output, setExitCode })).toBe(
      false
    );
    expect(
      reportFailuresAndExit({ failures: ['one', 'two'], output, setExitCode })
    ).toBe(true);
    expect(output.error).toHaveBeenCalledWith('one');
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(
      reportFailuresAndMaybeLogSuccess({
        failures: [],
        output,
        setExitCode,
        successMessage: 'ok',
      })
    ).toBe(false);
    expect(output.log).toHaveBeenCalledWith('ok');
    expect(
      reportFailuresAndMaybeLogSuccess({
        failures: ['bad'],
        output,
        setExitCode,
        successMessage: 'unused',
      })
    ).toBe(true);
  });

  test('formats paths and copy log messages', () => {
    expect(selectReadablePath('/project/src/file.js', 'src/file.js')).toBe(
      'src/file.js'
    );
    expect(selectReadablePath('/outside/file.js', '../outside/file.js')).toBe(
      '/outside/file.js'
    );
    expect(selectReadablePath('', 'relative.js')).toBe('relative.js');
    expect(
      formatPathRelativeToProject(
        '/project',
        '/project/src/file.js',
        (from, to) => to.replace(`${from}/`, '')
      )
    ).toBe('src/file.js');
    expect(formatPathRelativeToProject('/project', '/project', () => '')).toBe(
      '.'
    );
    expect(
      buildCopyLogMessage({
        formatPathForLog: value => value,
        sourceDestination: { source: 'a.txt', destination: 'b.txt' },
      })
    ).toContain('a.txt');
  });

  test('runs mapped tasks and iterators', async () => {
    const mapped = createMappedTask(
      value => value + 1,
      async value => value * 2
    );
    const mappedSeen = [];
    await mapped(2).then(() => mappedSeen.push(6));
    expect(mappedSeen).toEqual([6]);
    await expect(
      runEntriesInParallel([1, 2], async value => value * 2)
    ).resolves.toEqual([2, 4]);
    const seen = [];
    await forEachMappedEntries(
      [1, 2],
      value => value + 1,
      async value => {
        seen.push(value);
      }
    );
    expect(seen).toEqual([2, 3]);
    expect(when(false, () => 'ignored', null)).toBeNull();
    expect(
      tryOr(() => {
        throw new Error('bad');
      })
    ).toBeUndefined();
  });

  test('runs an empty check suite and handles successful child completion', async () => {
    const stderr = { write: jest.fn() };
    const stdout = { write: jest.fn() };
    const empty = createRunCheckSuite({
      defaultSpawn: jest.fn(),
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 10,
    });
    await expect(empty({ commands: [] })).resolves.toEqual({
      exitCode: 0,
      failures: [],
    });
    const listeners = {};
    const stdoutStream = {
      on: jest.fn((event, callback) => {
        listeners[`stdout:${event}`] = callback;
      }),
      setEncoding: jest.fn(),
    };
    const stderrStream = {
      on: jest.fn((event, callback) => {
        listeners[`stderr:${event}`] = callback;
      }),
      setEncoding: jest.fn(),
    };
    const child = {
      stdout: stdoutStream,
      stderr: stderrStream,
      on: jest.fn((event, callback) => {
        listeners[event] = callback;
      }),
    };
    const spawn = jest.fn(() => {
      setTimeout(() => {
        listeners['stdout:data']?.('hello\n');
        listeners['stdout:end']?.();
        listeners.close?.(0, null);
      }, 0);
      return child;
    });
    const suite = createRunCheckSuite({
      defaultSpawn: spawn,
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 20,
    });
    await expect(
      suite({ commands: [{ name: 'ok', command: 'echo', args: ['ok'] }] })
    ).resolves.toMatchObject({ exitCode: 0, failures: [] });
    expect(stdout.write).toHaveBeenCalledWith('[ok][stdout] hello\n');
    expect(stdoutStream.setEncoding).toHaveBeenCalledWith('utf8');
  });

  test('records spawn, child, and close failures', async () => {
    const stderr = { write: jest.fn() };
    const defaults = {
      defaultStdout: { write: jest.fn() },
      defaultStderr: stderr,
      defaultNow: () => 30,
    };
    const command = { name: 'bad', command: 'bad', args: [] };
    const spawnFailure = createRunCheckSuite({
      ...defaults,
      defaultSpawn: () => {
        throw new Error('spawn failed');
      },
    });
    await expect(spawnFailure({ commands: [command] })).resolves.toMatchObject({
      exitCode: 1,
      failures: [{ error: 'spawn failed' }],
    });
    const stringSpawnFailure = createRunCheckSuite({
      ...defaults,
      defaultSpawn: () => {
        throw 'string spawn failure';
      },
    });
    await expect(
      stringSpawnFailure({ commands: [command] })
    ).resolves.toMatchObject({
      exitCode: 1,
      failures: [{ error: 'string spawn failure' }],
    });
    const listeners = {};
    const child = {
      stdout: null,
      stderr: null,
      on: jest.fn((event, callback) => {
        listeners[event] = callback;
      }),
    };
    const childFailure = createRunCheckSuite({
      ...defaults,
      defaultSpawn: () => {
        setTimeout(() => listeners.error?.(new Error('child failed')), 0);
        return child;
      },
    });
    await expect(childFailure({ commands: [command] })).resolves.toMatchObject({
      exitCode: 1,
      failures: [{ error: 'child failed' }],
    });
    const closeListeners = {};
    const closeChild = {
      stdout: null,
      stderr: null,
      on: jest.fn((event, callback) => {
        closeListeners[event] = callback;
      }),
    };
    const closeFailure = createRunCheckSuite({
      ...defaults,
      defaultSpawn: () => {
        setTimeout(() => closeListeners.close?.(2, 'SIGTERM'), 0);
        return closeChild;
      },
    });
    await expect(closeFailure({ commands: [command] })).resolves.toMatchObject({
      exitCode: 1,
      failures: [{ exitCode: 2, signal: 'SIGTERM' }],
    });
  });

  test('handles fail-fast aborts, timeouts, settled closes, and stderr flushing', async () => {
    const stderr = { write: jest.fn() };
    const stdout = { write: jest.fn() };
    const firstListeners = {};
    const firstChild = {
      stdout: null,
      stderr: {
        on: (event, callback) => {
          firstListeners[`stderr:${event}`] = callback;
        },
      },
      kill: jest.fn(() => {
        firstListeners.close?.(null, 'SIGTERM');
        return true;
      }),
      on: (event, callback) => {
        firstListeners[event] = callback;
      },
    };
    let spawnCount = 0;
    const failFastSpawn = jest.fn(() => {
      spawnCount += 1;
      if (spawnCount === 1) return firstChild;
      throw new Error('second spawn failed');
    });
    const failFastSuite = createRunCheckSuite({
      defaultSpawn: failFastSpawn,
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 40,
    });
    await expect(
      failFastSuite({
        failFast: true,
        commands: [
          { name: 'first', command: 'first', args: [] },
          { name: 'second', command: 'second', args: [] },
          { name: 'third', command: 'third', args: [] },
        ],
      })
    ).resolves.toMatchObject({ exitCode: 1 });
    expect(firstChild.kill).toHaveBeenCalledWith('SIGTERM');

    const timeoutChild = {
      stdout: null,
      stderr: null,
      kill: jest.fn(),
      on: jest.fn(),
    };
    const timeoutSuite = createRunCheckSuite({
      defaultSpawn: () => timeoutChild,
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 50,
      defaultTimeoutMs: 1,
    });
    await expect(
      timeoutSuite({
        commands: [{ name: 'timeout', command: 'timeout', args: [] }],
      })
    ).resolves.toMatchObject({
      exitCode: 1,
      failures: [{ signal: 'SIGTERM' }],
    });
    expect(timeoutChild.kill).toHaveBeenCalledWith('SIGTERM');
    const noKillTimeout = createRunCheckSuite({
      defaultSpawn: () => ({ stdout: null, stderr: null, on: jest.fn() }),
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 55,
      defaultTimeoutMs: 1,
    });
    await expect(
      noKillTimeout({
        commands: [{ name: 'timeout-no-kill', command: 'timeout', args: [] }],
      })
    ).resolves.toMatchObject({ exitCode: 1 });

    const settledListeners = {};
    const settledChild = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        settledListeners[event] = callback;
      },
    };
    const settledSuite = createRunCheckSuite({
      defaultSpawn: () => {
        setTimeout(() => {
          settledListeners.error?.(new Error('once'));
          settledListeners.error?.(new Error('twice'));
          settledListeners.close?.(1, null);
        }, 0);
        return settledChild;
      },
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 60,
    });
    await expect(
      settledSuite({
        commands: [{ name: 'settled', command: 'settled', args: [] }],
      })
    ).resolves.toMatchObject({ exitCode: 1, failures: [{ error: 'once' }] });

    const streamListeners = {};
    const stderrStream = {
      on: (event, callback) => {
        streamListeners[event] = callback;
      },
      setEncoding: jest.fn(),
    };
    const streamChild = {
      stdout: null,
      stderr: stderrStream,
      on: (event, callback) => {
        streamListeners[`child:${event}`] = callback;
      },
    };
    const streamSuite = createRunCheckSuite({
      defaultSpawn: () => {
        setTimeout(() => {
          streamListeners.data?.('partial\ntrailing');
          streamListeners.end?.();
          streamListeners['child:close']?.(0, null);
        }, 0);
        return streamChild;
      },
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 70,
    });
    await streamSuite({
      commands: [{ name: 'stream', command: 'stream', args: [] }],
    });
    expect(stderr.write).toHaveBeenCalledWith('[stream][stderr] partial\n');
    expect(stderr.write).toHaveBeenCalledWith('[stream][stderr] trailing\n');

    const errorListeners = {};
    const errorChild = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        errorListeners[event] = callback;
      },
    };
    const errorSuite = createRunCheckSuite({
      defaultSpawn: () => {
        setTimeout(() => errorListeners.error?.(new Error('fast failure')), 0);
        return errorChild;
      },
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 80,
    });
    await expect(
      errorSuite({
        failFast: true,
        commands: [{ name: 'same', command: 'same', args: [] }],
      })
    ).resolves.toMatchObject({ exitCode: 1 });

    const firstAbortListeners = {};
    const secondAbortListeners = {};
    let abortSpawnCount = 0;
    const firstAbortChild = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        firstAbortListeners[event] = callback;
      },
      kill: jest.fn(),
    };
    const secondAbortChild = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        secondAbortListeners[event] = callback;
      },
    };
    const abortSuite = createRunCheckSuite({
      defaultSpawn: () => {
        abortSpawnCount += 1;
        if (abortSpawnCount === 1) {
          setTimeout(() => {
            secondAbortListeners.error?.(new Error('abort second'));
            firstAbortListeners.error?.(new Error('after abort'));
            firstAbortListeners.close?.(1, null);
          }, 0);
          return firstAbortChild;
        }
        return secondAbortChild;
      },
      defaultStdout: stdout,
      defaultStderr: stderr,
      defaultNow: () => 85,
    });
    await expect(
      abortSuite({
        failFast: true,
        commands: [
          { name: 'abort-first', command: 'first', args: [] },
          { name: 'abort-second', command: 'second', args: [] },
        ],
      })
    ).resolves.toMatchObject({ exitCode: 1 });
  });

  test('creates the aggregate check command handler', async () => {
    const runSuite = jest.fn().mockResolvedValue({ exitCode: 1 });
    const setExitCode = jest.fn();
    const handler = createRunCheckHandle({
      argv: ['node', 'check', '--fail-fast', '--skip-tests'],
      runSuite,
      setExitCode,
    });
    await handler();
    expect(runSuite).toHaveBeenCalledWith({ failFast: true, skipTests: true });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  test('covers defensive child lifecycle branches', () => {
    const resolve = jest.fn();
    const emitEvent = jest.fn();
    const finishWithFailure = jest.fn();
    const state = { settled: true, timeoutId: null };
    commonCoreTestUtils.handleChildClose({
      activeChildren: new Map([['done', {}]]),
      command: { name: 'done', command: 'done', args: [] },
      now: () => 1,
      startedAt: 0,
      exitCode: 0,
      signal: null,
      stderr: { write: jest.fn() },
      state,
      aborted: false,
      failFast: false,
      failures: [],
      emitEvent,
      finishWithFailure,
      resolve,
    });
    expect(resolve).toHaveBeenCalledWith(undefined);
    expect(
      commonCoreTestUtils.shouldIgnoreClosedChild(true, true, [], 'x')
    ).toBe(false);
    const closeResolve = jest.fn();
    commonCoreTestUtils.handleChildClose({
      activeChildren: new Map([['open', {}]]),
      command: { name: 'open', command: 'open', args: [] },
      now: () => 1,
      startedAt: 0,
      exitCode: 0,
      signal: null,
      stderr: { write: jest.fn() },
      state: { settled: false, timeoutId: null },
      aborted: false,
      failFast: false,
      failures: [],
      emitEvent: jest.fn(),
      finishWithFailure: jest.fn(),
      resolve: closeResolve,
    });
    expect(closeResolve).toHaveBeenCalledWith(undefined);
    const fallbackResolve = jest.fn();
    commonCoreTestUtils.handleChildClose({
      activeChildren: new Map([['fallback', {}]]),
      command: { name: 'fallback', args: [] },
      now: () => 1,
      startedAt: 0,
      exitCode: 0,
      signal: null,
      stderr: { write: jest.fn() },
      state: { settled: false, timeoutId: null },
      aborted: false,
      failFast: false,
      failures: [],
      emitEvent: jest.fn(),
      finishWithFailure: jest.fn(),
      resolve: fallbackResolve,
    });
    expect(fallbackResolve).toHaveBeenCalledWith(undefined);
    const keep = { kill: jest.fn() };
    const noKill = {};
    commonCoreTestUtils.abortRemainingChildren(
      new Map([
        ['keep', keep],
        ['other', noKill],
      ]),
      'keep'
    );
    expect(keep.kill).not.toHaveBeenCalled();
    const writer = jest.fn();
    const streamListeners = {};
    commonCoreTestUtils.forwardStreamLines(
      {
        on: (event, callback) => {
          streamListeners[event] = callback;
        },
      },
      writer
    );
    streamListeners.data('line\n');
    streamListeners.data('\n');
    streamListeners.end();
    expect(writer).toHaveBeenCalledWith('line');
  });

  test('ignores a pending timeout after a child has already settled', async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest
      .spyOn(globalThis, 'clearTimeout')
      .mockImplementation(() => {});
    const listeners = {};
    const child = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        listeners[event] = callback;
      },
    };
    const suite = createRunCheckSuite({
      defaultSpawn: () => {
        setTimeout(() => listeners.close?.(0, null), 0);
        return child;
      },
      defaultStdout: { write: jest.fn() },
      defaultStderr: { write: jest.fn() },
      defaultNow: () => 90,
      defaultTimeoutMs: 100,
    });
    const pending = suite({
      commands: [{ name: 'settled-timeout', command: 'x', args: [] }],
    });
    await jest.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ exitCode: 0 });
    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  test('records a child failure when no timeout handle is installed', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = () => null;
    const listeners = {};
    const child = {
      stdout: null,
      stderr: null,
      on: (event, callback) => {
        listeners[event] = callback;
      },
    };
    const suite = createRunCheckSuite({
      defaultSpawn: () => {
        queueMicrotask(() => listeners.error?.(new Error('no timer')));
        return child;
      },
      defaultStdout: { write: jest.fn() },
      defaultStderr: { write: jest.fn() },
      defaultNow: () => 100,
    });
    try {
      await expect(
        suite({ commands: [{ name: 'no-timer', command: 'x', args: [] }] })
      ).resolves.toMatchObject({ exitCode: 1 });
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});
