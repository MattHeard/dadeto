import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateAlgZooWholeModelAccuracyV1 } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
import { createAlgZooAccuracyReportCommandHandle } from '../../../src/core/local/algZooAccuracyReportCommand/index.js';

/**
 * Build a report from synthetic measurements for command tests.
 * @returns {Record<string, any>} Valid evaluator report.
 */
function validReport() {
  const variants = [];
  for (const noiseScale of [0.01, 0.05, 0.1, 0.2]) {
    for (let replicate = 0; replicate < 8; replicate += 1) {
      const referenceAccuracy = 0.9 + noiseScale / 10 + replicate / 1000;
      variants.push({
        variantId: `command-${noiseScale}-${replicate}`,
        heldOutSplitId: 'algzoo-cli-command-test-v1',
        noiseScale,
        referenceAccuracy,
        mechanisticEstimate: referenceAccuracy - 0.01,
        samplingEstimate: referenceAccuracy - 0.04,
        mechanisticCompute: 100000,
        samplingCompute: 100000,
      });
    }
  }
  const result = evaluateAlgZooWholeModelAccuracyV1({
    heldOutSplitId: 'algzoo-cli-command-test-v1',
    sampleCountPerVariant: 100000,
    samplingBaseline: {
      method: {
        repository: 'https://github.com/example/baseline',
        revision: 'a'.repeat(40),
        path: 'baseline/accuracy.js',
      },
      seedCommitment: 'b'.repeat(64),
    },
    variants,
  });
  if (!result.valid) throw new Error('Synthetic command report is invalid.');
  return result.report;
}

/**
 * Create a command and capture all injected effects.
 * @param {(path: string) => string} readFile Reader for command input.
 * @returns {{run: (args: string[]) => void, stdout: string[], stderr: string[], exitCodes: number[]}} Command and captured outputs.
 */
function createCommand(readFile) {
  const stdout = [];
  const stderr = [];
  const exitCodes = [];
  const run = createAlgZooAccuracyReportCommandHandle({
    readFile,
    writeStdout: text => stdout.push(text),
    writeStderr: text => stderr.push(text),
    setExitCode: code => exitCodes.push(code),
  });
  return { run, stdout, stderr, exitCodes };
}

describe('AlgZoo accuracy report command', () => {
  it('rejects invalid argument counts without reading a file', () => {
    const command = createCommand(() => {
      throw new Error('reader should not run');
    });

    command.run([]);
    command.run(['one.json', 'two.json']);

    expect(command.stderr).toHaveLength(2);
    expect(command.stderr[0]).toContain('Usage:');
    expect(command.exitCodes).toEqual([2, 2]);
  });

  it('reports file-read and JSON parse failures without partial output', () => {
    const unreadable = createCommand(() => {
      throw new Error('no file');
    });
    unreadable.run(['report.json']);
    expect(unreadable.stderr[0]).toContain('Could not read or parse');
    expect(unreadable.exitCodes).toEqual([1]);

    const invalidJson = createCommand(() => '{');
    invalidJson.run(['report.json']);
    expect(invalidJson.stderr[0]).toContain('Could not read or parse');
    expect(invalidJson.exitCodes).toEqual([1]);
  });

  it('rejects invalid reports and writes a valid report to standard output', () => {
    const invalid = createCommand(() => JSON.stringify({ schemaVersion: 1 }));
    invalid.run(['report.json']);
    expect(invalid.stdout).toEqual([]);
    expect(invalid.stderr[0]).toContain('Invalid accuracy report:');
    expect(invalid.exitCodes).toEqual([1]);

    const directory = mkdtempSync(join(tmpdir(), 'algzoo-command-'));
    try {
      const reportPath = join(directory, 'accuracy-report.json');
      writeFileSync(reportPath, JSON.stringify(validReport()));
      const valid = createCommand(path => readFileSync(path, 'utf8'));
      valid.run([reportPath]);
      expect(valid.stdout[0]).toContain('# Whole-model predictive accuracy');
      expect(valid.stderr).toEqual([]);
      expect(valid.exitCodes).toEqual([0]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
