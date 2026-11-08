/** @typedef {{ok: true, paths: string[], deletedPaths: string[]} | {ok: false}} GitChanges */

/**
 * Parse `git diff --name-status -z --no-renames` output without losing paths.
 * Empty output means no changes. Malformed or unsupported records fail closed;
 * callers must not use partial deletion evidence after a parsing failure.
 * @param {unknown} output Untrusted process output.
 * @returns {GitChanges} Complete change evidence or a rejected input.
 */
export function parseGitChanges(output) {
  if (typeof output !== 'string') return { ok: false };
  if (output === '') return { ok: true, paths: [], deletedPaths: [] };
  if (!output.endsWith('\0')) return { ok: false };
  const fields = output.slice(0, -1).split('\0');
  const paths = [];
  const deletedPaths = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const file = fields[index + 1];
    if (!file) return { ok: false };
    if (status === 'D') deletedPaths.push(file);
    else if (!/^[AMTU]$/u.test(status)) return { ok: false };
    paths.push(file);
  }
  return { ok: true, paths, deletedPaths };
}
