import { readFile, readdir, unlink, writeFile, open, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT = path.resolve('.');
const CORE = path.join(ROOT, 'src/core');
const REPORT = path.join(ROOT, 'reports/mutation/mutation.json');
const OUTPUT = path.join(ROOT, 'reports/mutation/core-mutant-scan.json');
const LOCK = path.join(ROOT, 'reports/mutation/core-mutant-scan.lock');
const FILE_TIMEOUT_MS = Number(process.env.DADETO_MUTANT_FILE_TIMEOUT_MS ?? 900000);

const lock = await acquireLock();
const files = shuffle(await walk(CORE));
const result = await loadCheckpoint(files);
let activeChild = null;

const stop = signal => {
  if (activeChild?.pid) terminateProcessGroup(activeChild.pid);
  process.exit(signal === 'SIGINT' ? 130 : 143);
};
process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

process.stdout.write(`Found ${files.length} files under src/core\n`);
process.stdout.write(`Writing JSON result to ${path.relative(ROOT, OUTPUT)}\n`);

try {
  for (const [index, filePath] of files.entries()) {
    if (result.scannedFiles.includes(filePath)) continue;
    result.scannedFiles.push(filePath);
    process.stdout.write(`[${index + 1}/${files.length}] Running Stryker for ${filePath}\n`);
    const run = await runStryker(filePath, child => { activeChild = child; });
    activeChild = null;
    if (run.status === 'no-tests') {
      result.skippedFiles.push({ filePath, reason: 'No tests were executed' });
      await saveCheckpoint(result);
      continue;
    }
    if (run.status !== 'ok') throw new Error(`Stryker failed for ${filePath}`);
    const report = JSON.parse(await readFile(REPORT, 'utf8'));
    const fileReport = report.files[filePath];
    if (!fileReport) throw new Error(`Mutation report did not include ${filePath}`);
    const surviving = fileReport.mutants.filter(({ status }) => status === 'Survived');
    if (surviving.length) {
      result.fileWithSurvivingMutant = filePath;
      result.survivingMutants = surviving.map(({ id, mutatorName, replacement, location }) => ({ filePath, id, mutatorName, replacement, location }));
      await saveCheckpoint(result);
      process.stdout.write(`Found ${surviving.length} surviving mutant(s) in ${filePath}; stopping scan.\n`);
      break;
    }
    result.filesWithoutSurvivingMutant.push(filePath);
    await saveCheckpoint(result);
    process.stdout.write(`No surviving mutant in ${filePath}\n`);
  }
  await saveCheckpoint(result);
} finally {
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  await lock.release();
}

process.stdout.write(`Wrote scan result to ${path.relative(ROOT, OUTPUT)}\n`);
process.stdout.write(`Scanned ${result.scannedFiles.length} files\n`);
process.stdout.write(`${result.fileWithSurvivingMutant ? `Surviving mutant file: ${result.fileWithSurvivingMutant}` : 'No surviving mutant found'}\n`);

async function acquireLock() {
  try {
    const handle = await open(LOCK, 'wx');
    await handle.writeFile(`${process.pid}\n`);
    return { release: async () => { await handle.close(); await unlink(LOCK).catch(() => {}); } };
  } catch (error) {
    if (error.code === 'EEXIST') {
      const owner = await readFile(LOCK, 'utf8').catch(() => '');
      const ownerPid = Number.parseInt(owner, 10);
      if (!ownerPid || !(await isProcessAlive(ownerPid))) {
        await unlink(LOCK).catch(() => {});
        return acquireLock();
      }
      throw new Error(`Mutation scan lock exists at ${LOCK}; owner PID ${ownerPid} is still running.`);
    }
    throw error;
  }
}

async function isProcessAlive(pid) {
  try { await access(`/proc/${pid}`); } catch { return false; }
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function loadCheckpoint(order) {
  try {
    const saved = JSON.parse(await readFile(OUTPUT, 'utf8'));
    const scanned = new Set(saved.scannedFiles ?? []);
    return {
      scannedFiles: order.filter(file => scanned.has(file)),
      skippedFiles: saved.skippedFiles ?? [],
      filesWithoutSurvivingMutant: saved.filesWithoutSurvivingMutant ?? [],
      fileWithSurvivingMutant: saved.fileWithSurvivingMutant ?? null,
      survivingMutants: saved.survivingMutants ?? [],
    };
  } catch { return { scannedFiles: [], skippedFiles: [], filesWithoutSurvivingMutant: [], fileWithSurvivingMutant: null, survivingMutants: [] }; }
}

async function saveCheckpoint(value) { await writeFile(OUTPUT, `${JSON.stringify(value, null, 2)}\n`); }

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.relative(ROOT, full).replaceAll(path.sep, '/'));
  }
  return files;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function terminateProcessGroup(pid) {
  try { process.kill(-pid, 'SIGTERM'); } catch {}
  setTimeout(() => { try { process.kill(-pid, 'SIGKILL'); } catch {} }, 2000).unref();
}

function runStryker(filePath, onChild) {
  return new Promise((resolve, reject) => {
    let stderr = '', stdoutBuffer = '', stderrBuffer = '', settled = false;
    const child = spawn('npm', ['run', 'mutant:all', '--', '--mutate', filePath], { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    onChild(child);
    const timer = setTimeout(() => {
      terminateProcessGroup(child.pid);
      finish(new Error(`Stryker timed out after ${FILE_TIMEOUT_MS}ms for ${filePath}`));
    }, FILE_TIMEOUT_MS);
    const flush = (buffer, prefix) => {
      let next = buffer, newlineIndex = next.indexOf('\n');
      while (newlineIndex !== -1) { const line = next.slice(0, newlineIndex).replace(/\r$/, ''); if (line) process.stdout.write(`${prefix}${line}\n`); next = next.slice(newlineIndex + 1); newlineIndex = next.indexOf('\n'); }
      return next;
    };
    const dump = () => { if (stdoutBuffer) process.stdout.write(`[stryker ${filePath}] ${stdoutBuffer}\n`); if (stderrBuffer) process.stdout.write(`[stryker ${filePath}][stderr] ${stderrBuffer}\n`); };
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); dump(); error ? reject(error) : resolve(value); };
    child.stdout.on('data', chunk => { stdoutBuffer = flush(stdoutBuffer + chunk.toString('utf8'), `[stryker ${filePath}] `); });
    child.stderr.on('data', chunk => { const text = chunk.toString('utf8'); stderr += text; stderrBuffer = flush(stderrBuffer + text, `[stryker ${filePath}][stderr] `); });
    child.once('error', error => finish(error));
    child.once('exit', (code, signal) => {
      if (signal) return finish(new Error(`Stryker was terminated by signal ${signal} for ${filePath}`));
      if (stderr.includes('No tests were executed')) return finish(null, { status: 'no-tests', exitCode: code ?? 1 });
      if (code !== 0) return finish(new Error(`Stryker failed for ${filePath}:\n${stderr}`));
      finish(null, { status: 'ok', exitCode: code ?? 1 });
    });
  });
}
