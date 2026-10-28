import { jest } from '@jest/globals';
import { createLocalPlaywrightRunner } from '../../../../src/core/local/gcp-simulator/playwright-runner.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

/**
 * Create an in-memory child with only the permission-first protocol.
 * @param {string} label Child label.
 * @param {unknown[]} trace Captured capability calls.
 * @returns {object} Child and its external event driver.
 */
function child(label, trace) {
  const listeners = {};
  const state = { exitCode: null, signalCode: null };
  const call = (method, permission, value) =>
    trace.push([`${label}:${method}`, permission, value]);
  const port = {
    status: permission => {
      call('status', permission);
      return { ...state };
    },
    onceError: (permission, listener) => {
      call('onceError', permission);
      listeners.error = listener;
    },
    onceExit: (permission, listener) => {
      call('onceExit', permission);
      listeners.exit = listener;
    },
    offError: (permission, listener) => {
      call('offError', permission);
      expect(listeners.error).toBe(listener);
      delete listeners.error;
    },
    offExit: (permission, listener) => {
      call('offExit', permission);
      expect(listeners.exit).toBe(listener);
      delete listeners.exit;
    },
    onStdout: (permission, listener) => {
      call('onStdout', permission);
      listeners.stdout = listener;
    },
    onStderr: (permission, listener) => {
      call('onStderr', permission);
      listeners.stderr = listener;
    },
    kill: (permission, signal) => call('kill', permission, signal),
  };
  return {
    port,
    state,
    output: text => {
      const chunk = { toString: jest.fn(() => text) };
      listeners.stdout(chunk);
      return chunk;
    },
    stderr: text => {
      const chunk = { toString: () => text };
      listeners.stderr(chunk);
      return chunk;
    },
    exit: (code, signal) => {
      state.exitCode = code;
      state.signalCode = signal;
      listeners.exit(code, signal);
    },
    error: error => listeners.error(error),
  };
}

/**
 * Build a portable platform using virtual path results and no host state.
 * @returns {object} Runner fixture.
 */
function fixture() {
  const trace = [];
  const children = ['simulator', 'writer', 'playwright'].map(label =>
    child(label, trace)
  );
  const spawn = jest.fn((permission, command, args, options) => {
    trace.push(['spawn', permission, command, args, options]);
    return children[spawn.mock.calls.length - 1].port;
  });
  const reservePort = jest.fn(async permission => {
    trace.push(['reservePort', permission]);
    return 8888;
  });
  const environment = Object.freeze({
    BASE: 'original',
    GCP_SIMULATOR_PORT: 'ignored',
  });
  const resolve = jest.fn((...parts) => `virtual[${parts.join('|')}]`);
  const runner = createLocalPlaywrightRunner({
    process: {
      rootDir: 'root',
      execPath: 'test-node',
      env: environment,
      spawn,
      writeStdout: (permission, chunk) =>
        trace.push(['stdout', permission, chunk]),
      writeStderr: (permission, chunk) =>
        trace.push(['stderr', permission, chunk]),
    },
    paths: { resolve },
    reservePort,
  });
  return { runner, trace, children, spawn, reservePort, environment, resolve };
}

/** @returns {Promise<void>} Event-loop completion. */
function flush() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Drive only the two readiness announcements without launching any processes.
 * @param {object} f Runner fixture.
 * @returns {Promise<void>} Both fake processes ready.
 */
async function ready(f) {
  f.children[0].output('gcp simulator listening on http://127.0.0.1:9011\n');
  await flush();
  f.children[1].output(
    'writer server listening on http://localhost:9022/writer/\n'
  );
  await flush();
}

/**
 * Attach rejection observation without changing the promise later asserted.
 * @param {Promise<unknown>} pending Promise under test.
 * @returns {Promise<unknown>} Original promise.
 */
function observe(pending) {
  void pending.catch(() => {});
  return pending;
}

/**
 * Observe failures immediately while preserving the original promise for assertions.
 * @param {object} f Runner fixture.
 * @param {import('../../../../types/allow-effects').AllowEffects} permission Invocation permission.
 * @param {import('../../../../src/core/local/gcp-simulator/playwright-runner.js').RunnerOptions} [options] Pure runner options.
 * @returns {Promise<object>} Original runner completion.
 */
function invoke(f, permission, options) {
  const pending = f.runner.runLocalPlaywright(permission, options);
  void pending.catch(() => {});
  return pending;
}

test('composes lazily, uses virtual defaults and forwards one permission through every effect', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  expect(f.spawn).not.toHaveBeenCalled();
  const outcome = invoke(f, permission, {
    env: { EXTRA: 'value', GCP_SIMULATOR_PORT: 'overridden' },
    playwrightArgs: ['--grep', 'example'],
  });
  await ready(f);
  f.children[0].output('gcp simulator listening on http://127.0.0.1:9011\n');
  f.children[1].output(
    'writer server listening on http://localhost:9022/writer/\n'
  );
  f.children[2].exit(0, null);
  await expect(outcome).resolves.toEqual({
    baseUrl: 'http://127.0.0.1:9022',
    exitCode: 0,
    signal: null,
  });
  expect(f.spawn.mock.calls).toEqual([
    [
      permission,
      'test-node',
      ['virtual[root|src/local/gcp-simulator/server.js]'],
      {
        cwd: 'root',
        env: { BASE: 'original', EXTRA: 'value', GCP_SIMULATOR_PORT: '8080' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ],
    [
      permission,
      'test-node',
      ['virtual[root|src/local/server.js]'],
      {
        cwd: 'root',
        env: {
          BASE: 'original',
          EXTRA: 'value',
          GCP_SIMULATOR_PORT: '8080',
          API_BASE_URL: 'http://127.0.0.1:9011',
          WRITER_PORT: '8888',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ],
    [
      permission,
      'npx',
      [
        'playwright',
        'test',
        '--config',
        'virtual[root|test/e2e/local.config.ts]',
        '--grep',
        'example',
      ],
      {
        cwd: 'root',
        env: {
          BASE: 'original',
          EXTRA: 'value',
          GCP_SIMULATOR_PORT: '8080',
          API_BASE_URL: 'http://127.0.0.1:9011',
          PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:9022',
          PAYMENT_WEBHOOK_URL: 'http://127.0.0.1:9011/__sim/payment-webhook',
        },
        stdio: 'inherit',
      },
    ],
  ]);
  expect(f.trace.every(([, token]) => token === permission)).toBe(true);
  expect(
    f.trace
      .filter(([name]) => name.endsWith(':kill'))
      .map(([name, token, signal]) => [name, token, signal])
  ).toEqual([
    ['simulator:kill', permission, 'SIGTERM'],
    ['writer:kill', permission, 'SIGTERM'],
  ]);
  expect(
    f.trace
      .filter(
        ([name]) => name.endsWith(':offError') || name.endsWith(':offExit')
      )
      .map(([name]) => name)
  ).toEqual([
    'simulator:offError',
    'simulator:offExit',
    'writer:offError',
    'writer:offExit',
  ]);
  expect(f.environment).toEqual({
    BASE: 'original',
    GCP_SIMULATOR_PORT: 'ignored',
  });
});

test('forwards original output chunks and decodes split readiness only through their portable contract', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  const outcome = invoke(f, permission);
  const first = f.children[0].output(
    'prefix\ngcp simulator listening on http://127.0.0.1:'
  );
  await flush();
  expect(f.spawn).toHaveBeenCalledTimes(1);
  const second = f.children[0].output('9011\n');
  const warning = f.children[0].stderr('warning');
  await flush();
  f.children[1].output(
    'writer server listening on http://localhost:9022/writer/\n'
  );
  await flush();
  f.children[2].exit(0, null);
  await outcome;
  expect(first.toString.mock.calls).toEqual([['utf8']]);
  expect(
    f.trace.filter(([name]) => name === 'stdout').map(([, , chunk]) => chunk)
  ).toContain(first);
  expect(
    f.trace.filter(([name]) => name === 'stdout').map(([, , chunk]) => chunk)
  ).toContain(second);
  expect(f.trace.filter(([name]) => name === 'stderr')).toEqual([
    ['stderr', permission, warning],
  ]);
});

test('reservation failures propagate and clean up only the already-started simulator', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  const failure = new Error('port unavailable');
  f.reservePort.mockRejectedValue(failure);
  const outcome = invoke(f, permission);
  const rejected = observe(expect(outcome).rejects.toBe(failure));
  f.children[0].output('gcp simulator listening on http://127.0.0.1:9011\n');
  await rejected;
  expect(f.spawn).toHaveBeenCalledTimes(1);
  expect(f.trace.filter(([name]) => name.endsWith(':kill'))).toEqual([
    ['simulator:kill', permission, 'SIGTERM'],
  ]);
});

test('writer launch failures clean up the simulator without inventing a writer resource', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  const failure = new Error('writer launch failed');
  f.spawn
    .mockImplementationOnce((token, command, args, options) => {
      f.trace.push(['spawn', token, command, args, options]);
      return f.children[0].port;
    })
    .mockImplementationOnce(() => {
      throw failure;
    });
  const outcome = invoke(f, permission);
  const rejected = observe(expect(outcome).rejects.toBe(failure));
  f.children[0].output('gcp simulator listening on http://127.0.0.1:9011\n');
  await rejected;
  expect(f.trace.filter(([name]) => name.endsWith(':kill'))).toEqual([
    ['simulator:kill', permission, 'SIGTERM'],
  ]);
});

test('independent invocations retain their own permissions and readiness buffers', async () => {
  const first = fixture();
  const second = fixture();
  const a = createAllowEffects();
  const b = createAllowEffects();
  const one = invoke(first, a);
  const two = invoke(second, b);
  first.children[0].output('gcp simulator listening on http://127.0.0.1:');
  await ready(second);
  second.children[2].exit(7, null);
  await expect(two).resolves.toEqual({
    baseUrl: 'http://127.0.0.1:9022',
    exitCode: 7,
    signal: null,
  });
  expect(first.spawn).toHaveBeenCalledTimes(1);
  first.children[0].output('9011\n');
  await flush();
  first.children[1].output(
    'writer server listening on http://localhost:9022/writer/\n'
  );
  await flush();
  first.children[2].exit(0, null);
  await expect(one).resolves.toMatchObject({ exitCode: 0 });
  expect(first.trace.every(([, token]) => token === a)).toBe(true);
  expect(second.trace.every(([, token]) => token === b)).toBe(true);
});

test('preserves explicit launcher, argument, script and config overrides without resolving unused defaults', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  const options = {
    repoRoot: 'alternate-root',
    simulatorCommand: 'sim-command',
    simulatorScript: 'unused-simulator-script',
    simulatorArgs: ['sim-argument'],
    writerCommand: 'writer-command',
    writerScript: 'unused-writer-script',
    writerArgs: ['writer-argument'],
    playwrightCommand: 'browser-command',
    playwrightConfigPath: 'custom.config',
    playwrightArgs: ['--project', 'chosen'],
  };
  const pending = invoke(f, permission, options);
  await ready(f);
  f.children[2].exit(0, null);
  await pending;
  expect(
    f.spawn.mock.calls.map(([, command, args, init]) => ({
      command,
      args,
      cwd: init.cwd,
    }))
  ).toEqual([
    { command: 'sim-command', args: ['sim-argument'], cwd: 'alternate-root' },
    {
      command: 'writer-command',
      args: ['writer-argument'],
      cwd: 'alternate-root',
    },
    {
      command: 'browser-command',
      args: [
        'playwright',
        'test',
        '--config',
        'custom.config',
        '--project',
        'chosen',
      ],
      cwd: 'alternate-root',
    },
  ]);
  expect(f.resolve).not.toHaveBeenCalled();
  expect(options.simulatorArgs).toEqual(['sim-argument']);
  expect(options.writerArgs).toEqual(['writer-argument']);
});

test.each([
  [null, null, true],
  [0, null, false],
  [7, null, false],
  [null, 'SIGTERM', false],
  [0, 'SIGKILL', false],
  [null, '', false],
])(
  'cleanup queries status %j/%j and kills only active resources',
  (exitCode, signalCode, active) => {
    const f = fixture();
    const permission = createAllowEffects();
    const c = f.children[0];
    c.state.exitCode = exitCode;
    c.state.signalCode = signalCode;
    f.runner.playwrightRunnerTestUtils.terminateProcess(permission, c.port);
    expect(f.trace.filter(([name]) => name.endsWith(':status'))).toEqual([
      ['simulator:status', permission, undefined],
    ]);
    expect(f.trace.filter(([name]) => name.endsWith(':kill'))).toEqual(
      active ? [['simulator:kill', permission, 'SIGTERM']] : []
    );
  }
);

test.each([null, undefined])(
  'cleanup does not query an absent resource %j',
  absent => {
    const f = fixture();
    f.runner.playwrightRunnerTestUtils.terminateProcess(
      createAllowEffects(),
      absent
    );
    expect(f.trace).toEqual([]);
  }
);

const announcements = [
  ['waitForSimulatorReady', 'gcp simulator listening on http://127.0.0.1:', ''],
  [
    'waitForWriterReady',
    'writer server listening on http://localhost:',
    '/writer/',
  ],
];

test.each(announcements)(
  '%s rejects malformed protocol fragments while accepting a later complete banner',
  async (method, prefix, suffix) => {
    const valid = `${prefix}4321${suffix}`;
    const incorrect = [...prefix].map(
      (_value, index) =>
        `${prefix.slice(0, index)}!${prefix.slice(index + 1)}4321${suffix}`
    );
    incorrect.push(
      ...[...prefix]
        .map(
          (letter, index) =>
            `${prefix.slice(0, index)}${letter.toUpperCase()}${prefix.slice(index + 1)}4321${suffix}`
        )
        .filter(value => value !== valid)
    );
    incorrect.push(`${prefix}${suffix}`, `${prefix}x${suffix}`);
    incorrect.push(
      ...[...suffix].map(
        (_value, index) =>
          `${prefix}4321${suffix.slice(0, index)}!${suffix.slice(index + 1)}`
      )
    );
    for (const malformed of incorrect) {
      const f = fixture();
      const permission = createAllowEffects();
      const pending = f.runner.playwrightRunnerTestUtils[method](
        permission,
        f.children[0].port
      );
      let observed;
      void pending.then(
        value => {
          observed = value;
        },
        () => {}
      );
      f.children[0].output(`${malformed}\n`);
      await Promise.resolve();
      expect(observed).toBeUndefined();
      f.children[0].output(`${valid}\n`);
      await Promise.resolve();
      expect(observed).toBe(4321);
      await expect(pending).resolves.toBe(4321);
    }
  }
);

const earlyExits = [
  [null, null, 'code null, signal null'],
  [0, null, 'code 0, signal null'],
  [7, 'SIGKILL', 'code 7, signal SIGKILL'],
  [null, 'SIGTERM', 'code null, signal SIGTERM'],
  [0, '', 'code 0, signal '],
];

test.each([
  ['waitForSimulatorReady', 'gcp simulator'],
  ['waitForWriterReady', 'writer server'],
])('%s preserves exact early-exit diagnostics', async (method, label) => {
  for (const [code, signal, reason] of earlyExits) {
    const f = fixture();
    const pending = f.runner.playwrightRunnerTestUtils[method](
      createAllowEffects(),
      f.children[0].port
    );
    const rejected = observe(
      expect(pending).rejects.toThrow(
        new Error(`${label} exited before announcing a port (${reason})`)
      )
    );
    f.children[0].exit(code, signal);
    await rejected;
  }
});
