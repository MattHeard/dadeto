import { DEFAULT_CODEX_RALPH_ARGS } from './launcherCodex.js';
import {
  buildNormalizedLocalConfig,
  loadNormalizedLocalJsonConfig,
  normalizePositiveNumber,
  normalizeString,
  normalizeStringArray,
  normalizeConfigWithResolvedPaths,
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
/**
 * @param {{
 *   config: object | null | undefined,
 *   repoRoot: string,
 *   configPath: string,
 *   pathModule: { resolve: (first: string, ...parts: string[]) => string },
 * }} options Symphony config candidate.
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
export function normalizeSymphonyConfig(options) {
  const typedConfig = /** @type {any} */ (options.config);
  return normalizeConfigWithResolvedPaths({
    rawConfig: typedConfig,
    repoRoot: options.repoRoot,
    configPath: options.configPath,
    pathModule: options.pathModule,
    pathFields: {
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
    },
    build: (paths, currentConfig, currentConfigPath) => ({
      configPath: currentConfigPath,
      tracker: normalizeTracker(currentConfig?.tracker),
      launcher: normalizeLauncher(currentConfig?.launcher),
      workspaceRoot: paths.workspaceRoot,
      logDir: paths.logDir,
      statusPath: paths.statusPath,
      pollIntervalMs: normalizePositiveNumber(
        currentConfig?.pollIntervalMs,
        DEFAULT_SYMPHONY_CONFIG.pollIntervalMs
      ),
      maxConcurrentRuns: normalizePositiveNumber(
        currentConfig?.maxConcurrentRuns,
        DEFAULT_SYMPHONY_CONFIG.maxConcurrentRuns
      ),
      defaultBranch: resolveDefaultBranch(currentConfig?.defaultBranch),
    }),
  });
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
    normalize: (config, repoRoot, configPath, pathModule) =>
      normalizeSymphonyConfig({
        config,
        repoRoot,
        configPath,
        pathModule,
      }),
  });
}
