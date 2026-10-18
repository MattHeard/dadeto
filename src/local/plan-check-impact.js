#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlanCheckImpactHandle } from '../core/local/checkImpactPlan.js';
import { bindStartupEffectBoundary } from './allow-effects.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const handle = createPlanCheckImpactHandle({
  argv: process.argv.slice(2),
  rootDir,
  processExecPath: process.execPath,
  pathModule: path,
  bindStartupEffectBoundary,
  runCommand: (_permission, command, args, options) =>
    spawnSync(command, args, options),
  writeOutput: (_permission, output) => process.stdout.write(output),
});
const result = handle();
process.exitCode = result.exitCode;
