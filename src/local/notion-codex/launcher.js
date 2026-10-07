import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { bindEffectBoundary } from '../allow-effects.js';
import {
  createNotionCodexLauncherCore,
} from '../../core/local/notion-codex/launcher.js';

export function createNotionCodexLauncher(options = {}) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;
  const spawnImpl = options.spawnImpl ?? spawn;
  return createNotionCodexLauncherCore({
    ...options,
    mkdirImpl: (_permission, ...args) => mkdirImpl(...args),
    openImpl: (_permission, ...args) => openImpl(...args),
    spawnImpl: (_permission, ...args) => spawnImpl(...args),
    bindEffectBoundary,
    pathModule: path,
  });
}

export { createNotionCodexLauncher as handle };
