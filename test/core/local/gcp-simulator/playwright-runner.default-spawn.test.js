import { EventEmitter } from 'node:events';
import { describe, expect, it, jest } from '@jest/globals';

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

function flushEventLoop() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('local playwright runner default spawn', () => {
  it('uses the default child_process spawn when spawnImpl is omitted', async () => {
    const simulator = new FakeChildProcess();
    const writer = new FakeChildProcess();
    const playwright = new FakeChildProcess();
    const spawnCalls = [];
    const mockSpawn = jest.fn((command, args, options) => {
      spawnCalls.push({ command, args, options });
      if (spawnCalls.length === 1) {
        return simulator;
      }

      if (spawnCalls.length === 2) {
        return writer;
      }

      return playwright;
    });

    let runLocalPlaywright;
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('node:child_process', () => ({
        spawn: mockSpawn,
      }));
      ({ runLocalPlaywright } = await import(
        '../../../../src/core/local/gcp-simulator/playwright-runner.js'
      ));
    });

    const runPromise = runLocalPlaywright();

    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4321\n')
    );
    await flushEventLoop();
    writer.stdout.emit(
      'data',
      Buffer.from('writer server listening on http://localhost:4322/writer/\n')
    );
    await flushEventLoop();
    playwright.emit('exit', 0, null);

    await expect(runPromise).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:4322',
      exitCode: 0,
      signal: null,
    });

    expect(spawnCalls).toHaveLength(3);
    expect(spawnCalls[0].options.cwd).toBe(process.cwd());
    expect(spawnCalls[1].options.cwd).toBe(process.cwd());
    expect(spawnCalls[2].options.cwd).toBe(process.cwd());
  });
});
