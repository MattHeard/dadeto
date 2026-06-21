#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runLocalPlaywright } from '../src/core/local/gcp-simulator/playwright-runner.js';

const args = process.argv.slice(2);
const { suite, environment, playwrightArgs } = parseArgs(args);
const runtimeConfigPath = path.resolve('config/e2e-runtime.json');
const runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
const selectedSuite =
  suite ?? process.env.E2E_SUITE ?? runtimeConfig.suite ?? 'cloud';
const selectedEnvironment =
  environment ?? process.env.E2E_ENVIRONMENT ?? runtimeConfig.environment;

if (selectedSuite === 'all') {
  try {
    await runSuite('cloud', 'simulated-gcp', playwrightArgs);
    await runSuite('local', 'direct-local', playwrightArgs);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
} else {
  try {
    await runSuite(selectedSuite, selectedEnvironment, playwrightArgs);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

async function runSuite(suite, environment, playwrightArgs) {
  if (suite === 'cloud') {
    await runCloudPlaywright(environment, playwrightArgs);
    await uploadCloudArtifacts(environment);
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

async function runCloudPlaywright(environment, playwrightArgs) {
  const resolvedEnvironment = environment ?? 'simulated-gcp';
  clearPlaywrightOutputs();
  const cloudArgs = [
    'playwright',
    'test',
    '--config',
    'test/e2e/cloud.config.ts',
    ...playwrightArgs,
  ];
  const child = spawn(
    'npx',
    cloudArgs,
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        E2E_ENVIRONMENT: resolvedEnvironment,
      },
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

function clearPlaywrightOutputs() {
  for (const target of ['playwright-report', 'test-results', '/tmp/playwright.log']) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

async function uploadCloudArtifacts(environment) {
  const reportBucket = process.env.REPORT_BUCKET;
  if (!reportBucket) {
    return;
  }

  const reportPrefix = process.env.REPORT_PREFIX ?? '';
  const dest = reportPrefix
    ? `gs://${reportBucket}/${reportPrefix}`
    : `gs://${reportBucket}`;

  await run('gcloud', ['storage', 'rm', '--recursive', dest], true);
  await uploadPath('playwright-report', dest);
  await uploadPath('test-results', dest);
  await uploadPath('/tmp/playwright.log', dest);
}

async function uploadPath(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const args = ['storage', 'cp'];
  if (fs.statSync(src).isDirectory()) {
    args.push('-r');
  }
  args.push(src, `${dest}/`);
  await run('gcloud', args, true);
}

async function run(command, commandArgs, allowFailure = false) {
  const child = spawn(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0 || allowFailure) {
        resolve(code ?? 1);
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`));
    });
  });
}

function parseArgs(argv) {
  const parsed = { suite: undefined, environment: undefined, playwrightArgs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--suite' && i + 1 < argv.length) {
      parsed.suite = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--suite=')) {
      parsed.suite = arg.slice('--suite='.length);
      continue;
    }
    if (arg === '--environment' && i + 1 < argv.length) {
      parsed.environment = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--environment=')) {
      parsed.environment = arg.slice('--environment='.length);
      continue;
    }
    parsed.playwrightArgs.push(arg);
  }
  return parsed;
}
