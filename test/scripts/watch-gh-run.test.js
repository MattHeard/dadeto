import { readFileSync } from 'node:fs';

describe('GitHub run watcher helper', () => {
  it('defaults to a slower polling interval', () => {
    const source = readFileSync('scripts/watch-gh-run.js', 'utf8');

    expect(source).toContain('intervalSeconds: 10');
    expect(source).toContain('parsed.intervalSeconds = 10;');
    expect(source).toContain(
      "['run', 'watch', args.runId, '--exit-status', '--interval', String(args.intervalSeconds)]"
    );
    expect(source).toContain('const poller = watchForFailures(args.runId, args.intervalSeconds);');
  });
});
