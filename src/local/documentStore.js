import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_SEQUENCE,
  extractLevelOneHeading,
  getDraftNumber,
  hasOnlyLevelOneHeading,
  isDraftId,
  normalizeWorkflow,
} from '../core/local/workflow.js';

export const DEFAULT_WORKFLOW_DIR = path.resolve(
  process.cwd(),
  'local-data',
  'writer-workflow'
);

export const DEFAULT_WORKFLOW_PATH = path.join(
  DEFAULT_WORKFLOW_DIR,
  'workflow.json'
);

export const LEGACY_DOCUMENT_PATH = path.resolve(
  process.cwd(),
  'local-data',
  'writer.md'
);

/**
 * @param {string} id
 */
function getDocumentFilename(id) {
  return `${id}.md`;
}

/**
 * @param {string} documentDir
 * @param {{ id: string }} step
 */
function getDocumentPath(documentDir, step) {
  return path.join(documentDir, getDocumentFilename(step.id));
}

/**
 * @param {{ workflowPath?: string, workflowDir?: string, legacyDocumentPath?: string }} [options]
 */
export function createDocumentStore(options = {}) {
  const workflowPath = options.workflowPath ?? DEFAULT_WORKFLOW_PATH;
  const workflowDir = options.workflowDir ?? path.dirname(workflowPath);
  const documentDir = path.join(workflowDir, 'documents');
  const legacyDocumentPath =
    options.legacyDocumentPath ?? LEGACY_DOCUMENT_PATH;

  async function readText(filePath) {
    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  async function writeWorkflow(workflow) {
    await mkdir(workflowDir, { recursive: true });
    await writeFile(workflowPath, JSON.stringify(workflow, null, 2), 'utf8');
  }

  async function ensureWorkflow() {
    try {
      const rawWorkflow = await readFile(workflowPath, 'utf8');
      return normalizeWorkflow(JSON.parse(rawWorkflow));
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }

    const legacyContent = await readText(legacyDocumentPath);
    const workflow = normalizeWorkflow({
      heading: extractLevelOneHeading(legacyContent),
    });

    await mkdir(documentDir, { recursive: true });
    await Promise.all(
      workflow.steps.map(async (step, index) => {
        const initialContent = index === 0 ? legacyContent : '';
        if (initialContent) {
          await writeFile(
            getDocumentPath(documentDir, step),
            initialContent,
            'utf8'
          );
        }
      })
    );
    await writeWorkflow(workflow);

    return workflow;
  }

  async function loadStepContent(step) {
    return readText(getDocumentPath(documentDir, step));
  }

  async function pruneEmptyTrailingDrafts(workflow) {
    await mkdir(documentDir, { recursive: true });

    while (
      workflow.steps.length > DEFAULT_SEQUENCE.length &&
      workflow.steps.length - 1 > workflow.activeIndex
    ) {
      const lastStep = workflow.steps.at(-1);
      if (!lastStep || !isDraftId(lastStep.id)) {
        break;
      }

      const content = await loadStepContent(lastStep);
      if (content.trim() && !hasOnlyLevelOneHeading(content)) {
        break;
      }

      await rm(getDocumentPath(documentDir, lastStep), { force: true });
      workflow.steps.pop();
    }

    const draftSteps = workflow.steps.filter(step => isDraftId(step.id));
    draftSteps.forEach((step, index) => {
      const nextNumber = index + 1;
      if (getDraftNumber(step) !== nextNumber) {
        step.id = `draft-${nextNumber}`;
        step.title = `Draft ${nextNumber}`;
      }
    });

    workflow.activeIndex = Math.min(
      workflow.activeIndex,
      Math.max(0, workflow.steps.length - 1)
    );
  }

  async function serializeWorkflow(workflow) {
    const documents = await Promise.all(
      workflow.steps.map(async step => ({
        id: step.id,
        title: step.title,
        path: getDocumentPath(documentDir, step),
        content: await loadStepContent(step),
      }))
    );

    return {
      workflowPath,
      activeIndex: workflow.activeIndex,
      heading: workflow.heading,
      documents,
    };
  }

  return {
    workflowPath,
    async loadWorkflow() {
      const workflow = await ensureWorkflow();
      await pruneEmptyTrailingDrafts(workflow);
      await writeWorkflow(workflow);
      return serializeWorkflow(workflow);
    },
    async saveDocument(documentId, content) {
      const workflow = await ensureWorkflow();
      const step = workflow.steps.find(candidate => candidate.id === documentId);

      if (!step) {
        throw new Error(`Unknown document id: ${documentId}`);
      }

      const nextHeading = extractLevelOneHeading(content);
      if (nextHeading) {
        workflow.heading = nextHeading;
      }

      await mkdir(documentDir, { recursive: true });
      if (content.trim()) {
        await writeFile(getDocumentPath(documentDir, step), content, 'utf8');
      } else {
        await rm(getDocumentPath(documentDir, step), { force: true });
      }
      await pruneEmptyTrailingDrafts(workflow);
      await writeWorkflow(workflow);

      return {
        bytes: Buffer.byteLength(content, 'utf8'),
        savedAt: new Date().toISOString(),
        documentId,
        path: getDocumentPath(documentDir, step),
      };
    },
    async moveActiveIndex(direction) {
      const workflow = await ensureWorkflow();
      let nextIndex = workflow.activeIndex + direction;

      if (direction > 0 && workflow.activeIndex === workflow.steps.length - 1) {
        const lastStep = workflow.steps.at(-1);
        if (lastStep && isDraftId(lastStep.id)) {
          const nextDraftNumber = workflow.steps.filter(step =>
            isDraftId(step.id)
          ).length + 1;
          const newStep = {
            id: `draft-${nextDraftNumber}`,
            title: `Draft ${nextDraftNumber}`,
          };
          workflow.steps.push(newStep);
        }
      }

      nextIndex = Math.min(
        Math.max(nextIndex, 0),
        Math.max(0, workflow.steps.length - 1)
      );
      workflow.activeIndex = nextIndex;
      await pruneEmptyTrailingDrafts(workflow);
      await writeWorkflow(workflow);

      return serializeWorkflow(workflow);
    },
    async setActiveIndex(nextIndex) {
      const workflow = await ensureWorkflow();
      workflow.activeIndex = Math.min(
        Math.max(nextIndex, 0),
        Math.max(0, workflow.steps.length - 1)
      );
      await pruneEmptyTrailingDrafts(workflow);
      await writeWorkflow(workflow);

      return serializeWorkflow(workflow);
    },
  };
}
