import {
  formatNonCoreThinFailure,
  getNonCoreThinStatus,
} from '../core/local/non-core-thin/status.js';

const status = getNonCoreThinStatus();

if (!status.isClean) {
  formatNonCoreThinFailure(status).forEach(line => {
    console.error(line);
  });
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${status.fileCount} non-core JS files; ${status.exemptionCount} baseline exemptions; max ${status.maxLines} lines.`
  );
}
