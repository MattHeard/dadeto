import { resolveLocalConfigLoader } from '../config-utils.js';

const PROMPT_TEMPLATE_KEY = 'prompt_template';

/**
 * Count the number of lines in a block of text.
 * @param {string} content Text content to measure.
 * @returns {number} Number of lines in the content.
 */
function toLineCount(content) {
  return content.split('\n').length;
}

/**
 * Split text into trimmed, non-empty lines.
 * @param {string} content Text content to trim and split.
 * @returns {string[]} Trimmed, non-empty lines.
 */
function toTrimmedLines(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

/**
 * Collect bullet items that follow a heading.
 * @param {string[]} lines Trimmed lines from the workflow document.
 * @param {string} heading Heading to collect bullet items under.
 * @returns {string[]} Bullet items after the heading.
 */
function collectBullets(lines, heading) {
  const sectionIndex = lines.findIndex(line => line === heading);
  if (sectionIndex === -1) {
    return [];
  }

  const items = [];
  for (const line of lines.slice(sectionIndex + 1)) {
    if (line.startsWith('#')) {
      break;
    }

    if (line.startsWith('- ')) {
      items.push(line.slice(2).trim());
    }
  }

  return items;
}

/**
 * Normalize a front-matter scalar value.
 * @param {string} value Raw front-matter value text.
 * @returns {string | number | boolean} Normalized scalar value.
 */
function normalizeFrontMatterValue(value) {
  const trimmedValue = value.trim();
  if (trimmedValue === 'true') {
    return true;
  }

  if (trimmedValue === 'false') {
    return false;
  }

  if (/^-?\d+$/.test(trimmedValue)) {
    return Number.parseInt(trimmedValue, 10);
  }

  if (/^-?\d+\.\d+$/.test(trimmedValue)) {
    return Number.parseFloat(trimmedValue);
  }

  return trimmedValue;
}

/**
 * Parse a single front-matter line.
 * @param {string} line Front-matter line to parse.
 * @returns {{ key: string, value: string | number | boolean } | null} Parsed key/value pair or null.
 */
function parseFrontMatterLine(line) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }

  const key = line.slice(0, separatorIndex).trim();
  if (key.length === 0) {
    return null;
  }

  return {
    key,
    value: normalizeFrontMatterValue(line.slice(separatorIndex + 1)),
  };
}

/**
 * Parse the optional YAML-like front matter block from a workflow document.
 * @param {string} content Workflow document content.
 * @returns {{ config: Record<string, string | number | boolean>, body: string }} Parsed front matter and remaining body.
 */
function parseFrontMatter(content) {
  if (!content.startsWith('---\n')) {
    return { config: {}, body: content };
  }

  const frontMatterEndIndex = content.indexOf('\n---\n', 4);
  if (frontMatterEndIndex === -1) {
    return { config: {}, body: content };
  }

  const frontMatterBlock = content.slice(4, frontMatterEndIndex);
  const config =
    /** @type {{ [key: string]: string | number | boolean }} */ ({});
  for (const line of frontMatterBlock.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }

    const parsedLine = parseFrontMatterLine(trimmedLine);
    if (!parsedLine) {
      continue;
    }

    config[parsedLine.key] = parsedLine.value;
  }

  return {
    config,
    body: content.slice(frontMatterEndIndex + '\n---\n'.length),
  };
}

/**
 * @param {string} content Raw workflow markdown content.
 * @returns {{
 *   exists: true,
 *   lineCount: number,
 *   config: Record<string, string | number | boolean>,
 *   prompt_template: string,
 *   allowedCommandFamilies: string[],
 *   requiredQualityGates: string[],
 *   handoffRequirements: string[]
 * }} Summary for the local Symphony operator surface.
 */
export function summarizeWorkflow(content) {
  const lineCount = toLineCount(content);
  const { config, body } = parseFrontMatter(content);
  const promptTemplate = body.trim();
  const lines = toTrimmedLines(promptTemplate);

  return {
    exists: true,
    lineCount,
    config,
    [PROMPT_TEMPLATE_KEY]: promptTemplate,
    allowedCommandFamilies: collectBullets(
      lines,
      '## Allowed command families'
    ),
    requiredQualityGates: collectBullets(lines, '## Required quality gates'),
    handoffRequirements: collectBullets(lines, '## Handoff requirements'),
  };
}

/**
 * Determine whether a workflow read failed because the file does not exist.
 * @param {unknown} error Read error candidate.
 * @returns {boolean} True when the workflow file is missing.
 */
function isMissingWorkflowError(error) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      /** @type {{ code?: unknown }} */ (error).code === 'ENOENT'
  );
}

/**
 * Build the fallback response for a missing workflow file.
 * @param {string} workflowPath Resolved workflow file path.
 * @returns {{
 *   path: string,
 *   exists: false,
 *   lineCount: number,
 *   config: Record<string, never>,
 *   prompt_template: string,
 *   allowedCommandFamilies: string[],
 *   requiredQualityGates: string[],
 *   handoffRequirements: string[]
 * }} Missing workflow scaffold response.
 */
function createMissingWorkflowResult(workflowPath) {
  return {
    path: workflowPath,
    exists: false,
    lineCount: 0,
    config: {},
    [PROMPT_TEMPLATE_KEY]: '',
    allowedCommandFamilies: [],
    requiredQualityGates: [],
    handoffRequirements: [],
  };
}

/**
 * @param {{ workflowPath?: string, repoRoot?: string, cwd?: () => string, pathModule?: { resolve: (first: string, ...parts: string[]) => string }, readFileImpl?: (filePath: string, encoding: 'utf8') => Promise<string> }} [options] Optional workflow file resolution overrides.
 * @returns {Promise<{
 *   path: string,
 *   exists: boolean,
 *   lineCount: number,
 *   config: Record<string, string | number | boolean>,
 *   prompt_template: string,
 *   allowedCommandFamilies: string[],
 *   requiredQualityGates: string[],
 *   handoffRequirements: string[]
 * }>} Workflow load result for the local Symphony scaffold.
 */
export async function loadSymphonyWorkflow(options = {}) {
  const { filePath: workflowPath, readFileImpl } = resolveLocalConfigLoader(
    options,
    'workflowPath',
    'WORKFLOW.md'
  );

  try {
    const content = await readFileImpl(workflowPath, 'utf8');
    return {
      path: workflowPath,
      ...summarizeWorkflow(content),
    };
  } catch (error) {
    if (isMissingWorkflowError(error)) {
      return createMissingWorkflowResult(workflowPath);
    }

    throw error;
  }
}
