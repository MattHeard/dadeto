import { createSymphonyLaunchHandle } from '../../core/local/symphony/launch.js';

const handle = createSymphonyLaunchHandle();

export const { launchSelectedRunnerLoop, createRunnerExitHandler } = handle;

export { handle };
