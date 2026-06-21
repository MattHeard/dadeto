#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runLocalPlaywright } from '../src/core/local/gcp-simulator/playwright-runner.js';

const args = process.argv.slice(2);
const { mode, playwrightArgs } = parseArgs(args);
const runtimeConfigPath = path.resolve('config/e2e-runtime.json');
const runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
const runtimeMode = runtimeConfig.cloudMode === 'gcp' ? 'cloud' : 'local';
const selectedMode = mode ?? runtimeMode;

if (selectedMode === 'all') {
  try {
    await runSuite('cloud', playwrightArgs);
    await runSuite('local', playwrightArgs);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  return;
}

try {
  await runSuite(selectedMode, playwrightArgs);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

async function runSuite(suite, playwrightArgs) {
  if (suite === 'cloud') {
    await runCloudPlaywright(playwrightArgs);
    return;
  }

  if (suite === 'local') {
    const result = await runLocalPlaywright({
      playwrightArgs,
    });
    process.exitCode = result.exitCode ?? (result.signal ? 1 : 0);
    return;
  }

  throw new Error(`Unknown e2e suite: ${suite}`);
}

async function runCloudPlaywright(playwrightArgs) {
  const child = spawn(
    'npx',
    ['playwright', 'test', '--config', 'test/e2e/cloud.config.ts', ...playwrightArgs],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`playwright test exited with code ${code}`));
    });
  });
}

function parseArgs(argv) {
  const parsed = { mode: undefined, playwrightArgs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode' && i + 1 < argv.length) {
      parsed.mode = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      parsed.mode = arg.slice('--mode='.length);
      continue;
    }
    parsed.playwrightArgs.push(arg);
  }
  return parsed;
}
