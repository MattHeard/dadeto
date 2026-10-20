import {
  createPlanCheckImpactHandle,
  createRunCheckImpactHandle,
  createRunScopedCheckImpactHandle,
} from '../core/local/checkImpactPlan.js';
import { createCheckImpactCommandDependencies } from './check-impact-command-dependencies.js';

/**
 * @param {'plan' | 'run' | 'checks'} mode CLI mode.
 * @param {string[]} argv CLI arguments.
 * @returns {void}
 */
export function runCheckImpactCommand(mode, argv) {
  const createHandle = {
    plan: createPlanCheckImpactHandle,
    run: createRunCheckImpactHandle,
    checks: createRunScopedCheckImpactHandle,
  }[mode];
  const handle = createHandle(createCheckImpactCommandDependencies(argv));
  process.exitCode = handle().exitCode;
}

export { createCheckImpactCommandDependencies } from './check-impact-command-dependencies.js';
