import path from 'node:path';
import { readFile } from 'node:fs/promises';

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

/**
 * @param {string} content Raw workflow markdown content.
 * @returns {{
 *   exists: true,
 *   lineCount: number,
 *   allowedCommandFamilies: string[],
 *   requiredQualityGates: string[],
 *   handoffRequirements: string[]
 * }} Summary for the local Symphony operator surface.
 */
export function summarizeWorkflow(content) {
  const lines = toTrimmedLines(content);

  return {
    exists: true,
    lineCount: content.split('\n').length,
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
        allowedCommandFamilies: [],
        requiredQualityGates: [],
        handoffRequirements: [],
      };
    }

    throw error;
  }
}
