import { readFileSync } from 'node:fs';
import { createAlgZooActivationTraceReport } from './algZooActivationTraceReport.js';

const args = process.argv.slice(2);
if (args.length !== 1 || !/^\d+$/u.test(args[0])) {
  process.stderr.write(
    'Usage: node src/local/replay-algzoo-activation-trace.js <32-bit-seed>\n'
  );
  process.exitCode = 2;
} else {
  try {
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          '../../test/fixtures/interpretability/alg-zoo-m16-10.json',
          import.meta.url
        ),
        'utf8'
      )
    );
    const report = createAlgZooActivationTraceReport(Number(args[0]), fixture);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch {
    process.stderr.write(
      'Could not replay the pinned AlgZoo activation trace.\n'
    );
    process.exitCode = 1;
  }
}
