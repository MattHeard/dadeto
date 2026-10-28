/**
 * Bind process launch and event registration to the runner permission contract.
 * @param {typeof import('node:child_process').spawn} spawn Native process adapter.
 * @returns {import('../core/scripts/run-stryker-worktree-core.js').WorktreeSpawn} Classified launcher.
 */
export function createWorktreeSpawn(spawn) {
  return (_permission, command, args, options) => {
    const child = spawn(command, args, options);
    /** @type {import('../core/scripts/run-stryker-worktree-core.js').WorktreeListener} */
    const once = (permission, event, listener) => {
      void permission;
      return child.once(event, listener);
    };
    return Object.freeze({ once });
  };
}
