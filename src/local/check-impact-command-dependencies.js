import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bindStartupEffectBoundary } from './allow-effects.js';
import { createScopedImpactCoverageRunner } from './run-impact-coverage.js';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const defaultBaseRef =
  process.env.DADETO_CHECK_BASE ??
  (process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`);
const runCommand = (_permission, command, args, options) =>
  spawnSync(command, args, options);
const runCoverage = createScopedImpactCoverageRunner({ rootDir, runCommand });

/**
 * @param {string[]} argv CLI arguments.
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
    runCommand,
    runCoverage,
    writeOutput: (_permission, output) => process.stdout.write(output),
  };
}
