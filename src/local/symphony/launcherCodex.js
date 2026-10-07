import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { bindEffectBoundary } from '../allow-effects.js';
import {
  DEFAULT_CODEX_RALPH_ARGS,
  createCodexRalphLauncher as createCodexRalphLauncherCore,
} from '../../core/local/symphony/launcherCodex.js';

export function createCodexRalphLauncher(options = {}) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;
  const spawnImpl = options.spawnImpl ?? spawn;
  return createCodexRalphLauncherCore({
    ...options,
    mkdirImpl: (_permission, ...args) => mkdirImpl(...args),
    openImpl: (_permission, ...args) => openImpl(...args),
    spawnImpl: (_permission, ...args) => spawnImpl(...args),
    bindEffectBoundary,
    pathModule: path,
  });
}

export { DEFAULT_CODEX_RALPH_ARGS };
