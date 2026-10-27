import { createHash } from 'node:crypto';

/**
 * Hash the exact refund identity bytes at the cloud integration boundary.
 * @param {string} identity NUL-separated authenticated identity tuple.
 * @returns {string} Lowercase SHA-256 hexadecimal digest.
 */
export const sha256Utf8 = identity =>
  createHash('sha256').update(identity, 'utf8').digest('hex');
