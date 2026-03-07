import path from 'node:path';
import { readFile } from 'node:fs/promises';

function toLineCount(content) {
  return content.split('\n').length;
}

function toTrimmedLines(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

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

function parseFrontMatter(content) {
  if (!content.startsWith('---\n')) {
    return { config: {}, body: content };
  }

  const frontMatterEndIndex = content.indexOf('\n---\n', 4);
  if (frontMatterEndIndex === -1) {
    return { config: {}, body: content };
  }

  const frontMatterBlock = content.slice(4, frontMatterEndIndex);
  const config = {};
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
    prompt_template: promptTemplate,
    allowedCommandFamilies: collectBullets(lines, '## Allowed command families'),
    requiredQualityGates: collectBullets(lines, '## Required quality gates'),
    handoffRequirements: collectBullets(lines, '## Handoff requirements'),
  };
}

/**
 * @param {{ workflowPath?: string, repoRoot?: string, readFileImpl?: typeof readFile }} [options]
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
  const repoRoot = options.repoRoot ?? process.cwd();
  const workflowPath = path.resolve(repoRoot, options.workflowPath ?? 'WORKFLOW.md');
  const readFileImpl = options.readFileImpl ?? readFile;

  try {
    const content = await readFileImpl(workflowPath, 'utf8');
    return {
      path: workflowPath,
      ...summarizeWorkflow(content),
    };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        path: workflowPath,
        exists: false,
        lineCount: 0,
        config: {},
        prompt_template: '',
        allowedCommandFamilies: [],
        requiredQualityGates: [],
        handoffRequirements: [],
      };
    }

    throw error;
  }
}
