import { spawn } from 'node:child_process';

// Keep Ralph launches cheap and bounded while still allowing a single bead loop
// to edit files and run local checks inside the repo workspace.
export const DEFAULT_CODEX_RALPH_ARGS = [
  'exec',
  '--skip-git-repo-check',
  '--model',
  'gpt-5-mini',
  '--sandbox',
  'workspace-write',
  '--ask-for-approval',
  'never',
];

/**
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   spawnImpl?: typeof spawn
 * }} options
 * @returns {{
 *   launchRunner: (payload: {
 *     repoRoot: string,
 *     beadId: string,
 *     beadTitle?: string | null,
 *     runId: string
 *   }) => Promise<{
 *     launcherKind: string,
 *     command: string,
 *     args: string[],
 *     pid: number | null
 *   }>
 * }} Local Codex-backed Ralph launcher.
 */
export function createCodexRalphLauncher(options) {
  const spawnImpl = options.spawnImpl ?? spawn;

  return {
    async launchRunner(payload) {
      const prompt = buildRalphPrompt(payload);
      const args = [...(options.args ?? []), prompt];
      const child = spawnImpl(options.command, args, {
        cwd: options.cwd ?? payload.repoRoot,
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      return {
        launcherKind: 'codex',
        command: options.command,
        args,
        pid: typeof child.pid === 'number' ? child.pid : null,
      };
    },
  };
}

/**
 * @param {{
 *   beadId: string,
 *   beadTitle?: string | null,
 *   runId: string
 * }} payload Ralph launch payload.
 * @returns {string} Prompt passed to the Codex runner session.
 */
function buildRalphPrompt(payload) {
  const lines = ['you are ralph', `pop ${payload.beadId}`];
  if (payload.beadTitle) {
    lines.push(`bead title: ${payload.beadTitle}`);
  }
  lines.push(`run id: ${payload.runId}`);

  return lines.join('\n');
}
