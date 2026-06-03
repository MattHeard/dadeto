import { createSymphonyLaunchHandle } from '../../core/local/symphony/launch.js';

const coreHandle = createSymphonyLaunchHandle();

export function launchSelectedRunnerLoop(options = {}) {
  return coreHandle.launchSelectedRunnerLoop({
    ...options,
    cwd: options.cwd ?? (() => process.cwd()),
  });
}

export function createRunnerExitHandler(options) {
  return coreHandle.createRunnerExitHandler(options);
}

export const handle = {
  launchSelectedRunnerLoop,
  createRunnerExitHandler,
};
