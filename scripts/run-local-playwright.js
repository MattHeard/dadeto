#!/usr/bin/env node
import { runLocalPlaywright } from '../src/core/local/gcp-simulator/playwright-runner.js';

const result = await runLocalPlaywright({
  playwrightArgs: process.argv.slice(2),
});

process.exitCode = result.exitCode ?? (result.signal ? 1 : 0);
