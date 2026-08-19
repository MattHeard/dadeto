import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupStaleMutationSandboxes,
  loadCheckpoint,
  scanFiles,
} from '../../../src/core/local/find-surviving-mutant.js';

const emptyResult = () => ({
  scannedFiles: [],
  skippedFiles: [],
  filesWithoutSurvivingMutant: [],
  fileWithSurvivingMutant: null,
  survivingMutants: [],
  timedOutFiles: [],
  failedFiles: [],
  fileRecords: {},
});

describe('find surviving mutant scan state', () => {
  test('continues after timeout and records each file outcome', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-mutants-'));
    const outputPath = path.join(root, 'scan.json');
    const result = emptyResult();
    const logs = [];

    await scanFiles({
      files: ['src/core/slow.js', 'src/core/clean.js'],
      result,
      outputPath,
      output: { log: message => logs.push(message) },
      scanFile: async ({ filePath }) =>
        filePath.endsWith('slow.js')
          ? { status: 'timeout', error: 'timed out' }
          : [],
    });

    expect(result.timedOutFiles).toEqual([
      { filePath: 'src/core/slow.js', error: 'timed out' },
    ]);
    expect(result.scannedFiles).toEqual(['src/core/clean.js']);
    expect(result.fileRecords).toEqual({
      'src/core/slow.js': { status: 'timed_out', error: 'timed out' },
      'src/core/clean.js': { status: 'clean' },
    });
    expect(logs).toContain(
      'Stryker timed out for src/core/slow.js; continuing'
    );
    expect(JSON.parse(await fs.readFile(outputPath, 'utf8'))).toMatchObject({
      timedOutFiles: result.timedOutFiles,
      fileRecords: result.fileRecords,
    });
    await fs.rm(root, { recursive: true, force: true });
  });

  test('removes stale scanner sandboxes but preserves unrelated temporary data', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-mutants-'));
    const tempRoot = path.join(root, '.stryker-tmp');
    await fs.mkdir(path.join(tempRoot, 'sandbox-stale'), { recursive: true });
    await fs.mkdir(path.join(tempRoot, 'backup-stale'), { recursive: true });
    await fs.mkdir(path.join(tempRoot, 'keep-me'), { recursive: true });

    await cleanupStaleMutationSandboxes(root);

    await expect(
      fs.access(path.join(tempRoot, 'sandbox-stale'))
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(tempRoot, 'backup-stale'))
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(tempRoot, 'keep-me'))
    ).resolves.toBeUndefined();
    await fs.rm(root, { recursive: true, force: true });
  });

  test('loads durable per-file records and retry queues', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dadeto-mutants-'));
    const outputPath = path.join(root, 'scan.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        scannedFiles: ['src/core/clean.js'],
        timedOutFiles: [{ filePath: 'src/core/slow.js' }],
        failedFiles: [{ filePath: 'src/core/broken.js' }],
        fileRecords: { 'src/core/clean.js': { status: 'clean' } },
      })
    );

    await expect(
      loadCheckpoint(outputPath, ['src/core/clean.js'])
    ).resolves.toMatchObject({
      scannedFiles: ['src/core/clean.js'],
      timedOutFiles: [{ filePath: 'src/core/slow.js' }],
      failedFiles: [{ filePath: 'src/core/broken.js' }],
      fileRecords: { 'src/core/clean.js': { status: 'clean' } },
    });
    await fs.rm(root, { recursive: true, force: true });
  });
});
