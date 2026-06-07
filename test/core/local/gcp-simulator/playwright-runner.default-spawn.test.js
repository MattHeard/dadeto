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

describe('local playwright runner default spawn', () => {
  it('uses the default child_process spawn when spawnImpl is omitted', async () => {
    const simulator = new FakeChildProcess();
    const playwright = new FakeChildProcess();
    const spawnCalls = [];
    const mockSpawn = jest.fn((command, args, options) => {
      spawnCalls.push({ command, args, options });
      return spawnCalls.length === 1 ? simulator : playwright;
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
    await Promise.resolve();
    playwright.emit('exit', 0, null);

    await expect(runPromise).resolves.toEqual({
      baseUrl: 'http://127.0.0.1:4321',
      exitCode: 0,
      signal: null,
    });

    expect(spawnCalls).toHaveLength(2);
    expect(spawnCalls[0].options.cwd).toBe(process.cwd());
    expect(spawnCalls[1].options.cwd).toBe(process.cwd());
  });
});
