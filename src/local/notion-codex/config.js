import path from 'node:path';
import { readFile } from 'node:fs/promises';

const DEFAULT_CODEX_ARGS = [
  'exec',
  '--skip-git-repo-check',
  '--model',
  'gpt-5.4-mini',
  '--sandbox',
  'workspace-write',
];

export const DEFAULT_NOTION_CODEX_CONFIG = {
  notion: {
    dadetoPageId: '1f2700afc30180a3abedd568190132c3',
    dadetoPageUrl: 'https://app.notion.com/p/1f2700afc30180a3abedd568190132c3',
    symphonyPageId: '352700afc30180feb33cc5065a91c0ef',
    symphonyPageUrl: 'https://app.notion.com/p/352700afc30180feb33cc5065a91c0ef',
    taskDataSourceUrl: 'collection://9f6bfea5-08d7-4897-b438-0d7dcb8f494a',
    taskContext: 'At lorandil',
    taskStatus: 'Not Started',
    messageSearchQuery: 'codex',
    inboxPageIds: ['352700afc30180feb33cc5065a91c0ef'],
    apiTokenEnvNames: ['NOTION_API_KEY', 'NOTION_TOKEN'],
    apiVersion: '2026-03-11',
  },
  launcher: {
    command: 'codex',
    args: DEFAULT_CODEX_ARGS,
  },
  pollIntervalMs: 60000,
  idleBackoff: {
    baseDelayMs: 60000,
    initialExponent: 0,
    maxExponent: 9,
  },
  maxConcurrentRuns: 1,
  logDir: 'tracking/notion-codex',
  outcomeDir: 'tracking/notion-codex/outcomes',
  statePath: 'tracking/notion-codex/status.json',
};

/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
function normalizeString(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {unknown} value Candidate number.
 * @param {number} fallback Fallback number.
 * @returns {number} Positive finite number or fallback.
 */
function normalizePositiveNumber(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate string array.
 * @param {string[]} fallback Fallback string array.
 * @returns {string[]} Normalized string array.
 */
function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return [...fallback];
  }

  return normalized;
}

/**
 * @param {unknown} value Candidate launcher args.
 * @returns {string[]} Normalized Codex args.
 */
function normalizeLauncherArgs(value) {
  return normalizeStringArray(value, DEFAULT_NOTION_CODEX_CONFIG.launcher.args);
}

/**
 * @param {unknown} config Candidate config object.
 * @param {string} repoRoot Repository root for path resolution.
 * @param {string} configPath Config path for reporting.
 * @returns {{
 *   configPath: string,
 *   notion: typeof DEFAULT_NOTION_CODEX_CONFIG.notion,
 *   launcher: { command: string, args: string[] },
 *   pollIntervalMs: number,
 *   maxConcurrentRuns: number,
 *   logDir: string,
 *   statePath: string
 * }} Normalized Notion Codex poller config.
 */
export function normalizeNotionCodexConfig(config, repoRoot, configPath) {
  const source = config && typeof config === 'object' ? config : {};
  const notion = source.notion && typeof source.notion === 'object'
    ? source.notion
    : {};
  const launcher = source.launcher && typeof source.launcher === 'object'
    ? source.launcher
    : {};
  const defaultNotion = DEFAULT_NOTION_CODEX_CONFIG.notion;

  return {
    configPath,
    notion: {
      dadetoPageId: normalizeString(notion.dadetoPageId, defaultNotion.dadetoPageId),
      dadetoPageUrl: normalizeString(notion.dadetoPageUrl, defaultNotion.dadetoPageUrl),
      symphonyPageId: normalizeString(
        notion.symphonyPageId,
        defaultNotion.symphonyPageId
      ),
      symphonyPageUrl: normalizeString(
        notion.symphonyPageUrl,
        defaultNotion.symphonyPageUrl
      ),
      taskDataSourceUrl: normalizeString(
        notion.taskDataSourceUrl,
        defaultNotion.taskDataSourceUrl
      ),
      taskContext: normalizeString(notion.taskContext, defaultNotion.taskContext),
      taskStatus: normalizeString(notion.taskStatus, defaultNotion.taskStatus),
      messageSearchQuery: normalizeString(
        notion.messageSearchQuery,
        defaultNotion.messageSearchQuery
      ),
      inboxPageIds: normalizeStringArray(notion.inboxPageIds, defaultNotion.inboxPageIds),
      apiTokenEnvNames: normalizeStringArray(
        notion.apiTokenEnvNames,
        defaultNotion.apiTokenEnvNames
      ),
      apiVersion: normalizeString(notion.apiVersion, defaultNotion.apiVersion),
    },
    launcher: {
      command: normalizeString(
        launcher.command,
        DEFAULT_NOTION_CODEX_CONFIG.launcher.command
      ),
      args: normalizeLauncherArgs(launcher.args),
    },
    pollIntervalMs: normalizePositiveNumber(
      source.pollIntervalMs,
      DEFAULT_NOTION_CODEX_CONFIG.pollIntervalMs
    ),
    idleBackoff: normalizeIdleBackoff(source.idleBackoff),
    maxConcurrentRuns: normalizePositiveNumber(
      source.maxConcurrentRuns,
      DEFAULT_NOTION_CODEX_CONFIG.maxConcurrentRuns
    ),
    logDir: path.resolve(
      repoRoot,
      normalizeString(source.logDir, DEFAULT_NOTION_CODEX_CONFIG.logDir)
    ),
    outcomeDir: path.resolve(
      repoRoot,
      normalizeString(source.outcomeDir, DEFAULT_NOTION_CODEX_CONFIG.outcomeDir)
    ),
    statePath: path.resolve(
      repoRoot,
      normalizeString(source.statePath, DEFAULT_NOTION_CODEX_CONFIG.statePath)
    ),
  };
}

function normalizeIdleBackoff(value) {
  const source = value && typeof value === 'object' ? value : {};
  const fallback = DEFAULT_NOTION_CODEX_CONFIG.idleBackoff;

  return {
    baseDelayMs: normalizePositiveNumber(source.baseDelayMs, fallback.baseDelayMs),
    initialExponent: normalizeNonNegativeInteger(
      source.initialExponent,
      fallback.initialExponent
    ),
    maxExponent: normalizeNonNegativeInteger(source.maxExponent, fallback.maxExponent),
  };
}

function normalizeNonNegativeInteger(value, fallback) {
  if (!Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {{ configPath?: string, repoRoot?: string, readFileImpl?: typeof readFile }} [options]
 * @returns {Promise<ReturnType<typeof normalizeNotionCodexConfig>>} Loaded config.
 */
export async function loadNotionCodexConfig(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const configPath = path.resolve(
    repoRoot,
    options.configPath ?? 'tracking/notion-codex.local.json'
  );
  const readFileImpl = options.readFileImpl ?? readFile;

  try {
    const rawConfig = await readFileImpl(configPath, 'utf8');
    return normalizeNotionCodexConfig(JSON.parse(rawConfig), repoRoot, configPath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return normalizeNotionCodexConfig({}, repoRoot, configPath);
    }

    throw error;
  }
}
