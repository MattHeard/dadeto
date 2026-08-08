import { createVerifyAdmin as createVerifyAdminCore } from '../cloud-core.js';

/**
 * Create the mark-variant-dirty admin verifier through the shared helper.
 * @param {Parameters<typeof createVerifyAdminCore>[0]} deps Verifier dependencies.
 * @returns {ReturnType<typeof createVerifyAdminCore>} Admin verifier middleware.
 */
export const createVerifyAdmin = deps => createVerifyAdminCore(deps);

export const MARK_VARIANT_DIRTY_VERIFY_ADMIN_MARKER = true;
