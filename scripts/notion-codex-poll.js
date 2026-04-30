#!/usr/bin/env node
import process from 'node:process';
import { loadNotionCodexConfig } from '../src/local/notion-codex/config.js';
import { createNotionCodexLauncher } from '../src/local/notion-codex/launcher.js';
import { runNotionCodexPoll } from '../src/local/notion-codex/poll.js';
import { createNotionCodexStateStore } from '../src/local/notion-codex/stateStore.js';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit();
}

const repoRoot = process.cwd();
const config = await loadNotionCodexConfig({
  repoRoot,
  configPath: args.configPath,
});
const stateStore = createNotionCodexStateStore({
  statePath: config.statePath,
});
const launcher = createNotionCodexLauncher({
  command: config.launcher.command,
  args: config.launcher.args,
  cwd: repoRoot,
  logDir: config.logDir,
});

async function runOnce() {
  const result = await runNotionCodexPoll({
    config,
    repoRoot,
    stateStore,
    launcher,
    dryRun: args.dryRun,
  });

  console.log(JSON.stringify(summarizeResult(result), null, 2));
  if (args.dryRun && typeof result.prompt === 'string') {
    console.log('\n--- prompt ---\n');
    console.log(result.prompt);
  }
}

if (args.watch) {
  while (true) {
    await runOnce();
    await wait(config.pollIntervalMs);
  }
} else {
  await runOnce();
}

function parseArgs(argv) {
  const parsed = {
    configPath: undefined,
    dryRun: false,
    help: false,
    watch: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config') {
      index += 1;
      parsed.configPath = argv[index];
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--watch') {
      parsed.watch = true;
    } else if (arg === '--once') {
      parsed.watch = false;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function summarizeResult(result) {
  return {
    launched: result.launched === true,
    skipped: result.skipped === true,
    dryRun: result.dryRun === true,
    reason: result.reason ?? null,
    runId: result.runId ?? null,
    pid: result.launchResult?.pid ?? result.state?.activeRun?.pid ?? null,
    statePath: config.statePath,
    logDir: config.logDir,
  };
}

function wait(delayMs) {
  return new Promise(resolve => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function printHelp() {
  console.log(`Usage: npm run notion:codex:poll -- [options]

Options:
  --once              Run one poll cycle (default)
  --watch             Keep polling using pollIntervalMs
  --dry-run           Print the generated prompt without launching Codex
  --config <path>     Load an alternate JSON config file
  -h, --help          Show this help
`);
}
