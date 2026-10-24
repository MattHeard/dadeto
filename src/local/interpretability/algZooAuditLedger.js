import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { createAlgZooAuditLedgerCore } from '../../core/local/interpretability/algZooAuditLedger.js';

const auditDirectory = path.join(
  process.env.XDG_STATE_HOME ?? path.join(homedir(), '.local', 'state'),
  'dadeto'
);
const handle = createAlgZooAuditLedgerCore({
  appendFileImpl: appendFile,
  ledgerPath:
    process.env.ALGZOO_AUDIT_LEDGER ??
    path.join(auditDirectory, 'algzoo-audit.jsonl'),
  mkdirImpl: mkdir,
  pathModule: path,
  readFileImpl: readFile,
  sha256Impl: value => createHash('sha256').update(value).digest('hex'),
});

export default handle;
