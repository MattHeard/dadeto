import { spawn as defaultSpawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const READY_PATTERN = /gcp simulator listening on http:\/\/127\.0\.0\.1:(\d+)/;
const WRITER_READY_PATTERN =
  /writer server listening on http:\/\/localhost:(\d+)\/writer\//;

/**
 * @typedef {{ [key: string]: string | undefined }} EnvMap
 */

/**
 * @typedef {{
 *   playwrightCommand?: string,
 *   playwrightArgs?: string[],
 *   playwrightConfigPath?: string,
 * }} PlaywrightOptions
 */

/**
 * @typedef {{
 *   simulatorCommand?: string,
 *   simulatorScript?: string,
 *   simulatorArgs?: string[],
 *   writerCommand?: string,
 *   writerScript?: string,
 *   writerArgs?: string[],
 * }} SimulatorSpawnOptions
 */

export const playwrightRunnerTestUtils = {
  waitForWriterReady,
  waitForSimulatorReady,
  waitForExit,
  terminateProcess,
  spawnPlaywright,
};

/**
 * Launch the local GCP simulator and run Playwright against it.
 * @param {{
 *   repoRoot?: string,
 *   env?: Record<string, string | undefined>,
 *   spawnImpl?: typeof defaultSpawn,
 *   simulatorCommand?: string,
 *   simulatorScript?: string,
 *   simulatorArgs?: string[],
 *   writerCommand?: string,
 *   writerScript?: string,
 *   writerArgs?: string[],
 *   playwrightCommand?: string,
 *   playwrightArgs?: string[],
 *   playwrightConfigPath?: string,
 * }} [options] Runner options.
 * @returns {Promise<{ baseUrl: string, exitCode: number, signal: string | null }>} Run outcome.
 */
export async function runLocalPlaywright(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const spawnImpl = options.spawnImpl ?? defaultSpawn;
  const simulatorEnv = createSimulatorEnv(options.env);
  const simulator = spawnSimulator(repoRoot, spawnImpl, options, simulatorEnv);
  let writer = null;

  try {
    const simulatorPort = await waitForSimulatorReady(simulator);
    const simulatorBaseUrl = `http://127.0.0.1:${simulatorPort}`;
    const writerListenPort = await reserveFreePort();
    writer = spawnWriterServer({
      repoRoot,
      spawnImpl,
      options,
      env: {
        ...simulatorEnv,
        API_BASE_URL: simulatorBaseUrl,
      },
      writerPort: writerListenPort,
    });
    const writerBoundPort = await waitForWriterReady(writer);
    const writerBaseUrl = `http://127.0.0.1:${writerBoundPort}`;
    const playwright = spawnPlaywright({
      repoRoot,
      spawnImpl,
      options,
      simulatorEnv,
      baseUrl: writerBaseUrl,
      apiBaseUrl: simulatorBaseUrl,
    });

    const { code, signal } = await waitForExit(playwright);
    return {
      baseUrl: writerBaseUrl,
      exitCode: toExitCode(code, signal),
      signal: signal ?? null,
    };
  } finally {
    terminateProcess(simulator);
    terminateProcess(writer);
  }
}

/**
 * Wait for the simulator to print its bound port.
 * @param {import('node:child_process').ChildProcess} child Simulator process.
 * @returns {Promise<number>} Bound port.
 */
function waitForSimulatorReady(child) {
  return waitForPortAnnouncement(child, READY_PATTERN, 'gcp simulator');
}

/**
 * Wait for the writer server to print its bound port.
 * @param {import('node:child_process').ChildProcess} child Writer process.
 * @returns {Promise<number>} Bound port.
 */
function waitForWriterReady(child) {
  return waitForPortAnnouncement(child, WRITER_READY_PATTERN, 'writer server');
}

/**
 * Build a one-time settlement function for promise callbacks.
 * @param {() => void} onFirstSettle Cleanup callback.
 * @returns {(settle: (value: unknown) => void, value: unknown) => void} One-shot settler.
 */
function createOnceSettler(onFirstSettle) {
  let settled = false;

  return (settle, value) => {
    if (settled) {
      return;
    }

    settled = true;
    onFirstSettle();
    settle(value);
  };
}

/**
 * Wait for a child process to exit.
 * @param {import('node:child_process').ChildProcess} child Child process.
 * @returns {Promise<{ code: number | null, signal: string | null }>} Exit state.
 */
function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

/**
 * @param {EnvMap | undefined} env Extra environment variables.
 * @returns {EnvMap} Simulator environment.
 */
function createSimulatorEnv(env) {
  return {
    ...process.env,
    ...env,
    GCP_SIMULATOR_PORT: '8080',
  };
}

/**
 * @param {string} repoRoot Repository root.
 * @param {typeof defaultSpawn} spawnImpl Spawn function.
 * @param {{
 *   simulatorCommand?: string,
 *   simulatorScript?: string,
 *   simulatorArgs?: string[],
 * }} options Spawn options.
 * @param {EnvMap} env Simulator environment.
 * @returns {import('node:child_process').ChildProcess} Simulator process.
 */
function spawnSimulator(repoRoot, spawnImpl, options, env) {
  /** @type {SimulatorSpawnOptions} */
  const typedOptions = options;
  const simulatorCommand = typedOptions.simulatorCommand ?? process.execPath;
  const simulatorScript =
    typedOptions.simulatorScript ??
    path.resolve(repoRoot, 'src/local/gcp-simulator/server.js');
  const simulatorArgs = typedOptions.simulatorArgs ?? [simulatorScript];

  return spawnNodeProcess({
    spawnImpl,
    command: simulatorCommand,
    args: simulatorArgs,
    cwd: repoRoot,
    env,
  });
}

/**
 * @param {{
 *   repoRoot: string,
 *   spawnImpl: typeof defaultSpawn,
 *   options: SimulatorSpawnOptions,
 *   env: EnvMap,
 *   writerPort: number,
 * }} input Spawn options.
 * @returns {import('node:child_process').ChildProcess} Writer process.
 */
function spawnWriterServer(input) {
  const { repoRoot, spawnImpl, options, env, writerPort } = input;
  /** @type {SimulatorSpawnOptions} */
  const typedOptions = options;
  const writerCommand = typedOptions.writerCommand ?? process.execPath;
  const writerScript =
    typedOptions.writerScript ?? path.resolve(repoRoot, 'src/local/server.js');
  const writerArgs = typedOptions.writerArgs ?? [writerScript];

  return spawnNodeProcess({
    spawnImpl,
    command: writerCommand,
    args: writerArgs,
    cwd: repoRoot,
    env: {
      ...env,
      WRITER_PORT: String(writerPort),
    },
  });
}

/**
 * Reserve a free TCP port for the writer server.
 * @returns {Promise<number>} Available port.
 */
function reserveFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }

        reject(new Error('Unable to reserve a writer port'));
      });
    });
  });
}

/**
 * @param {{
 *   repoRoot: string,
 *   spawnImpl: typeof defaultSpawn,
 *   options: PlaywrightOptions,
 *   simulatorEnv: EnvMap,
 *   baseUrl: string,
 *   apiBaseUrl?: string,
 * }} input Spawn inputs.
 * @returns {import('node:child_process').ChildProcess} Playwright process.
 */
function spawnPlaywright(input) {
  const { repoRoot, spawnImpl, options, simulatorEnv, baseUrl, apiBaseUrl } =
    input;
  const playwrightCommand = options.playwrightCommand ?? 'npx';
  const playwrightConfigPath =
    options.playwrightConfigPath ??
    path.resolve(repoRoot, 'test/e2e/local.config.ts');
  const playwrightArgs = [
    'playwright',
    'test',
    '--config',
    playwrightConfigPath,
    ...(options.playwrightArgs ?? []),
  ];

  return spawnImpl(playwrightCommand, playwrightArgs, {
    cwd: repoRoot,
    env: {
      ...simulatorEnv,
      API_BASE_URL: apiBaseUrl ?? baseUrl,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PAYMENT_WEBHOOK_URL: `${apiBaseUrl ?? baseUrl}/__sim/payment-webhook`,
    },
    stdio: 'inherit',
  });
}

/**
 * Spawn a child process with the repo defaults.
 * @param {{
 *   spawnImpl: typeof defaultSpawn,
 *   command: string,
 *   args: Array<string>,
 *   cwd: string,
 *   env: EnvMap,
 * }} input Spawn inputs.
 * @returns {import('node:child_process').ChildProcess} Spawned process.
 */
function spawnNodeProcess(input) {
  return input.spawnImpl(input.command, input.args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Wait for a process to print a port announcement.
 * @param {import('node:child_process').ChildProcess} child Child process.
 * @param {RegExp} pattern Ready pattern.
 * @param {string} label Human-readable process label.
 * @returns {Promise<number>} Bound port.
 */
function waitForPortAnnouncement(child, pattern, label) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      child.off('error', onError);
      child.off('exit', onExit);
    };

    const settleOnce = createOnceSettler(cleanup);

    /**
     * @param {Buffer} chunk Output chunk.
     */
    const onStdout = chunk => {
      process.stdout.write(chunk);
      buffer += chunk.toString('utf8');
      const match = buffer.match(pattern);
      if (match) {
        settleOnce(
          /** @type {(value: unknown) => void} */ (resolve),
          Number(match[1])
        );
      }
    };

    /**
     * @param {Buffer} chunk Error chunk.
     */
    const onStderr = chunk => {
      process.stderr.write(chunk);
    };

    /**
     * @param {Error} error Spawn error.
     */
    const onError = error => {
      settleOnce(/** @type {(value: unknown) => void} */ (reject), error);
    };

    /**
     * @param {number | null} code Exit code.
     * @param {string | null} signal Exit signal.
     */
    const onExit = (code, signal) => {
      let codeText = 'null';
      if (code !== null) {
        codeText = String(code);
      }

      let signalText = 'null';
      if (signal !== null) {
        signalText = signal;
      }

      const reason = `code ${codeText}, signal ${signalText}`;
      settleOnce(
        /** @type {(value: unknown) => void} */ (reject),
        new Error(`${label} exited before announcing a port (${reason})`)
      );
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

/**
 * @param {number | null} code Exit code.
 * @param {string | null} signal Exit signal.
 * @returns {number} Process exit code.
 */
function toExitCode(code, signal) {
  if (code !== null) {
    return code;
  }

  if (signal) {
    return 1;
  }

  return 0;
}

/**
 * Terminate a child process if it is still running.
 * @param {import('node:child_process').ChildProcess | null | undefined} child Child process.
 */
function terminateProcess(child) {
  if (!child) {
    return;
  }

  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');
}
