import { createCopyCore } from './blog.js';

/**
 * Run the copy workflow end to end.
 * @param {Parameters<typeof createCopyCore>[0]} environmentDependencies - Core dependencies.
 * @returns {void}
 */
export function runCore(environmentDependencies) {
  createCopyCore(environmentDependencies).runCopyWorkflow();
}
