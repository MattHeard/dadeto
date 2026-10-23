import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluateAlgZooWholeModelAccuracyV1 } from '../../src/core/interpretability/algZooPilotHarness/index.js';

const scriptPath = fileURLToPath(
  new URL('../../src/local/render-algzoo-accuracy-report.js', import.meta.url)
);

/**
 * Create a report from synthetic measurements for the CLI test.
 * @returns {Record<string, any>} Valid evaluator report.
 */
function validEvaluationReport() {
  const variants = [];
  for (const noiseScale of [0.01, 0.05, 0.1, 0.2]) {
    for (let replicate = 0; replicate < 8; replicate += 1) {
      const referenceAccuracy = 0.9 + noiseScale / 10 + replicate / 1000;
      variants.push({
        variantId: `variant-${noiseScale}-${replicate}`,
        heldOutSplitId: 'algzoo-cli-report-test-v1',
        noiseScale,
        referenceAccuracy,
        mechanisticEstimate: referenceAccuracy - 0.01,
        samplingEstimate: referenceAccuracy - 0.04,
        mechanisticCompute: 100000,
        samplingCompute: 100000,
      });
    }
  }
  const evaluated = evaluateAlgZooWholeModelAccuracyV1({
    heldOutSplitId: 'algzoo-cli-report-test-v1',
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
  if (!evaluated.valid) throw new Error('Synthetic report is invalid.');
  return evaluated.report;
}

describe('AlgZoo accuracy report CLI', () => {
  it('renders a valid stored report and rejects invalid input without partial output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'algzoo-accuracy-report-'));
    try {
      const inputPath = join(directory, 'accuracy-report.json');
      writeFileSync(inputPath, JSON.stringify(validEvaluationReport()));
      const rendered = spawnSync(process.execPath, [scriptPath, inputPath], {
        encoding: 'utf8',
      });
      expect(rendered.status).toBe(0);
      expect(rendered.stdout.match(/^\| variant-/gm)).toHaveLength(32);
      expect(rendered.stderr).toBe('');

      writeFileSync(inputPath, JSON.stringify({ schemaVersion: 1 }));
      const invalid = spawnSync(process.execPath, [scriptPath, inputPath], {
        encoding: 'utf8',
      });
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr).toContain('Invalid accuracy report');

      const missing = spawnSync(process.execPath, [scriptPath], {
        encoding: 'utf8',
      });
      expect(missing.status).toBe(2);
      expect(missing.stdout).toBe('');
      expect(missing.stderr).toContain('Usage:');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
