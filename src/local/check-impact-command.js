import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  createPlanCheckImpactHandle,
  createRunCheckImpactHandle,
} from '../core/local/checkImpactPlan.js';
import { bindStartupEffectBoundary } from './allow-effects.js';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const defaultBaseRef = process.env.DADETO_CHECK_BASE ??
  (process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`);

/**
 * Bind the shared effect adapters for impact planning and execution CLIs.
 * @param {string[]} argv Command-line arguments.
 * @returns {object} Runtime dependencies for an impact handler.
 */
export function createCheckImpactCommandDependencies(argv) {
  return {
    argv,
    rootDir,
    processExecPath: process.execPath,
    defaultBaseRef,
    impactShardSize: Number(process.env.DADETO_CHECK_IMPACT_SHARD_SIZE ?? 200),
    fileExists: filePath => existsSync(filePath),
    pathModule: path,
    bindStartupEffectBoundary,
    runCommand: (_permission, command, args, options) =>
      spawnSync(command, args, options),
    writeOutput: (_permission, output) => process.stdout.write(output),
  };
}

/**
 * Execute one impact CLI mode and assign its exit status.
 * @param {'plan' | 'run'} mode Selected CLI mode.
 * @param {string[]} argv Command-line arguments.
 * @returns {void}
 */
export function runCheckImpactCommand(mode, argv) {
  const createHandle =
    mode === 'plan'
      ? createPlanCheckImpactHandle
      : createRunCheckImpactHandle;
  const handle = createHandle(createCheckImpactCommandDependencies(argv));
  process.exitCode = handle().exitCode;
}
