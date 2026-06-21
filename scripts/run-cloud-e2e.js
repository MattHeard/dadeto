#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runLocalPlaywright } from '../src/core/local/gcp-simulator/playwright-runner.js';

const args = process.argv.slice(2);
const runtimeConfigPath = path.resolve('config/e2e-runtime.json');
const runtimeConfig = JSON.parse(
  fs.readFileSync(runtimeConfigPath, 'utf8')
);
const useCloudResources = runtimeConfig.cloudMode === 'gcp';

if (useCloudResources) {
  const child = spawn(
    'npx',
    ['playwright', 'test', '--config', 'test/e2e/cloud.config.ts', ...args],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  child.on('exit', code => {
    process.exitCode = code ?? 1;
  });
} else {
  const result = await runLocalPlaywright({
    playwrightConfigPath: 'test/e2e/cloud.config.ts',
    playwrightArgs: args,
  });

  process.exitCode = result.exitCode ?? (result.signal ? 1 : 0);
}
