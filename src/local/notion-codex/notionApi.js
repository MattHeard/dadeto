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
 * }} options Append options.
 * @returns {Promise<unknown>} Notion API response payload.
 */
export async function appendNotionCodexReply(options) {
  const pageId = normalizeRequiredString(options.pageId, 'pageId');
  const runId = normalizeRequiredString(options.runId, 'runId');
  const message = normalizeRequiredString(options.message, 'message');
  const token = normalizeRequiredString(options.token, 'token');
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to call the Notion API.');
  }

  const response = await fetchImpl(
    `${NOTION_API_BASE_URL}/blocks/${encodeURIComponent(pageId)}/children`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': options.notionVersion ?? DEFAULT_NOTION_VERSION,
      },
      body: JSON.stringify({
        children: buildReplyBlocks({ runId, message }),
        position: { type: 'end' },
      }),
    }
  );

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
 * @returns {Array<Record<string, unknown>>} Notion blocks.
 */
export function buildReplyBlocks(options) {
  return [
    { object: 'block', type: 'divider', divider: {} },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [
          {
            type: 'text',
            text: { content: `Codex reply ${options.runId}` },
          },
        ],
      },
    },
    ...splitRichText(options.message).map(richText => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: richText },
          },
        ],
      },
    })),
  ];
}

function normalizeRequiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

function normalizeTokenEnvNames(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_TOKEN_ENV_NAMES];
  }

  const names = value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  return names.length ? names : [...DEFAULT_TOKEN_ENV_NAMES];
}

function splitRichText(value) {
  const trimmed = value.trim();
  const chunks = [];
  for (let index = 0; index < trimmed.length; index += RICH_TEXT_CHUNK_SIZE) {
    chunks.push(trimmed.slice(index, index + RICH_TEXT_CHUNK_SIZE));
  }

  return chunks.length ? chunks : [''];
}

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

function buildNotionApiError(status, body) {
  if (body && typeof body === 'object') {
    const message = typeof body.message === 'string' ? body.message : null;
    const code = typeof body.code === 'string' ? body.code : null;
    return `Notion API request failed with HTTP ${status}: ${[
      code,
      message,
    ].filter(Boolean).join(' - ')}`;
  }

  return `Notion API request failed with HTTP ${status}: ${String(body)}`;
}
