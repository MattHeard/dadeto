import { spawn } from 'node:child_process';
import path from 'node:path';
import { createLocalPlaywrightRunner } from '../../core/local/gcp-simulator/playwright-runner.js';
import { bindEffectBoundary } from '../allow-effects.js';
import { createChildCapabilities } from './child-process-adapter.js';
import { reserveWriterPort } from './port-adapter.js';

/**
 * Compose the native runner without exposing raw launch functions to core.
 * @param {import('../../core/local/gcp-simulator/playwright-runner.js').RunnerOptions & {spawnImpl?: typeof spawn}} [options] Native runner options.
 * @returns {Promise<import('../../core/local/gcp-simulator/playwright-runner.js').RunnerResult>} Run result.
 */
const handle = (options = {}) => bindEffectBoundary(permission => {
  const { spawnImpl, ...configuration } = options;
  const runner = createLocalPlaywrightRunner({
    process: {
      rootDir: process.cwd(), env: {...process.env}, execPath: process.execPath,
      spawn: (_permission, command, args, init) => createChildCapabilities((spawnImpl ?? spawn)(command, args, init)),
      writeStdout: (_permission, chunk) => { process.stdout.write(/** @type {string | Uint8Array} */ (chunk)); },
      writeStderr: (_permission, chunk) => { process.stderr.write(/** @type {string | Uint8Array} */ (chunk)); },
    },
    paths: path,
    reservePort: reserveWriterPort,
  });
  return runner.runLocalPlaywright(permission, configuration);
});

export { handle as runLocalPlaywright };
