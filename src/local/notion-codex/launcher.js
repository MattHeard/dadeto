import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  createNotionCodexLauncherCore,
} from '../../core/local/notion-codex/launcher.js';

export function createNotionCodexLauncher(options = {}) {
  return createNotionCodexLauncherCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? mkdir,
    openImpl: options.openImpl ?? open,
    spawnImpl: options.spawnImpl ?? spawn,
    pathModule: path,
  });
}

export { createNotionCodexLauncher as handle };
