import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CODEX_RALPH_ARGS } from './launcherCodex.js';
import {
  normalizePositiveNumber,
  normalizePathValue,
  normalizeString,
  normalizeStringArray,
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
 * Resolve the workspace root path from the raw config.
 * @param {object | null | undefined} config Symphony config candidate.
 * @returns {string} Normalized workspace root path relative to the repo.
 */
function resolveWorkspaceRoot(config) {
  const typedConfig = /** @type {any} */ (config);
  return normalizePathValue(
    typedConfig?.workspaceRoot,
    DEFAULT_SYMPHONY_CONFIG.workspaceRoot
  );
}

/**
 * Resolve the log directory path from the raw config.
 * @param {object | null | undefined} config Symphony config candidate.
 * @returns {string} Normalized log directory path relative to the repo.
 */
function resolveLogDir(config) {
  const typedConfig = /** @type {any} */ (config);
  return normalizePathValue(
    typedConfig?.logDir,
    DEFAULT_SYMPHONY_CONFIG.logDir
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
 * @param {object | null | undefined} config Symphony config candidate.
 * @param {string} repoRoot Repo root used to resolve relative paths.
 * @param {string} configPath Config file path used for status reporting.
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
export function normalizeSymphonyConfig(config, repoRoot, configPath) {
  const typedConfig = /** @type {any} */ (config);
  const workspaceRoot = resolveWorkspaceRoot(config);
  const logDir = resolveLogDir(config);

  return {
    configPath,
    tracker: normalizeTracker(typedConfig?.tracker),
    launcher: normalizeLauncher(typedConfig?.launcher),
    workspaceRoot: path.resolve(repoRoot, workspaceRoot),
    logDir: path.resolve(repoRoot, logDir),
    statusPath: path.resolve(repoRoot, logDir, 'status.json'),
    pollIntervalMs: normalizePositiveNumber(
      typedConfig?.pollIntervalMs,
      DEFAULT_SYMPHONY_CONFIG.pollIntervalMs
    ),
    maxConcurrentRuns: normalizePositiveNumber(
      typedConfig?.maxConcurrentRuns,
      DEFAULT_SYMPHONY_CONFIG.maxConcurrentRuns
    ),
    defaultBranch: resolveDefaultBranch(typedConfig?.defaultBranch),
  };
}

/**
 * @param {{ configPath?: string, repoRoot?: string, readFileImpl?: typeof readFile }} [options] Optional file resolution overrides.
 * @returns {Promise<ReturnType<typeof normalizeSymphonyConfig>>} Normalized local Symphony config.
 */
export async function loadSymphonyConfig(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const configPath = path.resolve(
    repoRoot,
    options.configPath ?? 'tracking/symphony.local.json'
  );
  const readFileImpl = options.readFileImpl ?? readFile;
  const rawConfig = await readFileImpl(configPath, 'utf8');
  const parsedConfig = JSON.parse(rawConfig);

  return normalizeSymphonyConfig(parsedConfig, repoRoot, configPath);
}
