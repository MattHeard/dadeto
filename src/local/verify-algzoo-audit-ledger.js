import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAlgZooAuditLedgerStatusCommand } from '../core/local/interpretability/algZooAuditLedgerStatus.js';
import ledger from './interpretability/algZooAuditLedger.js';

const handle = createAlgZooAuditLedgerStatusCommand({
  readAll: ledger.readAll,
  writeStdout: text => process.stdout.write(text),
  writeStderr: text => process.stderr.write(text),
  setExitCode: code => {
    process.exitCode = code;
  },
});

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await handle(process.argv.slice(2));
}
