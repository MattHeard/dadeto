import { DEFAULT_CODEX_RALPH_ARGS } from './launcherCodex.js';
import {
  loadNormalizedLocalJsonConfig,
  normalizePositiveNumber,
  normalizeString,
  normalizeStringArray,
  resolveNormalizedRepoPaths,
} from '../config-utils.js';

export const DEFAULT_SYMPHONY_CONFIG = {
  tracker: {
    kind: 'bd',
    readyCommand: 'bd ready --sort priority',
  },
  launcher: {
    kind: 'codex',
    command: 'codex',
    args: DEFAULT_CODEX_RALPH_ARGS,
    mcpServers: [],
  },
  workspaceRoot: '.worktrees/symphony',
  logDir: 'tracking/symphony',
  pollIntervalMs: 30000,
  maxConcurrentRuns: 1,
  defaultBranch: 'main',
};

/**
 * Normalize the tracker section of the Symphony config.
 * @param {unknown} tracker Tracker config candidate.
 * @returns {{ kind: string, readyCommand: string }} Normalized tracker config.
 */
function normalizeTracker(tracker) {
  if (!tracker || typeof tracker !== 'object') {
    return { ...DEFAULT_SYMPHONY_CONFIG.tracker };
  }

  const typedTracker = /** @type {any} */ (tracker);
  return {
    kind: normalizeString(
      typedTracker.kind,
      DEFAULT_SYMPHONY_CONFIG.tracker.kind
    ),
    readyCommand: normalizeString(
      typedTracker.readyCommand,
      DEFAULT_SYMPHONY_CONFIG.tracker.readyCommand
    ),
  };
}

/**
 * Normalize the launcher section of the Symphony config.
 * @param {unknown} launcher Launcher config candidate.
 * @returns {{ kind: string, command: string, args: string[], mcpServers: string[] }} Normalized launcher config.
 */
function normalizeLauncher(launcher) {
  if (!launcher || typeof launcher !== 'object') {
    return { ...DEFAULT_SYMPHONY_CONFIG.launcher };
  }

  const typedLauncher = /** @type {any} */ (launcher);
  return {
    kind: normalizeString(
      typedLauncher.kind,
      DEFAULT_SYMPHONY_CONFIG.launcher.kind
    ),
    command: normalizeString(
      typedLauncher.command,
      DEFAULT_SYMPHONY_CONFIG.launcher.command
    ),
    args: normalizeStringArray(
      typedLauncher.args,
      DEFAULT_SYMPHONY_CONFIG.launcher.args
    ),
    mcpServers: normalizeLauncherMcpServers(typedLauncher.mcpServers),
  };
}

/**
 * Normalize the launcher MCP server list.
 * @param {unknown} mcpServers Launcher MCP server list candidate.
 * @returns {string[]} Normalized MCP server list.
 */
function normalizeLauncherMcpServers(mcpServers) {
  return normalizeStringArray(
    mcpServers,
    DEFAULT_SYMPHONY_CONFIG.launcher.mcpServers
  );
}

/**
 * Resolve the default branch name from the raw config.
 * @param {unknown} defaultBranch Default branch candidate.
 * @returns {string} Normalized default branch name.
 */
function resolveDefaultBranch(defaultBranch) {
  if (typeof defaultBranch === 'string') {
    const trimmedDefaultBranch = defaultBranch.trim();
    if (trimmedDefaultBranch) {
      return trimmedDefaultBranch;
    }
  }

  return DEFAULT_SYMPHONY_CONFIG.defaultBranch;
}

/**
 * Resolve the Symphony path fields from the raw config.
 * @param {object | null | undefined} config Symphony config candidate.
 * @param {string} repoRoot Repo root used to resolve relative paths.
 * @param {{ resolve: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 * @returns {{ workspaceRoot: string, logDir: string, statusPath: string }} Resolved path fields.
 */
function resolveSymphonyPaths(config, repoRoot, pathModule) {
  const typedConfig = /** @type {any} */ (config);
  return {
    ...resolveNormalizedRepoPaths(repoRoot, pathModule, {
      workspaceRoot: {
        value: typedConfig?.workspaceRoot,
        fallback: DEFAULT_SYMPHONY_CONFIG.workspaceRoot,
      },
      logDir: {
        value: typedConfig?.logDir,
        fallback: DEFAULT_SYMPHONY_CONFIG.logDir,
      },
      statusPath: {
        value: typedConfig?.logDir,
        fallback: DEFAULT_SYMPHONY_CONFIG.logDir,
        suffix: 'status.json',
      },
    }),
  };
}

/**
 * @param {object | null | undefined} config Symphony config candidate.
 * @param {string} repoRoot Repo root used to resolve relative paths.
 * @param {string} configPath Config file path used for status reporting.
 * @param {{ resolve: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 * @returns {{
 *   configPath: string,
 *   tracker: { kind: string, readyCommand: string },
 *   launcher: { kind: string, command: string, args: string[], mcpServers: string[] },
 *   workspaceRoot: string,
 *   logDir: string,
 *   statusPath: string,
 *   pollIntervalMs: number,
 *   maxConcurrentRuns: number,
 *   defaultBranch: string
 * }} Normalized local Symphony config.
 */
export function normalizeSymphonyConfig(
  config,
  repoRoot,
  configPath,
  pathModule
) {
  const { workspaceRoot, logDir, statusPath } = resolveSymphonyPaths(
    config,
    repoRoot,
    pathModule
  );

  return {
    configPath,
    tracker: normalizeTracker(/** @type {any} */ (config)?.tracker),
    launcher: normalizeLauncher(/** @type {any} */ (config)?.launcher),
    workspaceRoot,
    logDir,
    statusPath,
    pollIntervalMs: normalizePositiveNumber(
      /** @type {any} */ (config)?.pollIntervalMs,
      DEFAULT_SYMPHONY_CONFIG.pollIntervalMs
    ),
    maxConcurrentRuns: normalizePositiveNumber(
      /** @type {any} */ (config)?.maxConcurrentRuns,
      DEFAULT_SYMPHONY_CONFIG.maxConcurrentRuns
    ),
    defaultBranch: resolveDefaultBranch(
      /** @type {any} */ (config)?.defaultBranch
    ),
  };
}

/**
 * @param {{ configPath?: string, repoRoot?: string, cwd?: () => string, pathModule?: { resolve: (first: string, ...parts: string[]) => string }, readFileImpl?: (filePath: string, encoding: 'utf8') => Promise<string> }} [options] Optional file resolution overrides.
 * @returns {Promise<ReturnType<typeof normalizeSymphonyConfig>>} Normalized local Symphony config.
 */
export async function loadSymphonyConfig(options = {}) {
  return loadNormalizedLocalJsonConfig({
    ...options,
    configPathKey: 'configPath',
    defaultRelativePath: 'tracking/symphony.local.json',
    normalize: normalizeSymphonyConfig,
  });
}
