import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  parseReadyBeads,
  selectNextBead,
  summarizeReadyBeadQueue,
} from '../../core/local/symphony.js';

const execFileAsync = promisify(execFile);

/**
 * @param {{
 *   readyCommand: string,
 *   cwd?: string,
 *   execFileImpl?: typeof execFileAsync
 * }} options
 * @returns {{
 *   pollReadyBeads: () => Promise<{
 *     command: string,
 *     readyBeads: Array<{ id: string, title: string, priority: string }>,
 *     queueSummary: string[],
 *     selectedBead: { id: string, title: string, priority: string } | null
 *   }>
 * }} Local `bd` tracker facade for the Symphony scaffold.
 */
export function createBdTracker(options) {
  const execImpl = options.execFileImpl ?? execFileAsync;

  return {
    async pollReadyBeads() {
      const { stdout } = await execImpl('bash', ['-lc', options.readyCommand], {
        cwd: options.cwd,
      });
      const readyBeads = parseReadyBeads(stdout);

      return {
        command: options.readyCommand,
        readyBeads,
        queueSummary: summarizeReadyBeadQueue(readyBeads),
        selectedBead: selectNextBead(readyBeads),
      };
    },
  };
}
