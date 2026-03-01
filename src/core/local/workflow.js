export const DEFAULT_SEQUENCE = [
  { id: 'thesis', title: 'Thesis' },
  { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
  { id: 'outline', title: 'Outline' },
  { id: 'draft-1', title: 'Draft 1' },
];

/**
 * Clone a workflow step so callers can mutate the result safely.
 * @param {{ id: string, title: string }} step - Workflow step to copy.
 * @returns {{ id: string, title: string }} Copied workflow step.
 */
export function cloneStep(step) {
  return {
    id: step.id,
    title: step.title,
  };
}

/**
 * Determine whether a workflow identifier is a numbered draft id.
 * @param {string} id - Workflow document identifier.
 * @returns {boolean} True when the id matches the `draft-N` pattern.
 */
export function isDraftId(id) {
  return /^draft-\d+$/.test(id);
}

/**
 * Extract the numeric suffix from a draft step id.
 * @param {{ id: string }} step - Workflow step with a draft id.
 * @returns {number} Parsed draft number.
 */
export function getDraftNumber(step) {
  return Number.parseInt(step.id.replace('draft-', ''), 10);
}

/**
 * Read the latest level-one heading from markdown content.
 * @param {string} content - Markdown content to inspect.
 * @returns {string} Heading text without the leading `#`, or an empty string.
 */
export function extractLevelOneHeading(content) {
  const match = content.match(/^# (.+)$/m);
  if (!match) {
    return '';
  }

  return match[1].trim();
}

/**
 * Check whether markdown content contains only a single level-one heading.
 * @param {string} content - Markdown content to inspect.
 * @returns {boolean} True when the content is exactly one non-empty `# Heading` line.
 */
export function hasOnlyLevelOneHeading(content) {
  const trimmedContent = content.trim();
  return isSingleHeadingLine(trimmedContent);
}

/**
 * Check whether trimmed markdown content is a single level-one heading line.
 * @param {string} trimmedContent - Trimmed markdown content.
 * @returns {boolean} True when the content is exactly one non-empty `# Heading` line.
 */
function isSingleHeadingLine(trimmedContent) {
  if (!isNonEmptySingleLine(trimmedContent)) {
    return false;
  }

  return /^# .+$/.test(trimmedContent);
}

/**
 * Check whether trimmed content is present and fits on a single line.
 * @param {string} trimmedContent - Trimmed markdown content.
 * @returns {boolean} True when the content is non-empty and contains no newlines.
 */
function isNonEmptySingleLine(trimmedContent) {
  if (!trimmedContent) {
    return false;
  }

  return !trimmedContent.includes('\n');
}

/** @typedef {{ steps?: Array<{ id: string, title: string }>, activeIndex?: number, heading?: string } | undefined} WorkflowCandidate */

/**
 * Resolve an optional property from a workflow candidate.
 * @template {keyof NonNullable<WorkflowCandidate>} K
 * @param {WorkflowCandidate} workflow - Workflow candidate to inspect.
 * @param {K} key - Property name to read.
 * @returns {NonNullable<WorkflowCandidate>[K] | undefined} Property value when present.
 */
function getWorkflowProperty(workflow, key) {
  if (!workflow) {
    return undefined;
  }

  return workflow[key];
}

/**
 * Determine whether a step list is populated and safe to normalize.
 * @param {Array<{ id: string, title: string }> | undefined} steps - Candidate workflow steps.
 * @returns {steps is Array<{ id: string, title: string }>} True when the provided steps should be used.
 */
function hasWorkflowSteps(steps) {
  return Array.isArray(steps) && steps.length > 0;
}

/**
 * Resolve the workflow steps, falling back to the default sequence when needed.
 * @param {{ steps?: Array<{ id: string, title: string }> } | undefined} workflow - Workflow candidate to normalize.
 * @returns {Array<{ id: string, title: string }>} Normalized step list.
 */
function normalizeSteps(workflow) {
  const workflowSteps = getWorkflowProperty(workflow, 'steps');
  if (hasWorkflowSteps(workflowSteps)) {
    return workflowSteps.map(cloneStep);
  }

  return DEFAULT_SEQUENCE.map(cloneStep);
}

/**
 * Resolve the active workflow index and clamp it within the step bounds.
 * @param {{ activeIndex?: number } | undefined} workflow - Workflow candidate to normalize.
 * @param {number} maxIndex - Maximum valid active index.
 * @returns {number} Clamped active index.
 */
function normalizeActiveIndex(workflow, maxIndex) {
  const workflowActiveIndex = getWorkflowProperty(workflow, 'activeIndex');
  if (isWorkflowIndex(workflowActiveIndex)) {
    return Math.min(Math.max(workflowActiveIndex, 0), maxIndex);
  }

  return Math.min(1, maxIndex);
}

/**
 * Check whether a workflow active index is a valid integer.
 * @param {unknown} value - Candidate active index.
 * @returns {value is number} True when the index is an integer.
 */
function isWorkflowIndex(value) {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Normalize the shared workflow heading field.
 * @param {{ heading?: string } | undefined} workflow - Workflow candidate to normalize.
 * @returns {string} Trimmed heading or an empty string.
 */
function normalizeHeading(workflow) {
  const heading = getWorkflowProperty(workflow, 'heading');
  if (typeof heading !== 'string') {
    return '';
  }

  return heading.trim();
}

/**
 * Normalize persisted workflow state and apply sane defaults.
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex?: number, heading?: string } | undefined} workflow - Workflow payload from storage.
 * @returns {{ steps: Array<{ id: string, title: string }>, activeIndex: number, heading: string }} Normalized workflow state.
 */
export function normalizeWorkflow(workflow) {
  const steps = normalizeSteps(workflow);
  const maxIndex = Math.max(0, steps.length - 1);
  const activeIndex = normalizeActiveIndex(workflow, maxIndex);

  return {
    steps,
    activeIndex,
    heading: normalizeHeading(workflow),
  };
}
