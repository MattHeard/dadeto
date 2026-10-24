import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAlgZooCodexInvestigatorCore } from '../../core/local/interpretability/algZooCodexInvestigator.js';

const handle = options => createAlgZooCodexInvestigatorCore({
    ...options,
    command: options.command ?? 'codex',
    tempDirectory: options.tempDirectory ?? os.tmpdir(),
    environment: options.environment ?? process.env,
    spawnImpl: options.spawnImpl ?? spawn,
    mkdtempImpl: options.mkdtempImpl ?? mkdtemp,
    writeFileImpl: options.writeFileImpl ?? writeFile,
    rmImpl: options.rmImpl ?? rm,
    pathModule: options.pathModule ?? path,
    timestampNowImpl: options.timestampNowImpl ?? (() => new Date().toISOString()),
    monotonicNowImpl: options.monotonicNowImpl ?? Date.now,
    setTimeoutImpl: options.setTimeoutImpl ?? setTimeout,
    clearTimeoutImpl: options.clearTimeoutImpl ?? clearTimeout,
    decodeChunkImpl:
      options.decodeChunkImpl ?? (chunk => chunk.toString('utf8')),
  });

export { handle as createAlgZooCodexInvestigator };
