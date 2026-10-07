import { createSymphonyBootstrapHandle } from '../../core/local/symphony/bootstrap.js';
import { createSymphonyStatusStore } from './statusStore.js';
import { bindEffectBoundary } from '../allow-effects.js';
import { getSymphonyRuntimeVersion } from './runtimeVersion.js';
import { loadSymphonyConfig } from './config.js';
import { createBdTracker } from './trackerBd.js';
import { loadSymphonyWorkflow } from './workflow.js';

const handle = createSymphonyBootstrapHandle({
  createSymphonyStatusStore,
  bindEffectBoundary,
  getSymphonyRuntimeVersion,
  loadSymphonyConfig,
  createBdTracker,
  loadSymphonyWorkflow,
  cwd: () => process.cwd(),
});

export const { bootstrapSymphony, refreshSymphonyStatus } = handle;

export { handle };
