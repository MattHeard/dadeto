import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAlgZooCoverageCostInput } from '../fixtures/interpretability/algZooCoverageCostInput.js';

const scriptPath = fileURLToPath(
  new URL(
    '../../src/local/render-algzoo-coverage-cost-report.js',
    import.meta.url
  )
);

describe('AlgZoo coverage-cost report CLI', () => {
  it('renders stored synthetic pair records and rejects invalid input', () => {
    const directory = mkdtempSync(join(tmpdir(), 'algzoo-coverage-cost-'));
    try {
      const inputPath = join(directory, 'locked-pairs.json');
      writeFileSync(inputPath, JSON.stringify(createAlgZooCoverageCostInput()));
      const rendered = spawnSync(process.execPath, [scriptPath, inputPath], {
        encoding: 'utf8',
      });
      expect(rendered.status).toBe(0);
      expect(rendered.stdout.match(/^\| [0-9]+ \|/gm)).toHaveLength(64);
      expect(rendered.stderr).toBe('');

      writeFileSync(inputPath, '{"secret":"value"}');
      const invalid = spawnSync(process.execPath, [scriptPath, inputPath], {
        encoding: 'utf8',
      });
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe('');
      expect(invalid.stderr).toContain('Invalid locked pair input');
      expect(invalid.stderr).not.toContain('value');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
