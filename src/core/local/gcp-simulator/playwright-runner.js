import { spawn as defaultSpawn } from 'node:child_process';
import path from 'node:path';

const READY_PATTERN = /gcp simulator listening on http:\/\/127\.0\.0\.1:(\d+)/;

/**
 * @typedef {{ [key: string]: string | undefined }} EnvMap
 */

export const playwrightRunnerTestUtils = {
  waitForSimulatorReady,
  waitForExit,
  terminateProcess,
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
 *   playwrightCommand?: string,
 *   playwrightArgs?: string[],
 * }} [options] Runner options.
 * @returns {Promise<{ baseUrl: string, exitCode: number, signal: string | null }>} Run outcome.
 */
export async function runLocalPlaywright(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const spawnImpl = options.spawnImpl ?? defaultSpawn;
  const simulatorEnv = createSimulatorEnv(options.env);
  const simulator = spawnSimulator(repoRoot, spawnImpl, options, simulatorEnv);

  try {
    const port = await waitForSimulatorReady(simulator);
    const baseUrl = `http://127.0.0.1:${port}`;
    const playwright = spawnPlaywright({
      repoRoot,
      spawnImpl,
      options,
      simulatorEnv,
      baseUrl,
    });

    const { code, signal } = await waitForExit(playwright);
    return {
      baseUrl,
      exitCode: toExitCode(code, signal),
      signal: signal ?? null,
    };
  } finally {
    terminateProcess(simulator);
  }
}

/**
 * Wait for the simulator to print its bound port.
 * @param {import('node:child_process').ChildProcess} child Simulator process.
 * @returns {Promise<number>} Bound port.
 */
function waitForSimulatorReady(child) {
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
      const match = buffer.match(READY_PATTERN);
      if (match) {
        settleOnce(resolve, Number(match[1]));
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
      settleOnce(reject, error);
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
        reject,
        new Error(`gcp simulator exited before announcing a port (${reason})`)
      );
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);
    child.once('error', onError);
    child.once('exit', onExit);
  });
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
    GCP_SIMULATOR_PORT: '0',
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
  const simulatorCommand = options.simulatorCommand ?? process.execPath;
  const simulatorScript =
    options.simulatorScript ??
    path.resolve(repoRoot, 'src/local/gcp-simulator/server.js');
  const simulatorArgs = options.simulatorArgs ?? [simulatorScript];

  return spawnImpl(simulatorCommand, simulatorArgs, {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * @param {{
 *   repoRoot: string,
 *   spawnImpl: typeof defaultSpawn,
 *   options: { playwrightCommand?: string, playwrightArgs?: string[] },
 *   simulatorEnv: EnvMap,
 *   baseUrl: string,
 * }} input Spawn inputs.
 * @returns {import('node:child_process').ChildProcess} Playwright process.
 */
function spawnPlaywright(input) {
  const { repoRoot, spawnImpl, options, simulatorEnv, baseUrl } = input;
  const playwrightCommand = options.playwrightCommand ?? 'npx';
  const playwrightArgs = [
    'playwright',
    'test',
    ...(options.playwrightArgs ?? []),
  ];

  return spawnImpl(playwrightCommand, playwrightArgs, {
    cwd: repoRoot,
    env: {
      ...simulatorEnv,
      PLAYWRIGHT_BASE_URL: baseUrl,
    },
    stdio: 'inherit',
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
