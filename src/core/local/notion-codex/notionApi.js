import { normalizeStringArray } from './valueHelpers.js';
const DEFAULT_NOTION_VERSION = '2026-03-11';
const DEFAULT_TOKEN_ENV_NAMES = ['NOTION_API_KEY', 'NOTION_TOKEN'];
const NOTION_API_BASE_URL = 'https://api.notion.com/v1';
const RICH_TEXT_CHUNK_SIZE = 1800;

/**
 * @param {{
 *   pageId: string,
 *   runId: string,
 *   message: string,
 *   token: string,
 *   notionVersion?: string,
 *   fetchImpl?: typeof fetch
 * }} options Comment options.
 * @returns {Promise<unknown>} Notion API response payload.
 */
export async function appendNotionCodexReply(options) {
  const pageId = normalizeRequiredString(options.pageId, 'pageId');
  const runId = normalizeRequiredString(options.runId, 'runId');
  const message = normalizeRequiredString(options.message, 'message');
  const token = normalizeRequiredString(options.token, 'token');
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'A fetch implementation is required to call the Notion API.'
    );
  }

  const response = await fetchImpl(`${NOTION_API_BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': options.notionVersion ?? DEFAULT_NOTION_VERSION,
    },
    body: JSON.stringify(buildReplyPayload({ pageId, runId, message })),
  });

  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(buildNotionApiError(response.status, body));
  }

  return body;
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   tokenEnvNames?: string[]
 * }} [options] Token resolution options.
 * @returns {{ token: string, envName: string }} Resolved token.
 */
export function resolveNotionApiToken(options = {}) {
  const env = options.env ?? process.env;
  const tokenEnvNames = normalizeTokenEnvNames(options.tokenEnvNames);

  for (const envName of tokenEnvNames) {
    const value = env[envName];
    if (typeof value === 'string' && value.trim()) {
      return {
        envName,
        token: value.trim(),
      };
    }
  }

  throw new Error(
    `Missing Notion API token. Set one of: ${tokenEnvNames.join(', ')}.`
  );
}

/**
 * @param {{ runId: string, message: string }} options Reply content.
 * @returns {Array<Record<string, unknown>>} Notion rich text objects.
 */
export function buildReplyRichText(options) {
  const comment = `Codex reply ${options.runId}\n\n${options.message}`;
  return splitRichText(comment).map(richText => ({
    type: 'text',
    text: { content: richText },
  }));
}

/**
 * Normalize a required string value.
 * @param {unknown} value Candidate value.
 * @param {string} name Parameter name.
 * @returns {string} Trimmed string value.
 */
function normalizeRequiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

/**
 * Normalize the configured Notion token environment names.
 * @param {unknown} value Candidate token environment names.
 * @returns {string[]} Normalized environment names.
 */
function normalizeTokenEnvNames(value) {
  return normalizeStringArray(value, DEFAULT_TOKEN_ENV_NAMES);
}

/**
 * Split rich text into Notion payload chunks.
 * @param {string} value Rich text source.
 * @returns {string[]} Content chunks.
 */
function splitRichText(value) {
  const trimmed = value.trim();
  const chunks = [];
  for (let index = 0; index < trimmed.length; index += RICH_TEXT_CHUNK_SIZE) {
    chunks.push(trimmed.slice(index, index + RICH_TEXT_CHUNK_SIZE));
  }

  return chunks;
}

/**
 * Read a JSON response body while tolerating empty and non-JSON payloads.
 * @param {Response} response Fetch response.
 * @returns {Promise<unknown>} Parsed body or raw text.
 */
async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Render a Notion API failure message.
 * @param {number} status HTTP status code.
 * @param {unknown} body Response body.
 * @returns {string} Failure message.
 */
function buildNotionApiError(status, body) {
  if (body && typeof body === 'object') {
    let message = null;
    if (typeof body.message === 'string') {
      message = body.message;
    }

    let code = null;
    if (typeof body.code === 'string') {
      code = body.code;
    }

    const details = [code, message].filter(Boolean).join(' - ');
    return `Notion API request failed with HTTP ${status}: ${details}`;
  }

  return `Notion API request failed with HTTP ${status}: ${String(body)}`;
}

/**
 * Build the request payload for the Notion comment endpoint.
 * @param {{ pageId: string, runId: string, message: string }} options Payload options.
 * @returns {Record<string, unknown>} Request payload.
 */
function buildReplyPayload(options) {
  const payload = {
    parent: {},
  };

  Object.assign(payload.parent, { ['page_id']: options.pageId });
  Object.assign(payload, {
    ['rich_text']: buildReplyRichText({
      runId: options.runId,
      message: options.message,
    }),
  });

  return payload;
}
