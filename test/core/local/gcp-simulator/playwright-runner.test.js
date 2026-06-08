import { EventEmitter } from 'node:events';
import * as childProcess from 'node:child_process';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  playwrightRunnerTestUtils,
  runLocalPlaywright,
} from '../../../../src/core/local/gcp-simulator/playwright-runner.js';

class FakeChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.exitCode = null;
    this.signalCode = null;
    this.kills = [];
  }

  emit(event, ...args) {
    if (event === 'exit') {
      this.exitCode = args[0] ?? null;
      this.signalCode = args[1] ?? null;
    }

    return super.emit(event, ...args);
  }

  kill(signal) {
    this.kills.push(signal);
    this.signalCode = signal;
    return true;
  }
}

describe('local playwright runner', () => {
  /** @type {(() => void) | null} */
  let restoreStdout = null;
  /** @type {(() => void) | null} */
  let restoreStderr = null;

  afterEach(() => {
    restoreStdout?.mockRestore?.();
    restoreStderr?.mockRestore?.();
    restoreStdout = null;
    restoreStderr = null;
  });

  it('starts the simulator, passes the bound base URL to Playwright, and cleans up', async () => {
    const stdoutWrites = [];
    const stderrWrites = [];
    restoreStdout = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(chunk => {
        stdoutWrites.push(String(chunk));
        return true;
      });
    restoreStderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(chunk => {
        stderrWrites.push(String(chunk));
        return true;
      });

    const simulator = new FakeChildProcess();
    const playwright = new FakeChildProcess();
    const spawnCalls = [];
    const spawnImpl = jest.fn((command, args, options) => {
      spawnCalls.push({ command, args, options });
      return spawnCalls.length === 1 ? simulator : playwright;
    });

    const runPromise = runLocalPlaywright({
      repoRoot: '/repo',
      env: { EXTRA_FLAG: '1' },
      spawnImpl,
      simulatorCommand: process.execPath,
      simulatorScript: '/repo/src/local/gcp-simulator/server.js',
      playwrightCommand: 'npx',
      playwrightArgs: ['--grep', 'contents'],
    });

    simulator.stdout.emit('data', Buffer.from('booting simulator\n'));
    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4532\n')
    );
    simulator.stderr.emit('data', Buffer.from('simulator warning\n'));
    await Promise.resolve();
    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4532\n')
    );
    await Promise.resolve();
    playwright.emit('exit', 0, null);

    await expect(runPromise).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:4532',
      exitCode: 0,
      signal: null,
    });

    expect(spawnCalls).toHaveLength(2);
    expect(spawnCalls[0]).toMatchObject({
      command: process.execPath,
      args: ['/repo/src/local/gcp-simulator/server.js'],
      options: {
        cwd: '/repo',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    });
    expect(spawnCalls[0].options.env).toMatchObject({
      EXTRA_FLAG: '1',
      GCP_SIMULATOR_PORT: '0',
    });
    expect(spawnCalls[1]).toMatchObject({
      command: 'npx',
      args: ['playwright', 'test', '--grep', 'contents'],
      options: {
        cwd: '/repo',
        stdio: 'inherit',
      },
    });
    expect(spawnCalls[1].options.env).toMatchObject({
      EXTRA_FLAG: '1',
      GCP_SIMULATOR_PORT: '0',
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4532',
    });
    expect(simulator.kills).toEqual(['SIGTERM']);
    expect(stdoutWrites.join('')).toContain('gcp simulator listening on');
    expect(stderrWrites.join('')).toContain('simulator warning');
  });

  it('fails fast if the simulator exits before announcing a port', async () => {
    const simulator = new FakeChildProcess();
    const spawnImpl = jest.fn(() => simulator);

    const runPromise = runLocalPlaywright({
      repoRoot: '/repo',
      spawnImpl,
      simulatorCommand: process.execPath,
      simulatorScript: '/repo/src/local/gcp-simulator/server.js',
      playwrightCommand: 'npx',
    });

    simulator.exitCode = 1;
    simulator.emit('exit', 1, null);

    await expect(runPromise).rejects.toThrow(
      'gcp simulator exited before announcing a port'
    );
    expect(simulator.kills).toEqual([]);
  });

  it('covers the runner helper branches for settled exits and null children', () => {
    const exitedChild = new FakeChildProcess();
    exitedChild.exitCode = 0;
    expect(() =>
      playwrightRunnerTestUtils.terminateProcess(exitedChild)
    ).not.toThrow();
    expect(exitedChild.kills).toEqual([]);
    expect(() =>
      playwrightRunnerTestUtils.terminateProcess(null)
    ).not.toThrow();
  });

  it('uses the default runner commands when options are omitted', async () => {
    const simulator = new FakeChildProcess();
    const playwright = new FakeChildProcess();
    const spawnCalls = [];
    const spawnImpl = jest.fn((command, args, options) => {
      spawnCalls.push({ command, args, options });
      return spawnCalls.length === 1 ? simulator : playwright;
    });

    const runPromise = runLocalPlaywright({
      spawnImpl,
    });

    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4321\n')
    );
    await Promise.resolve();
    playwright.emit('exit', null, 'SIGTERM');

    await expect(runPromise).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:4321',
      exitCode: 1,
      signal: 'SIGTERM',
    });

    expect(spawnCalls[0]).toMatchObject({
      command: process.execPath,
      args: [`${process.cwd()}/src/local/gcp-simulator/server.js`],
      options: {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    });
    expect(spawnCalls[1]).toMatchObject({
      command: 'npx',
      args: ['playwright', 'test'],
      options: {
        cwd: process.cwd(),
        stdio: 'inherit',
      },
    });
  });

  it('treats a null exit code and null signal as a clean exit', async () => {
    const simulator = new FakeChildProcess();
    const playwright = new FakeChildProcess();
    const spawnCalls = [];
    const spawnImpl = jest.fn((command, args, options) => {
      spawnCalls.push({ command, args, options });
      return spawnCalls.length === 1 ? simulator : playwright;
    });

    const runPromise = runLocalPlaywright({
      repoRoot: '/repo',
      spawnImpl,
    });

    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4321\n')
    );
    await Promise.resolve();
    playwright.emit('exit', null, null);

    await expect(runPromise).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:4321',
      exitCode: 0,
      signal: null,
    });

    expect(spawnCalls).toHaveLength(2);
  });

  it('rejects if the simulator errors before it is ready', async () => {
    const child = new FakeChildProcess();
    const readyPromise = playwrightRunnerTestUtils.waitForSimulatorReady(child);
    child.emit('error', new Error('simulator boom'));
    await expect(readyPromise).rejects.toThrow('simulator boom');
  });

  it('rejects if the simulator exits with a signal before announcing a port', async () => {
    const child = new FakeChildProcess();
    const readyPromise = playwrightRunnerTestUtils.waitForSimulatorReady(child);
    child.emit('exit', null, 'SIGKILL');
    await expect(readyPromise).rejects.toThrow(
      'gcp simulator exited before announcing a port (code null, signal SIGKILL)'
    );
  });

  it('ignores late simulator errors after readiness has been announced', async () => {
    class StickyChildProcess extends FakeChildProcess {
      off() {
        return this;
      }
    }

    const child = new StickyChildProcess();
    const readyPromise = playwrightRunnerTestUtils.waitForSimulatorReady(child);
    child.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:9001\n')
    );
    await expect(readyPromise).resolves.toBe(9001);
    expect(() => child.emit('error', new Error('late error'))).not.toThrow();
  });

  it('rejects if the playwright process errors before exit', async () => {
    const child = new FakeChildProcess();
    const exitPromise = playwrightRunnerTestUtils.waitForExit(child);
    child.emit('error', new Error('playwright boom'));
    await expect(exitPromise).rejects.toThrow('playwright boom');
  });
});
