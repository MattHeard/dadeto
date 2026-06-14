const DEFAULT_ROOT_DIR = '.';
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };
const DEFAULT_SPAWN_RESULT = { status: 0, signal: null };

/**
 * Build the shared default gate options bundle.
 * @returns {{
 *   rootDir: string,
 *   stdout: { write: () => void },
 *   stderr: { write: () => void },
 *   spawnResult: { status: number, signal: null },
 * }} Default gate option values.
 */
export function createDefaultGateScriptOptions() {
  return {
    rootDir: DEFAULT_ROOT_DIR,
    stdout: DEFAULT_STDOUT,
    stderr: DEFAULT_STDERR,
    spawnResult: DEFAULT_SPAWN_RESULT,
  };
}
