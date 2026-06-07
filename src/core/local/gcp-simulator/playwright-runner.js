import { spawn as defaultSpawn } from 'node:child_process';
import path from 'node:path';

const READY_PATTERN =
  /gcp simulator listening on http:\/\/127\.0\.0\.1:(\d+)/;

export const playwrightRunnerTestUtils = {
  waitForSimulatorReady,
  waitForExit,
  terminateProcess,
};

/**
 * Launch the local GCP simulator and run Playwright against it.
 * @param {{
 *   repoRoot?: string,
 *   env?: NodeJS.ProcessEnv,
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
  const simulatorCommand = options.simulatorCommand ?? process.execPath;
  const simulatorScript =
    options.simulatorScript ??
    path.resolve(repoRoot, 'src/local/gcp-simulator/server.js');
  const simulatorArgs = options.simulatorArgs ?? [simulatorScript];
  const simulatorEnv = {
    ...process.env,
    ...options.env,
    GCP_SIMULATOR_PORT: '0',
  };

  const simulator = spawnImpl(simulatorCommand, simulatorArgs, {
    cwd: repoRoot,
    env: simulatorEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const port = await waitForSimulatorReady(simulator);
    const baseUrl = `http://127.0.0.1:${port}`;
    const playwrightCommand = options.playwrightCommand ?? 'npx';
    const playwrightArgs = [
      'playwright',
      'test',
      ...(options.playwrightArgs ?? []),
    ];
    const playwright = spawnImpl(playwrightCommand, playwrightArgs, {
      cwd: repoRoot,
      env: {
        ...simulatorEnv,
        PLAYWRIGHT_BASE_URL: baseUrl,
      },
      stdio: 'inherit',
    });

    const { code, signal } = await waitForExit(playwright);
    return {
      baseUrl,
      exitCode: code ?? (signal ? 1 : 0),
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
    let settled = false;

    const cleanup = () => {
      child.off('error', onError);
      child.off('exit', onExit);
    };

    const resolveOnce = port => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(port);
    };

    const rejectOnce = error => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const onStdout = chunk => {
      process.stdout.write(chunk);
      buffer += chunk.toString('utf8');
      const match = buffer.match(READY_PATTERN);
      if (match) {
        resolveOnce(Number(match[1]));
      }
    };

    const onStderr = chunk => {
      process.stderr.write(chunk);
    };

    const onError = error => {
      rejectOnce(error);
    };

    const onExit = (code, signal) => {
      rejectOnce(
        new Error(
          `gcp simulator exited before announcing a port (code ${
            code ?? 'null'
          }, signal ${signal ?? 'null'})`
        )
      );
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);
    child.once('error', onError);
    child.once('exit', onExit);
  });
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
