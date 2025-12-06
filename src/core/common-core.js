/**
 * Default storage bucket used for production content.
 * Shared so non-Cloud systems can mirror the same configuration.
 */
export const DEFAULT_BUCKET_NAME = 'www.dendritestories.co.nz';

/**
 * UID for the admin user with elevated access.
 */
export const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

/**
 * Checks if a string is non-empty.
 * @param {string} str - Candidate string to validate.
 * @returns {boolean} True when the input is a non-empty string.
 */
export function isValidString(str) {
  return typeof str === 'string' && str.length > 0;
}
