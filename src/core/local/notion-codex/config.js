import {
  normalizeNonNegativeInteger,
  normalizePositiveNumber,
  normalizeString,
  normalizeStringArray,
  loadNormalizedLocalJsonConfig,
  normalizeConfigWithResolvedPaths,
} from '../config-utils.js';
import { objectOrEmpty } from '../../commonCore.js';
import { DEFAULT_CODEX_ARGS } from '../symphony/launcherCodex.js';

export const DEFAULT_NOTION_CODEX_CONFIG = {
  notion: {
    dadetoPageId: '1f2700afc30180a3abedd568190132c3',
    dadetoPageUrl: 'https://app.notion.com/p/1f2700afc30180a3abedd568190132c3',
    symphonyPageId: '352700afc30180feb33cc5065a91c0ef',
    symphonyPageUrl:
      'https://app.notion.com/p/352700afc30180feb33cc5065a91c0ef',
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
 * @typedef {object} NotionCodexNotionConfig
 * @property {string} dadetoPageId Dadeto page identifier.
 * @property {string} dadetoPageUrl Dadeto page URL.
 * @property {string} symphonyPageId Symphony page identifier.
 * @property {string} symphonyPageUrl Symphony page URL.
 * @property {string} taskDataSourceUrl Task data source URL.
 * @property {string} taskContext Task context string.
 * @property {string} taskStatus Default task status.
 * @property {string} messageSearchQuery Message search query.
 * @property {string[]} inboxPageIds Inbox page identifiers.
 * @property {string[]} apiTokenEnvNames API token environment names.
 * @property {string} apiVersion Notion API version.
 */

/**
 * @typedef {object} NotionCodexIdleBackoffConfig
 * @property {number} baseDelayMs Base delay in milliseconds.
 * @property {number} initialExponent Initial exponent value.
 * @property {number} maxExponent Maximum exponent value.
 */

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
 * @param {{ resolve: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 * @returns {{
 *   configPath: string,
 *   notion: NotionCodexNotionConfig,
 *   launcher: { command: string, args: string[] },
 *   pollIntervalMs: number,
 *   idleBackoff: NotionCodexIdleBackoffConfig,
 *   maxConcurrentRuns: number,
 *   logDir: string,
 *   outcomeDir: string,
 *   statePath: string
 * }} Normalized Notion Codex poller config.
 */
export function normalizeNotionCodexConfig(
  config,
  repoRoot,
  configPath,
  pathModule
) {
  const source = objectOrEmpty(config);
  const fields = {
    logDir: {
      value: source.logDir,
      fallback: DEFAULT_NOTION_CODEX_CONFIG.logDir,
    },
    outcomeDir: {
      value: source.outcomeDir,
      fallback: DEFAULT_NOTION_CODEX_CONFIG.outcomeDir,
    },
    statePath: {
      value: source.statePath,
      fallback: DEFAULT_NOTION_CODEX_CONFIG.statePath,
    },
  };
  const notion = objectOrEmpty(source.notion);
  const launcher = objectOrEmpty(source.launcher);
  const defaultNotion = DEFAULT_NOTION_CODEX_CONFIG.notion;

  return normalizeConfigWithResolvedPaths({
    rawConfig: source,
    repoRoot,
    configPath,
    pathModule,
    pathFields: fields,
    build: (paths, currentSource, currentConfigPath) => ({
      configPath: currentConfigPath,
      notion: {
        dadetoPageId: normalizeString(
          notion.dadetoPageId,
          defaultNotion.dadetoPageId
        ),
        dadetoPageUrl: normalizeString(
          notion.dadetoPageUrl,
          defaultNotion.dadetoPageUrl
        ),
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
        taskContext: normalizeString(
          notion.taskContext,
          defaultNotion.taskContext
        ),
        taskStatus: normalizeString(
          notion.taskStatus,
          defaultNotion.taskStatus
        ),
        messageSearchQuery: normalizeString(
          notion.messageSearchQuery,
          defaultNotion.messageSearchQuery
        ),
        inboxPageIds: normalizeStringArray(
          notion.inboxPageIds,
          defaultNotion.inboxPageIds
        ),
        apiTokenEnvNames: normalizeStringArray(
          notion.apiTokenEnvNames,
          defaultNotion.apiTokenEnvNames
        ),
        apiVersion: normalizeString(
          notion.apiVersion,
          defaultNotion.apiVersion
        ),
      },
      launcher: {
        command: normalizeString(
          launcher.command,
          DEFAULT_NOTION_CODEX_CONFIG.launcher.command
        ),
        args: normalizeLauncherArgs(launcher.args),
      },
      pollIntervalMs: normalizePositiveNumber(
        currentSource.pollIntervalMs,
        DEFAULT_NOTION_CODEX_CONFIG.pollIntervalMs
      ),
      idleBackoff: normalizeIdleBackoff(currentSource.idleBackoff),
      maxConcurrentRuns: normalizePositiveNumber(
        currentSource.maxConcurrentRuns,
        DEFAULT_NOTION_CODEX_CONFIG.maxConcurrentRuns
      ),
      logDir: paths.logDir,
      outcomeDir: paths.outcomeDir,
      statePath: paths.statePath,
    }),
  });
}

/**
 * Normalize the idle backoff structure.
 * @param {unknown} value Candidate idle backoff value.
 * @returns {NotionCodexIdleBackoffConfig} Normalized idle backoff config.
 */
function normalizeIdleBackoff(value) {
  const source = objectOrEmpty(value);
  const fallback = DEFAULT_NOTION_CODEX_CONFIG.idleBackoff;

  return {
    baseDelayMs: normalizePositiveNumber(
      source.baseDelayMs,
      fallback.baseDelayMs
    ),
    initialExponent: normalizeNonNegativeInteger(
      source.initialExponent,
      fallback.initialExponent
    ),
    maxExponent: normalizeNonNegativeInteger(
      source.maxExponent,
      fallback.maxExponent
    ),
  };
}

/**
 * @param {{ configPath?: string, repoRoot?: string, cwd?: () => string, pathModule?: { resolve: (first: string, ...parts: string[]) => string }, readFileImpl?: (filePath: string, encoding: 'utf8') => Promise<string> }} [options] Load options.
 * @returns {Promise<ReturnType<typeof normalizeNotionCodexConfig>>} Loaded config.
 */
export async function loadNotionCodexConfig(options = {}) {
  return loadNormalizedLocalJsonConfig({
    ...options,
    configPathKey: 'configPath',
    defaultRelativePath: 'tracking/notion-codex.local.json',
    normalize: normalizeNotionCodexConfig,
    onMissing: (repoRoot, configPath, pathModule) =>
      normalizeNotionCodexConfig({}, repoRoot, configPath, pathModule),
  });
}
