import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  DEFAULT_CODEX_RALPH_ARGS,
  createCodexRalphLauncher as createCodexRalphLauncherCore,
} from '../../core/local/symphony/launcherCodex.js';

export function createCodexRalphLauncher(options = {}) {
  return createCodexRalphLauncherCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? mkdir,
    openImpl: options.openImpl ?? open,
    spawnImpl: options.spawnImpl ?? spawn,
    pathModule: path,
  });
}

export { DEFAULT_CODEX_RALPH_ARGS };
