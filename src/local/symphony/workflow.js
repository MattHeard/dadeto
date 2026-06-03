import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  loadSymphonyWorkflow as loadSymphonyWorkflowCore,
  summarizeWorkflow,
} from '../../core/local/symphony/workflow.js';

export function loadSymphonyWorkflow(options = {}) {
  return loadSymphonyWorkflowCore({
    ...options,
    cwd: options.cwd ?? (() => process.cwd()),
    pathModule: path,
    readFileImpl: options.readFileImpl ?? readFile,
  });
}

export { summarizeWorkflow };
