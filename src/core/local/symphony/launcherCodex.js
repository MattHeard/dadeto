import { createDetachedProcessLauncher } from '../process-launcher.js';

// Keep Ralph launches cheap and bounded while still allowing a single bead loop
// to edit files and run local checks inside the repo workspace.
export const DEFAULT_CODEX_ARGS = [
  'exec',
  '--skip-git-repo-check',
  '--model',
  'gpt-5.4-mini',
  '--sandbox',
  'workspace-write',
];

export const DEFAULT_CODEX_RALPH_ARGS = [...DEFAULT_CODEX_ARGS];

/**
 * Create the Codex-backed Ralph launcher used by the Symphony runner.
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   mkdirImpl?: any,
 *   openImpl?: any,
 *   spawnImpl?: any
 * }} options Launcher options and dependency overrides.
 * @returns {{
 *   launchRunner: (payload: {
 *     repoRoot: string,
 *     beadId: string,
 *     beadTitle?: string | null,
 *     runId: string,
 *     onExit?: (options: {
 *       runId: string,
 *       beadId: string,
 *       beadTitle: string | null,
 *       exitCode: number | null,
 *       signal: string | null
 *     }) => unknown
 *   }) => Promise<{
 *     launcherKind: string,
 *     command: string,
 *     args: string[],
 *     pid: number | null,
 *     stdoutPath: string,
 *     stderrPath: string
 *   }>
 * }} Local Codex-backed Ralph launcher.
 */
export function createCodexRalphLauncher(options) {
  const typedOptions = /** @type {any} */ (options);
  /**
   * @param {{ beadId: string }} payload Runner launch payload.
   * @returns {string[]} Command arguments.
   */
  function resolveArgs(payload) {
    return buildResolveArgs(typedOptions, payload);
  }

  return {
    async launchRunner(payload) {
      const typedPayload = /** @type {any} */ (payload);
      return createDetachedProcessLauncher({
        ...typedOptions,
        logDirSuffix: 'symphony',
        closeErrorLabel: 'Failed to close run log handle:',
        exitErrorLabel: buildExitErrorLabel,
        resolveArgs,
        buildExitPayload,
      }).launch(typedPayload);
    },
  };
}

/**
 * @param {{ beadId: string, beadTitle?: string | null, runId: string }} payload Ralph launch payload.
 * @returns {string} Prompt passed to the Codex runner session.
 */
function buildRalphPrompt(payload) {
  const lines = [
    'you are ralph',
    'run exactly one bounded bead loop as the repo runner',
    'keep terminal usage terse and evidence-driven',
    'prefer focused rg/sed reads over broad scans or large file dumps',
    'if blocked or partial, leave bead evidence and stop instead of widening scope',
    `pop ${payload.beadId}`,
  ];
  if (payload.beadTitle) {
    lines.push(`bead title: ${payload.beadTitle}`);
  }
  lines.push(`run id: ${payload.runId}`);

  return lines.join('\n');
}

/**
 * @param {Record<string, unknown>} payload Runner exit payload.
 * @returns {string} Error label.
 */
function buildExitErrorLabel(payload) {
  return `Failed to handle Symphony runner exit for ${payload.runId}:`;
}

/**
 * @param {{ args?: string[] }} options Launcher options.
 * @param {{ beadId: string }} payload Runner launch payload.
 * @returns {string[]} Command arguments.
 */
function buildResolveArgs(options, payload) {
  return [
    ...(options.args ?? []),
    buildRalphPrompt(/** @type {any} */ (payload)),
  ];
}

/**
 * @param {{ beadId: string, beadTitle?: string | null }} payload Runner payload.
 * @param {any} input Process result payload.
 * @returns {{
 *   runId: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   exitCode: number | null,
 *   signal: string | null
 * }} Exit payload.
 */
function buildExitPayload(payload, input) {
  const typedInput =
    /** @type {{ runId: string, exitCode: number | null, signal: string | null }} */ (
      /** @type {any} */ (input)
    );
  const { runId, exitCode, signal } = typedInput;
  return {
    runId,
    beadId: payload.beadId,
    beadTitle: payload.beadTitle ?? null,
    exitCode,
    signal,
  };
}
