import { spawnSync } from 'node:child_process';

const command = new URL(
  '../../src/local/replay-algzoo-activation-trace.js',
  import.meta.url
);

describe('AlgZoo activation trace CLI', () => {
  it('prints deterministic replay-only JSON for a valid seed', () => {
    const first = spawnSync(process.execPath, [command.pathname, '12345'], {
      encoding: 'utf8',
    });
    const second = spawnSync(process.execPath, [command.pathname, '12345'], {
      encoding: 'utf8',
    });

    expect(first.status).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(first.stderr).toBe('');
    expect(JSON.parse(first.stdout).activationTraceByTimeStep).toHaveLength(10);
  });

  it('rejects invalid seed syntax without writing partial output', () => {
    const result = spawnSync(
      process.execPath,
      [command.pathname, 'not-a-seed'],
      {
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage:');
  });
});
