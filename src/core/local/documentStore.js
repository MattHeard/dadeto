/* eslint-disable complexity */
import {
  DEFAULT_SEQUENCE,
  extractLevelOneHeading,
  getDraftNumber,
  hasOnlyLevelOneHeading,
  isDraftId,
  normalizeWorkflow,
} from './workflow.js';

/**
 * Create a document store using injected filesystem and workflow dependencies.
 * @param {{
 *   mkdir: (path: string, options: { recursive: boolean }) => Promise<void>,
 *   readFile: (path: string, encoding: string) => Promise<string>,
 *   rm: (path: string, options: { force: boolean }) => Promise<void>,
 *   writeFile: (path: string, data: string, encoding: string) => Promise<void>,
 *   path: {
 *     dirname: (input: string) => string,
 *     join: (...parts: string[]) => string,
 *   },
 *   cwd: () => string,
 *   now?: () => Date,
 * }} deps injected document store dependencies.
 * @param {{
 *   workflowPath?: string,
 *   workflowDir?: string,
 *   legacyDocumentPath?: string,
 * }} [options] Store configuration.
 * @returns {{
 *   workflowPath: string,
 *   loadWorkflow: () => Promise<{
 *     workflowPath: string,
 *     activeIndex: number,
 *     heading: string,
 *     documents: Array<{ id: string, title: string, path: string, content: string }>,
 *   }>,
 *   saveDocument: (documentId: string, content: string) => Promise<{
 *     bytes: number,
 *     savedAt: string,
 *     documentId: string,
 *     path: string,
 *   }>,
 *   moveActiveIndex: (direction: number) => Promise<{
 *     workflowPath: string,
 *     activeIndex: number,
 *     heading: string,
 *     documents: Array<{ id: string, title: string, path: string, content: string }>,
 *   }>,
 *   setActiveIndex: (nextIndex: number) => Promise<{
 *     workflowPath: string,
 *     activeIndex: number,
 *     heading: string,
 *     documents: Array<{ id: string, title: string, path: string, content: string }>,
 *   }>,
 * }} Document store with persistence methods.
 */
export function createDocumentStoreCore(deps, options = {}) {
  const state = createDocumentStoreState(deps, options);

  return {
    workflowPath: state.workflowPath,
    loadWorkflow: () => loadWorkflow(state),
    saveDocument: (documentId, content) =>
      saveDocument(state, documentId, content),
    moveActiveIndex: direction => moveActiveIndex(state, direction),
    setActiveIndex: nextIndex => setActiveIndex(state, nextIndex),
  };
}

/**
 * Build the store state from injected dependencies and options.
 * @param {{
 *   mkdir: (path: string, options: { recursive: boolean }) => Promise<void>,
 *   readFile: (path: string, encoding: string) => Promise<string>,
 *   rm: (path: string, options: { force: boolean }) => Promise<void>,
 *   writeFile: (path: string, data: string, encoding: string) => Promise<void>,
 *   path: {
 *     dirname: (input: string) => string,
 *     join: (...parts: string[]) => string,
 *   },
 *   cwd: () => string,
 *   now?: () => Date,
 * }} deps injected document store dependencies.
 * @param {{
 *   workflowPath?: string,
 *   workflowDir?: string,
 *   legacyDocumentPath?: string,
 * }} options store configuration.
 * @returns {{
 *   workflowPath: string,
 *   workflowDir: string,
 *   documentDir: string,
 *   legacyDocumentPath: string,
 *   defaultSequence: Array<{ id: string, title: string }>,
 *   now: () => Date,
 *   deps: typeof deps,
 * }} Store state derived from the injected dependencies and options.
 */
function createDocumentStoreState(deps, options) {
  const workflowPath = resolveWorkflowPath(deps, options);
  const workflowDir = resolveWorkflowDir(deps, options, workflowPath);
  return {
    workflowPath,
    workflowDir,
    documentDir: deps.path.join(workflowDir, 'documents'),
    legacyDocumentPath: resolveLegacyDocumentPath(deps, options),
    now: deps.now ?? (() => new Date()),
    deps,
  };
}

/**
 * Resolve the workflow JSON path.
 * @param {Pick<Parameters<typeof createDocumentStoreCore>[0], 'cwd' | 'path'>} deps injected dependencies.
 * @param {{ workflowPath?: string }} options store configuration.
 * @returns {string} Workflow JSON path.
 */
function resolveWorkflowPath(deps, options) {
  return (
    options.workflowPath ??
    deps.path.join(deps.cwd(), 'local-data', 'writer-workflow', 'workflow.json')
  );
}

/**
 * Resolve the workflow directory.
 * @param {Pick<Parameters<typeof createDocumentStoreCore>[0], 'cwd' | 'path'>} deps injected dependencies.
 * @param {{ workflowDir?: string }} options store configuration.
 * @param {string} workflowPath resolved workflow path.
 * @returns {string} Workflow directory.
 */
function resolveWorkflowDir(deps, options, workflowPath) {
  return options.workflowDir ?? deps.path.dirname(workflowPath);
}

/**
 * Resolve the legacy markdown path.
 * @param {Pick<Parameters<typeof createDocumentStoreCore>[0], 'cwd' | 'path'>} deps injected dependencies.
 * @param {{ legacyDocumentPath?: string }} options store configuration.
 * @returns {string} Legacy markdown path.
 */
function resolveLegacyDocumentPath(deps, options) {
  return (
    options.legacyDocumentPath ??
    deps.path.join(deps.cwd(), 'local-data', 'writer.md')
  );
}

/**
 * Read a file as UTF-8 text, returning an empty string when it does not exist.
 * @param {{ readFile: (path: string, encoding: string) => Promise<string> }} deps injected dependencies.
 * @param {string} filePath File path to read.
 * @returns {Promise<string>} File contents or empty string.
 */
async function readText(deps, filePath) {
  try {
    return await deps.readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return '';
    }
    throw error;
  }
}

/**
 * Check whether a filesystem error is an ENOENT.
 * @param {unknown} error Error to inspect.
 * @returns {boolean} True when the file is missing.
 */
function isMissingFileError(error) {
  return Boolean(error && error.code === 'ENOENT');
}

/**
 * Write the normalized workflow to disk.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {object} workflow Normalized workflow.
 * @returns {Promise<void>} Nothing.
 */
async function writeWorkflow(state, workflow) {
  await state.deps.mkdir(state.workflowDir, { recursive: true });
  await state.deps.writeFile(
    state.workflowPath,
    JSON.stringify(workflow, null, 2),
    'utf8'
  );
}

/**
 * Compute the file path for a workflow step.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ id: string }} step Workflow step.
 * @returns {string} Document path.
 */
function getDocumentPath(state, step) {
  return state.deps.path.join(state.documentDir, `${step.id}.md`);
}

/**
 * Normalize or bootstrap a workflow.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @returns {Promise<{ steps: Array<{ id: string, title: string }>, activeIndex: number, heading: string }>} Workflow.
 */
async function ensureWorkflow(state) {
  const storedWorkflow = await readStoredWorkflow(state);
  if (storedWorkflow) {
    return storedWorkflow;
  }

  return bootstrapWorkflow(state);
}

/**
 * Read a stored workflow from disk, if present.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @returns {Promise<{ steps: Array<{ id: string, title: string }>, activeIndex: number, heading: string } | null>} Workflow or null.
 */
async function readStoredWorkflow(state) {
  try {
    const rawWorkflow = await state.deps.readFile(state.workflowPath, 'utf8');
    return normalizeWorkflow(JSON.parse(rawWorkflow));
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Bootstrap the workflow from the legacy writer document.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @returns {Promise<{ steps: Array<{ id: string, title: string }>, activeIndex: number, heading: string }>} Normalized workflow.
 */
async function bootstrapWorkflow(state) {
  const legacyContent = await readText(state.deps, state.legacyDocumentPath);
  const workflow = normalizeWorkflow({
    heading: extractLevelOneHeading(legacyContent),
  });

  await state.deps.mkdir(state.documentDir, { recursive: true });
  await writeLegacyContent(state, workflow, legacyContent);
  await writeWorkflow(state, workflow);

  return workflow;
}

/**
 * Write initial content to the workflow documents.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }> }} workflow Normalized workflow.
 * @param {string} legacyContent Legacy markdown content.
 * @returns {Promise<void>} Nothing.
 */
async function writeLegacyContent(state, workflow, legacyContent) {
  const firstStep = workflow.steps[0];
  if (!legacyContent || !firstStep) {
    return;
  }

  await state.deps.writeFile(
    getDocumentPath(state, firstStep),
    legacyContent,
    'utf8'
  );
}

/**
 * Read the current content of a workflow step.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ id: string }} step Workflow step.
 * @returns {Promise<string>} Step content.
 */
async function loadStepContent(state, step) {
  return readText(state.deps, getDocumentPath(state, step));
}

/**
 * Prune empty trailing drafts and renumber remaining drafts.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex: number }} workflow Workflow to mutate.
 * @returns {Promise<void>} Nothing.
 */
async function pruneWorkflow(state, workflow) {
  await state.deps.mkdir(state.documentDir, { recursive: true });

  const prunedWorkflow = await pruneTrailingDrafts(state, workflow);
  renumberDraftSteps(state, prunedWorkflow);
  clampActiveIndex(prunedWorkflow);
}

/**
 * Remove empty trailing drafts from the workflow.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex: number }} workflow Workflow to mutate.
 * @returns {Promise<{ steps: Array<{ id: string, title: string }>, activeIndex: number }>} Updated workflow.
 */
export async function pruneTrailingDrafts(state, workflow) {
  while (canPruneTrailingDraft(state, workflow)) {
    const lastStep = workflow.steps.at(-1);
    const content = await loadStepContent(state, lastStep);
    if (shouldKeepStepContent(state, content)) {
      return workflow;
    }

    await state.deps.rm(getDocumentPath(state, lastStep), { force: true });
    workflow.steps.pop();
  }

  return workflow;
}

/**
 * Determine whether the last step is eligible for pruning.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex: number }} workflow Workflow to inspect.
 * @returns {boolean} True when another trailing draft may be removed.
 */
export function canPruneTrailingDraft(state, workflow) {
  if (workflow.steps.length <= DEFAULT_SEQUENCE.length) {
    return false;
  }

  if (workflow.steps.length - 1 <= workflow.activeIndex) {
    return false;
  }

  const lastStep = workflow.steps.at(-1);
  return Boolean(lastStep && isDraftId(lastStep.id));
}

/**
 * Decide whether draft content should be kept on disk.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {string} content Step content.
 * @returns {boolean} True when the content should not be removed.
 */
export function shouldKeepStepContent(state, content) {
  return content.trim() && !hasOnlyLevelOneHeading(content);
}

/**
 * Renumber draft steps sequentially.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }> }} workflow Workflow to mutate.
 * @returns {void} Nothing.
 */
export function renumberDraftSteps(state, workflow) {
  const draftSteps = workflow.steps.filter(step => isDraftId(step.id));

  draftSteps.forEach((step, index) => {
    const nextNumber = index + 1;
    if (getDraftNumber(step) !== nextNumber) {
      step.id = `draft-${nextNumber}`;
      step.title = `Draft ${nextNumber}`;
    }
  });
}

/**
 * Clamp the active index to the available step range.
 * @param {{ steps: Array<unknown>, activeIndex: number }} workflow Workflow to mutate.
 * @returns {void} Nothing.
 */
function clampActiveIndex(workflow) {
  workflow.activeIndex = Math.min(
    workflow.activeIndex,
    Math.max(0, workflow.steps.length - 1)
  );
}

/**
 * Build the serialized workflow response.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex: number, heading: string }} workflow Workflow to serialize.
 * @returns {Promise<{
 *   workflowPath: string,
 *   activeIndex: number,
 *   heading: string,
 *   documents: Array<{ id: string, title: string, path: string, content: string }>,
 * }>} Serialized workflow response.
 */
async function serializeWorkflow(state, workflow) {
  const documents = await Promise.all(
    workflow.steps.map(async step => ({
      id: step.id,
      title: step.title,
      path: getDocumentPath(state, step),
      content: await loadStepContent(state, step),
    }))
  );

  return {
    workflowPath: state.workflowPath,
    activeIndex: workflow.activeIndex,
    heading: workflow.heading,
    documents,
  };
}

/**
 * Load the current workflow response.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @returns {Promise<{
 *   workflowPath: string,
 *   activeIndex: number,
 *   heading: string,
 *   documents: Array<{ id: string, title: string, path: string, content: string }>,
 * }>} Workflow response.
 */
async function loadWorkflow(state) {
  const workflow = await ensureWorkflow(state);
  await pruneWorkflow(state, workflow);
  await writeWorkflow(state, workflow);
  return serializeWorkflow(state, workflow);
}

/**
 * Save document content and update the workflow.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {string} documentId Document identifier.
 * @param {string} content Document content.
 * @returns {Promise<{ bytes: number, savedAt: string, documentId: string, path: string }>} Save result.
 */
async function saveDocument(state, documentId, content) {
  const workflow = await ensureWorkflow(state);
  const step = workflow.steps.find(candidate => candidate.id === documentId);

  if (!step) {
    throw new Error(`Unknown document id: ${documentId}`);
  }

  const nextHeading = extractLevelOneHeading(content);
  if (nextHeading) {
    workflow.heading = nextHeading;
  }

  await state.deps.mkdir(state.documentDir, { recursive: true });
  if (content.trim()) {
    await state.deps.writeFile(getDocumentPath(state, step), content, 'utf8');
  } else {
    await state.deps.rm(getDocumentPath(state, step), { force: true });
  }
  await pruneWorkflow(state, workflow);
  await writeWorkflow(state, workflow);

  return {
    bytes: Buffer.byteLength(content, 'utf8'),
    savedAt: state.now().toISOString(),
    documentId,
    path: getDocumentPath(state, step),
  };
}

/**
 * Move the active index and append a draft when moving past the end.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {number} direction Movement direction.
 * @returns {Promise<{
 *   workflowPath: string,
 *   activeIndex: number,
 *   heading: string,
 *   documents: Array<{ id: string, title: string, path: string, content: string }>,
 * }>} Updated workflow response.
 */
async function moveActiveIndex(state, direction) {
  const workflow = await ensureWorkflow(state);
  if (shouldAppendDraft(state, workflow, direction)) {
    appendDraftStep(state, workflow);
  }

  workflow.activeIndex = clampIndex(
    workflow.activeIndex + direction,
    workflow.steps.length
  );
  await pruneWorkflow(state, workflow);
  await writeWorkflow(state, workflow);

  return serializeWorkflow(state, workflow);
}

/**
 * Update the active index without appending a new draft.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {number} nextIndex Desired active index.
 * @returns {Promise<{
 *   workflowPath: string,
 *   activeIndex: number,
 *   heading: string,
 *   documents: Array<{ id: string, title: string, path: string, content: string }>,
 * }>} Updated workflow response.
 */
async function setActiveIndex(state, nextIndex) {
  const workflow = await ensureWorkflow(state);
  workflow.activeIndex = clampIndex(nextIndex, workflow.steps.length);
  await pruneWorkflow(state, workflow);
  await writeWorkflow(state, workflow);

  return serializeWorkflow(state, workflow);
}

/**
 * Determine whether moving right should append a draft.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex: number }} workflow Workflow to inspect.
 * @param {number} direction Movement direction.
 * @returns {boolean} True when a new draft should be appended.
 */
function shouldAppendDraft(state, workflow, direction) {
  if (direction <= 0) {
    return false;
  }

  if (workflow.activeIndex !== workflow.steps.length - 1) {
    return false;
  }

  const lastStep = workflow.steps.at(-1);
  return Boolean(lastStep && isDraftId(lastStep.id));
}

/**
 * Append the next draft step.
 * @param {ReturnType<typeof createDocumentStoreState>} state Store state.
 * @param {{ steps: Array<{ id: string, title: string }> }} workflow Workflow to mutate.
 * @returns {void} Nothing.
 */
function appendDraftStep(state, workflow) {
  const nextDraftNumber =
    workflow.steps.filter(step => isDraftId(step.id)).length + 1;
  workflow.steps.push({
    id: `draft-${nextDraftNumber}`,
    title: `Draft ${nextDraftNumber}`,
  });
}

/**
 * Clamp an index to the available step range.
 * @param {number} index Requested index.
 * @param {number} length Step count.
 * @returns {number} Valid index.
 */
function clampIndex(index, length) {
  return Math.min(Math.max(index, 0), Math.max(0, length - 1));
}
/* eslint-enable complexity */
