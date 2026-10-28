/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{toString: (encoding?: 'utf8') => string}} RunnerChunk */
/** @typedef {(code: number | null, signal: string | null) => void} ExitListener */
/**
 * @typedef {{
 *   status: (permission: AllowEffects) => {exitCode: number | null, signalCode: string | null},
 *   onceError: (permission: AllowEffects, listener: (error: Error) => void) => unknown,
 *   onceExit: (permission: AllowEffects, listener: ExitListener) => unknown,
 *   offError: (permission: AllowEffects, listener: (error: Error) => void) => unknown,
 *   offExit: (permission: AllowEffects, listener: ExitListener) => unknown,
 *   onStdout: (permission: AllowEffects, listener: (chunk: RunnerChunk) => void) => unknown,
 *   onStderr: (permission: AllowEffects, listener: (chunk: RunnerChunk) => void) => unknown,
 *   kill: (permission: AllowEffects, signal: 'SIGTERM') => unknown,
 * }} RunnerChild
 */
/** @typedef {{cwd: string, env: EnvMap, stdio: Array<'ignore' | 'pipe'> | 'inherit'}} RunnerSpawnOptions */
/** @typedef {(permission: AllowEffects, command: string, args: string[], options: RunnerSpawnOptions) => RunnerChild} RunnerSpawn */
/** @typedef {{rootDir: string, execPath: string, env: EnvMap, spawn: RunnerSpawn, writeStdout: (permission: AllowEffects, chunk: RunnerChunk) => void, writeStderr: (permission: AllowEffects, chunk: RunnerChunk) => void}} RunnerProcessPlatform */
/** @typedef {PlaywrightOptions & SimulatorSpawnOptions & {repoRoot?: string, env?: EnvMap}} RunnerOptions */
/** @typedef {{baseUrl: string, exitCode: number, signal: string | null}} RunnerResult */
/** @typedef {{waitForWriterReady: (permission: AllowEffects, child: RunnerChild) => Promise<number>, waitForSimulatorReady: (permission: AllowEffects, child: RunnerChild) => Promise<number>, waitForExit: (permission: AllowEffects, child: RunnerChild) => Promise<{code: number | null, signal: string | null}>, terminateProcess: (permission: AllowEffects, child: RunnerChild | null | undefined) => void, spawnPlaywright: (permission: AllowEffects, input: PlaywrightSpawnInput) => RunnerChild}} RunnerTestUtils */

const READY_PATTERN = /gcp simulator listening on http:\/\/127\.0\.0\.1:(\d+)/;
const WRITER_READY_PATTERN =
  /writer server listening on http:\/\/localhost:(\d+)\/writer\//;

// Playwright process inputs are normalized at this boundary.
/**
 * @typedef {{ [key: string]: string | undefined }} EnvMap
 */

// Child-process invocation options are documented separately.
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

/**
 * @typedef {{
 *   repoRoot: string,
 *   options: SimulatorSpawnOptions,
 *   env: EnvMap,
 *   writerPort: number,
 * }} WriterServerSpawnInput
 */

/**
 * @typedef {{
 *   repoRoot: string,
 *   options: PlaywrightOptions,
 *   simulatorEnv: EnvMap,
 *   baseUrl: string,
 *   apiBaseUrl?: string,
 * }} PlaywrightSpawnInput
 */

/**
 * Bind runner orchestration to explicit process, network and path capabilities.
 * @param {{process: RunnerProcessPlatform, paths: {resolve: (...parts: string[]) => string}, reservePort: (permission: AllowEffects) => Promise<number>}} platform Native-independent launch and lifecycle dependencies.
 * @returns {{runLocalPlaywright: (permission: AllowEffects, options?: RunnerOptions) => Promise<RunnerResult>, playwrightRunnerTestUtils: RunnerTestUtils}} Runner operations.
 */
export function createLocalPlaywrightRunner(platform) {
  const playwrightRunnerTestUtils = {
    waitForWriterReady,
    waitForSimulatorReady,
    waitForExit,
    terminateProcess,
    spawnPlaywright,
  };

  /**
   * Launch the local GCP simulator and run Playwright against it.
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerOptions} [options] Runner configuration.
   * @returns {Promise<{ baseUrl: string, exitCode: number, signal: string | null }>} Run outcome.
   */
  async function runLocalPlaywright(permission, options = {}) {
    const repoRoot = options.repoRoot ?? platform.process.rootDir;
    const simulatorEnv = createSimulatorEnv(options.env);
    const simulator = spawnSimulator(
      permission,
      repoRoot,
      options,
      simulatorEnv
    );
    let writer = null;

    try {
      const simulatorPort = await waitForSimulatorReady(permission, simulator);
      const simulatorBaseUrl = `http://127.0.0.1:${simulatorPort}`;
      const writerListenPort = await platform.reservePort(permission);
      writer = spawnWriterServer(permission, {
        repoRoot,
        options,
        env: {
          ...simulatorEnv,
          API_BASE_URL: simulatorBaseUrl,
        },
        writerPort: writerListenPort,
      });
      const writerBoundPort = await waitForWriterReady(permission, writer);
      const writerBaseUrl = `http://127.0.0.1:${writerBoundPort}`;
      const playwright = spawnPlaywright(permission, {
        repoRoot,
        options,
        simulatorEnv,
        baseUrl: writerBaseUrl,
        apiBaseUrl: simulatorBaseUrl,
      });

      const { code, signal } = await waitForExit(permission, playwright);
      return {
        baseUrl: writerBaseUrl,
        exitCode: toExitCode(code, signal),
        signal: signal ?? null,
      };
    } finally {
      terminateProcess(permission, simulator);
      terminateProcess(permission, writer);
    }
  }

  /**
   * Wait for the simulator to print its bound port.
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerChild} child Simulator process.
   * @returns {Promise<number>} Bound port.
   */
  function waitForSimulatorReady(permission, child) {
    return waitForPortAnnouncement(
      permission,
      child,
      READY_PATTERN,
      'gcp simulator'
    );
  }

  /**
   * Wait for the writer server to print its bound port.
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerChild} child Writer process.
   * @returns {Promise<number>} Bound port.
   */
  function waitForWriterReady(permission, child) {
    return waitForPortAnnouncement(
      permission,
      child,
      WRITER_READY_PATTERN,
      'writer server'
    );
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
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerChild} child Child process.
   * @returns {Promise<{ code: number | null, signal: string | null }>} Exit state.
   */
  function waitForExit(permission, child) {
    return new Promise((resolve, reject) => {
      child.onceError(permission, reject);
      child.onceExit(permission, createExitResolver(resolve));
    });
  }

  /**
   * Build a child-process exit resolver.
   * @param {(result: { code: number | null, signal: string | null }) => void} resolve Result resolver.
   * @returns {(code: number | null, signal: string | null) => void} Exit callback.
   */
  function createExitResolver(resolve) {
    return (code, signal) => resolve({ code, signal });
  }

  /**
   * @param {EnvMap | undefined} env Extra environment variables for simulator startup.
   * @returns {EnvMap} Simulator environment.
   */
  function createSimulatorEnv(env) {
    return {
      ...platform.process.env,
      ...env,
      GCP_SIMULATOR_PORT: '8080',
    };
  }

  /**
   * @param {AllowEffects} permission Invocation permission.
   * @param {string} repoRoot Repository root.
   * @param {{
   *   simulatorCommand?: string,
   *   simulatorScript?: string,
   *   simulatorArgs?: string[],
   * }} options Spawn options.
   * @param {EnvMap} env Simulator environment.
   * @returns {RunnerChild} Simulator process.
   */
  function spawnSimulator(permission, repoRoot, options, env) {
    /** @type {SimulatorSpawnOptions} */
    const typedOptions = options;
    const simulatorCommand =
      typedOptions.simulatorCommand ?? platform.process.execPath;
    const simulatorScript =
      typedOptions.simulatorScript ??
      platform.paths.resolve(repoRoot, 'src/local/gcp-simulator/server.js');
    const simulatorArgs = typedOptions.simulatorArgs ?? [simulatorScript];

    return spawnNodeProcess(permission, {
      command: simulatorCommand,
      args: simulatorArgs,
      cwd: repoRoot,
      env,
    });
  }

  /**
   * @param {AllowEffects} permission Invocation permission.
   * @param {WriterServerSpawnInput} input Spawn options.
   * @returns {RunnerChild} Writer process.
   */
  function spawnWriterServer(permission, input) {
    const writerCommand =
      input.options.writerCommand ?? platform.process.execPath;
    const writerScript =
      input.options.writerScript ??
      platform.paths.resolve(input.repoRoot, 'src/local/server.js');
    const writerArgs = input.options.writerArgs ?? [writerScript];

    return spawnNodeProcess(permission, {
      command: writerCommand,
      args: writerArgs,
      cwd: input.repoRoot,
      env: {
        ...input.env,
        WRITER_PORT: String(input.writerPort),
      },
    });
  }

  /**
   * @param {AllowEffects} permission Invocation permission.
   * @param {PlaywrightSpawnInput} input Spawn inputs.
   * @returns {RunnerChild} Playwright process.
   */
  function spawnPlaywright(permission, input) {
    const playwrightCommand = input.options.playwrightCommand ?? 'npx';
    const playwrightConfigPath =
      input.options.playwrightConfigPath ??
      platform.paths.resolve(input.repoRoot, 'test/e2e/local.config.ts');
    const playwrightArgs = [
      'playwright',
      'test',
      '--config',
      playwrightConfigPath,
      ...(input.options.playwrightArgs ?? []),
    ];

    const apiBaseUrl = input.apiBaseUrl ?? input.baseUrl;
    return platform.process.spawn(
      permission,
      playwrightCommand,
      playwrightArgs,
      {
        cwd: input.repoRoot,
        env: Object.assign(
          {},
          {
            ...input.simulatorEnv,
            API_BASE_URL: apiBaseUrl,
            PLAYWRIGHT_BASE_URL: input.baseUrl,
            PAYMENT_WEBHOOK_URL: `${apiBaseUrl}/__sim/payment-webhook`,
          }
        ),
        stdio: /** @type {'inherit'} */ ('inherit'),
      }
    );
  }

  /**
   * Spawn a child process with the repo defaults.
   * @param {AllowEffects} permission Invocation permission.
   * @param {{
   *   command: string,
   *   args: Array<string>,
   *   cwd: string,
   *   env: EnvMap,
   * }} input Spawn inputs.
   * @returns {RunnerChild} Spawned Playwright process.
   */
  function spawnNodeProcess(permission, input) {
    const workingDirectory = `${input.cwd}`;
    return platform.process.spawn(permission, input.command, input.args, {
      cwd: workingDirectory,
      env: input.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  /**
   * Wait for a process to print a port announcement.
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerChild} child Child process.
   * @param {RegExp} pattern Ready pattern.
   * @param {string} label Human-readable process label.
   * @returns {Promise<number>} Bound port.
   */
  function waitForPortAnnouncement(permission, child, pattern, label) {
    return new Promise((resolve, reject) => {
      /** @type {string[]} */
      const fragments = [];

      const cleanup = () => {
        child.offError(permission, onError);
        child.offExit(permission, onExit);
      };

      const settleOnce = createOnceSettler(cleanup);

      /**
       * @param {RunnerChunk} chunk Output chunk.
       */
      const onStdout = chunk => {
        platform.process.writeStdout(permission, chunk);
        fragments.push(chunk.toString('utf8'));
        const match = fragments.join('').match(pattern);
        if (match) {
          settleOnce(
            /** @type {(value: unknown) => void} */ (resolve),
            Number(match[1])
          );
        }
      };

      /**
       * @param {RunnerChunk} chunk Error chunk.
       */
      const onStderr = chunk => {
        platform.process.writeStderr(permission, chunk);
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
        const reason = `code ${String(code)}, signal ${signal}`;
        settleOnce(
          /** @type {(value: unknown) => void} */ (reject),
          new Error(`${label} exited before announcing a port (${reason})`)
        );
      };

      child.onStdout(permission, onStdout);
      child.onStderr(permission, onStderr);
      child.onceError(permission, onError);
      child.onceExit(permission, onExit);
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

    return Number(Boolean(signal));
  }

  /**
   * Terminate a child process if it is still running.
   * @param {AllowEffects} permission Invocation permission.
   * @param {RunnerChild | null | undefined} child Child process.
   */
  function terminateProcess(permission, child) {
    if (!child) {
      return;
    }

    const status = child.status(permission);
    if (status.exitCode !== null || status.signalCode !== null) {
      return;
    }

    child.kill(permission, 'SIGTERM');
  }

  return { runLocalPlaywright, playwrightRunnerTestUtils };
}
