import { spawnSync } from 'node:child_process';

for (const [fixture, counts] of [
  ['build', { comparisons: 900, cases: 100 }],
  ['browser', { cases: 45, snapshots: 271 }],
  ['getter', { cases: 768, reads: 13027 }],
]) {
  test(`preserves the frozen native static JSONL ${fixture} contract`, () => {
    const result = spawnSync(
      process.execPath,
      [
        '--max-old-space-size=512',
        `test/fixtures/typed-logic/static-jsonl-${fixture}-equivalence.js`,
      ],
      { encoding: 'utf8', timeout: 20000 }
    );
    expect({
      error: result.error?.message,
      status: result.status,
      stderr: result.stderr,
    }).toEqual({ error: undefined, status: 0, stderr: '' });
    expect(JSON.parse(result.stdout)).toMatchObject(counts);
  }, 25000);
}
