import { mkdir, open } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { bindEffectBoundary } from '../allow-effects.js';
import { createSymphonyLaunchHandle } from '../../core/local/symphony/launch.js';

const coreHandle = createSymphonyLaunchHandle();

export function launchSelectedRunnerLoop(options = {}) {
  return coreHandle.launchSelectedRunnerLoop({
    ...options,
    cwd: options.cwd ?? (() => process.cwd()),
    mkdirImpl: (_permission, ...args) => mkdir(...args),
    openImpl: (_permission, ...args) => open(...args),
    spawnImpl: (_permission, ...args) => spawn(...args),
    bindEffectBoundary,
  });
}

export function createRunnerExitHandler(options) {
  return coreHandle.createRunnerExitHandler(options);
}

export const handle = {
  launchSelectedRunnerLoop,
  createRunnerExitHandler,
};
