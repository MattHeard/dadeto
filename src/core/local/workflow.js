export const DEFAULT_SEQUENCE = [
  { id: 'thesis', title: 'Thesis' },
  { id: 'syllogistic-argument', title: 'Syllogistic Argument' },
  { id: 'outline', title: 'Outline' },
  { id: 'draft-1', title: 'Draft 1' },
];

/**
 * @param {{ id: string, title: string }} step
 */
export function cloneStep(step) {
  return {
    id: step.id,
    title: step.title,
  };
}

/**
 * @param {string} id
 */
export function isDraftId(id) {
  return /^draft-\d+$/.test(id);
}

/**
 * @param {{ id: string }} step
 */
export function getDraftNumber(step) {
  return Number.parseInt(step.id.replace('draft-', ''), 10);
}

/**
 * @param {string} content
 */
export function extractLevelOneHeading(content) {
  const match = content.match(/^# (.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * @param {string} content
 */
export function hasOnlyLevelOneHeading(content) {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return false;
  }

  return /^# .+$/.test(trimmedContent) && !trimmedContent.includes('\n');
}

/**
 * @param {{ steps: Array<{ id: string, title: string }>, activeIndex?: number, heading?: string }} workflow
 */
export function normalizeWorkflow(workflow) {
  const steps = Array.isArray(workflow?.steps) && workflow.steps.length > 0
    ? workflow.steps.map(cloneStep)
    : DEFAULT_SEQUENCE.map(cloneStep);
  const maxIndex = Math.max(0, steps.length - 1);
  const rawActiveIndex = Number.isInteger(workflow?.activeIndex)
    ? workflow.activeIndex
    : Math.min(1, maxIndex);
  const activeIndex = Math.min(Math.max(rawActiveIndex, 0), maxIndex);

  return {
    steps,
    activeIndex,
    heading:
      typeof workflow?.heading === 'string' ? workflow.heading.trim() : '',
  };
}
