import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync as defaultSpawnSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');
const CONFIG_PATH = path.join(ROOT_DIR, '.jscpd.json');
const REPORT_PATH = path.join(ROOT_DIR, 'reports', 'duplication', 'jscpd-report.json');

/**
 * Run the duplication gate and fail when jscpd reports clones.
 * @param {{
 *   spawnImpl?: typeof defaultSpawnSync,
 *   readFileSync?: typeof fs.readFileSync,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 * }} [options] Runner overrides for tests.
 * @returns {{ exitCode: number, clones: number }} Gate outcome.
 */
export function runDuplicationGate(options = {}) {
  const {
    spawnImpl = defaultSpawnSync,
    readFileSync = fs.readFileSync,
    stdout = process.stdout,
    stderr = process.stderr,
  } = options;

  const runResult = spawnImpl('jscpd', ['--config', CONFIG_PATH], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  if (runResult.error) {
    stderr.write(
      `Duplication gate failed to launch jscpd: ${runResult.error.message}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  if (runResult.signal) {
    stderr.write(
      `Duplication gate was terminated by signal ${runResult.signal}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  if (runResult.status !== 0) {
    return {
      exitCode: typeof runResult.status === 'number' ? runResult.status : 1,
      clones: 0,
    };
  }

  const report = readDuplicationReport(readFileSync);
  if (!report) {
    stderr.write(
      `Duplication gate could not read report at ${path.relative(ROOT_DIR, REPORT_PATH)}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  const clones = countClones(report);
  if (clones > 0) {
    const summary = summarizeReport(report);
    stderr.write(`Duplication gate found ${clones} clone${clones === 1 ? '' : 's'}.\n`);
    if (summary) {
      stderr.write(`${summary}\n`);
    }
    stderr.write(
      `See ${path.relative(ROOT_DIR, REPORT_PATH)} for the detailed clone report.\n`
    );
    return { exitCode: 1, clones };
  }

  stdout.write('Checked duplication report: 0 clones.\n');
  return { exitCode: 0, clones: 0 };
}

function readDuplicationReport(readFileSync) {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function countClones(report) {
  return report?.duplicates?.length ?? report?.statistics?.total?.clones ?? 0;
}

function summarizeReport(report) {
  const total = report?.statistics?.total;
  if (!total) {
    return '';
  }

  return `Report summary: ${total.clones} clone${total.clones === 1 ? '' : 's'}, ${total.percentage}% duplicated lines, ${total.percentageTokens}% duplicated tokens.`;
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const result = runDuplicationGate();
  process.exitCode = result.exitCode;
}
