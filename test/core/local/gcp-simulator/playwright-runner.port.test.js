import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';

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

describe('local playwright runner port reservation', () => {
  it('rejects when the reserved port cannot be resolved from the socket address', async () => {
    const simulator = new FakeChildProcess();
    const spawnImpl = jest.fn(() => simulator);
    const createServer = jest.fn(() => {
      const server = new EventEmitter();
      server.on = server.addListener.bind(server);
      server.listen = (_port, _host, callback) => {
        callback?.();
        return server;
      };
      server.close = callback => {
        callback?.();
      };
      server.address = () => null;
      return server;
    });

    jest.resetModules();
    await jest.unstable_mockModule('node:net', () => ({
      default: { createServer },
    }));

    const { runLocalPlaywright } = await import(
      '../../../../src/core/local/gcp-simulator/playwright-runner.js'
    );

    const runPromise = runLocalPlaywright({
      repoRoot: '/repo',
      spawnImpl,
      simulatorCommand: process.execPath,
      simulatorScript: '/repo/src/local/gcp-simulator/server.js',
      playwrightCommand: 'npx',
    });

    simulator.stdout.emit(
      'data',
      Buffer.from('gcp simulator listening on http://127.0.0.1:4321\n')
    );

    await expect(runPromise).rejects.toThrow('Unable to reserve a writer port');
    expect(createServer).toHaveBeenCalled();
  });
});
