import { createVerifyAdmin as createVerifyAdminCore } from '../cloud-core.js';

/**
 * Create the generate-stats admin verifier through the shared cloud helper.
 * @param {Parameters<typeof createVerifyAdminCore>[0]} deps Verifier dependencies.
 * @returns {ReturnType<typeof createVerifyAdminCore>} Admin verifier middleware.
 */
export const createVerifyAdmin = deps => createVerifyAdminCore(deps);

export const GENERATE_STATS_VERIFY_ADMIN_MARKER = true;
