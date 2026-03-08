import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CODEX_RALPH_ARGS } from './launcherCodex.js';

export const DEFAULT_SYMPHONY_CONFIG = {
  tracker: {
    kind: 'bd',
    readyCommand: 'bd ready --sort priority',
  },
  launcher: {
    kind: 'codex',
    command: 'codex',
    args: DEFAULT_CODEX_RALPH_ARGS,
  },
  workspaceRoot: '.worktrees/symphony',
  logDir: 'tracking/symphony',
  pollIntervalMs: 30000,
  maxConcurrentRuns: 1,
  defaultBranch: 'main',
};

function normalizeTracker(tracker) {
  if (!tracker || typeof tracker !== 'object') {
    return { ...DEFAULT_SYMPHONY_CONFIG.tracker };
  }

  return {
    kind:
      typeof tracker.kind === 'string'
        ? tracker.kind
        : DEFAULT_SYMPHONY_CONFIG.tracker.kind,
    readyCommand:
      typeof tracker.readyCommand === 'string' && tracker.readyCommand.trim()
        ? tracker.readyCommand.trim()
        : DEFAULT_SYMPHONY_CONFIG.tracker.readyCommand,
  };
}

function normalizeLauncher(launcher) {
  if (!launcher || typeof launcher !== 'object') {
    return { ...DEFAULT_SYMPHONY_CONFIG.launcher };
  }

  return {
    kind:
      typeof launcher.kind === 'string' && launcher.kind.trim()
        ? launcher.kind.trim()
        : DEFAULT_SYMPHONY_CONFIG.launcher.kind,
    command:
      typeof launcher.command === 'string' && launcher.command.trim()
        ? launcher.command.trim()
        : DEFAULT_SYMPHONY_CONFIG.launcher.command,
    args: normalizeLauncherArgs(launcher.args),
  };
}

function normalizeLauncherArgs(args) {
  if (!Array.isArray(args)) {
    return [...DEFAULT_SYMPHONY_CONFIG.launcher.args];
  }

  const normalizedArgs = args
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean);

  if (normalizedArgs.length === 0) {
    return [...DEFAULT_SYMPHONY_CONFIG.launcher.args];
  }

  return normalizedArgs;
}

function normalizeNumber(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizePathValue(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {object | null | undefined} config Symphony config candidate.
 * @param {string} repoRoot Repo root used to resolve relative paths.
 * @param {string} configPath Config file path used for status reporting.
 * @returns {{
 *   configPath: string,
 *   tracker: { kind: string, readyCommand: string },
 *   launcher: { kind: string, command: string, args: string[] },
 *   workspaceRoot: string,
 *   logDir: string,
 *   statusPath: string,
 *   pollIntervalMs: number,
 *   maxConcurrentRuns: number,
 *   defaultBranch: string
 * }} Normalized local Symphony config.
 */
export function normalizeSymphonyConfig(config, repoRoot, configPath) {
  const workspaceRoot = normalizePathValue(
    config?.workspaceRoot,
    DEFAULT_SYMPHONY_CONFIG.workspaceRoot
  );
  const logDir = normalizePathValue(config?.logDir, DEFAULT_SYMPHONY_CONFIG.logDir);

  return {
    configPath,
    tracker: normalizeTracker(config?.tracker),
    launcher: normalizeLauncher(config?.launcher),
    workspaceRoot: path.resolve(repoRoot, workspaceRoot),
    logDir: path.resolve(repoRoot, logDir),
    statusPath: path.resolve(repoRoot, logDir, 'status.json'),
    pollIntervalMs: normalizeNumber(
      config?.pollIntervalMs,
      DEFAULT_SYMPHONY_CONFIG.pollIntervalMs
    ),
    maxConcurrentRuns: normalizeNumber(
      config?.maxConcurrentRuns,
      DEFAULT_SYMPHONY_CONFIG.maxConcurrentRuns
    ),
    defaultBranch:
      typeof config?.defaultBranch === 'string' && config.defaultBranch.trim()
        ? config.defaultBranch.trim()
        : DEFAULT_SYMPHONY_CONFIG.defaultBranch,
  };
}

/**
 * @param {{ configPath?: string, repoRoot?: string, readFileImpl?: typeof readFile }} [options]
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
