import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDocumentStoreCore } from '../core/local/documentStore.js';

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
 * @param {{ workflowPath?: string, workflowDir?: string, legacyDocumentPath?: string }} [options]
 */
export function createDocumentStore(options = {}) {
  return createDocumentStoreCore(
    {
      mkdir,
      readFile,
      rm,
      writeFile,
      path,
      cwd: () => process.cwd(),
    },
    options
  );
}
