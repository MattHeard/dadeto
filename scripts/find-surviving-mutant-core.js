import {
  readFile,
  readdir,
  unlink,
  writeFile,
  open,
  access,
  rm,
} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Run the resumable mutation scan.
 * @param {{ root?: string, runCommand?: string, runArgs?: string[], fileTimeoutMs?: number, output?: { log: (...args: unknown[]) => void }, processApi?: typeof process }} [options] Scan dependencies and settings.
 * @returns {Promise<void>} Resolves when the scan finishes.
 */
export async function runSurvivingMutantScan(options = {}) {
  return executeScan(normalizeOptions(options));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runSurvivingMutantScan();
}

/**
 * Normalize scan options.
 * @param {Record<string, any>} options Raw scan options.
 * @returns {Record<string, any>} Normalized scan options.
 */
function normalizeOptions(options) {
  return {
    root: options.root ?? path.resolve('.'),
    runCommand: options.runCommand ?? 'npm',
    runArgs: options.runArgs ?? ['run', 'mutant:all'],
    fileTimeoutMs:
      options.fileTimeoutMs ??
      Number(process.env.DADETO_MUTANT_FILE_TIMEOUT_MS ?? 900000),
    output: options.output ?? console,
    processApi: options.processApi ?? process,
  };
}

/**
 * Execute a configured scan.
 * @param {Record<string, any>} options Normalized scan options.
 * @returns {Promise<void>} Resolves when scanning finishes.
 */
async function executeScan(options) {
  const { root, runCommand, runArgs, fileTimeoutMs, output, processApi } =
    options;
  const core = path.join(root, 'src/core');
  const report = path.join(root, 'reports/mutation/mutation.json');
  const outputPath = path.join(root, 'reports/mutation/core-mutant-scan.json');
  const lockPath = path.join(root, 'reports/mutation/core-mutant-scan.lock');
  const lock = await acquireLock(lockPath, processApi);
  try {
    await cleanupStaleMutationSandboxes(root);
  } catch (error) {
    await lock.release();
    throw error;
  }
  const files = shuffle(await walk(core, root));
  const result = /** @type {any} */ (await loadCheckpoint(outputPath, files));
  const context = /** @type {any} */ ({
    root,
    report,
    outputPath,
    files,
    result,
    runCommand,
    runArgs,
    fileTimeoutMs,
    processApi,
    output,
  });
  const stop = createStopHandler(processApi, () => context.activeChild);
  processApi.once('SIGINT', () => stop('SIGINT'));
  processApi.once('SIGTERM', () => stop('SIGTERM'));
  output.log(`Found ${files.length} files under src/core`);
  output.log(`Writing JSON result to ${path.relative(root, outputPath)}`);
  try {
    await scanFiles(context);
    await saveCheckpoint(outputPath, result);
  } finally {
    processApi.removeAllListeners('SIGINT');
    processApi.removeAllListeners('SIGTERM');
    await lock.release();
  }
  output.log(`Wrote scan result to ${path.relative(root, outputPath)}`);
  output.log(`Scanned ${result.scannedFiles.length} files`);
  output.log(
    result.fileWithSurvivingMutant
      ? `Surviving mutant file: ${result.fileWithSurvivingMutant}`
      : 'No surviving mutant found'
  );
}

/**
 *
 * @param processApi
 * @param getActiveChild
 */
/**
 * Create a signal handler for the active child process.
 * @param {any} processApi Process API.
 * @param {() => import('node:child_process').ChildProcess | null} getActiveChild Active child getter.
 * @returns {(signal: string) => void} Signal handler.
 */
function createStopHandler(processApi, getActiveChild) {
  return signal => {
    const child = getActiveChild();
    if (child?.pid) terminateProcessGroup(child.pid, processApi);
    processApi.exit(signal === 'SIGINT' ? 130 : 143);
  };
}

/**
 *
 * @param context
 */
/**
 * Scan each unprocessed source file.
 * @param {Record<string, any>} context Scan context.
 * @returns {Promise<void>} Resolves after scanning.
 */
export async function scanFiles(/** @type {any} */ context) {
  const { files, result, outputPath, output } = context;
  for (const [index, filePath] of files.entries()) {
    if (result.scannedFiles.includes(filePath)) continue;
    output.log(
      `[${index + 1}/${files.length}] Running Stryker for ${filePath}`
    );
    let surviving;
    try {
      surviving = await (context.scanFile ?? scanFile)({
        ...context,
        filePath,
      });
    } catch (error) {
      result.fileRecords[filePath] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      result.failedFiles.push({
        filePath,
        error: result.fileRecords[filePath].error,
      });
      await saveCheckpoint(outputPath, result);
      output.log(`Stryker failed for ${filePath}; continuing`);
      continue;
    }
    if (surviving?.status === 'timeout') {
      result.fileRecords[filePath] = {
        status: 'timed_out',
        error: surviving.error,
      };
      result.timedOutFiles.push({ filePath, error: surviving.error });
      await saveCheckpoint(outputPath, result);
      output.log(`Stryker timed out for ${filePath}; continuing`);
      continue;
    }
    result.scannedFiles.push(filePath);
    if (surviving === null) {
      result.fileRecords[filePath] = {
        status: 'no-tests',
        reason: 'No tests were executed',
      };
      await saveCheckpoint(outputPath, result);
      continue;
    }
    if (surviving.length) {
      result.fileWithSurvivingMutant = filePath;
      result.survivingMutants = surviving.map(
        /**
         * @param {any} mutant Mutant record.
         * @returns {object} Survivor record.
         */
        ({ id, mutatorName, replacement, location }) => ({
          filePath,
          id,
          mutatorName,
          replacement,
          location,
        })
      );
      result.fileRecords[filePath] = {
        status: 'survivors',
        survivingMutants: result.survivingMutants,
      };
      await saveCheckpoint(outputPath, result);
      output.log(
        `Found ${surviving.length} surviving mutant(s) in ${filePath}; stopping scan.`
      );
      break;
    }
    result.filesWithoutSurvivingMutant.push(filePath);
    result.fileRecords[filePath] = { status: 'clean' };
    await saveCheckpoint(outputPath, result);
    output.log(`No surviving mutant in ${filePath}`);
  }
}

/**
 *
 * @param context
 */
/**
 * Scan one source file.
 * @param {Record<string, any>} context Scan context.
 * @returns {Promise<Array<object> | null | {status: string, error?: string}>} Surviving mutants, no-tests marker, or timeout result.
 */
async function scanFile(/** @type {any} */ context) {
  const { filePath, outputPath, result, report } = context;
  const run = await runStryker({
    ...context,
    onChild: /** @param {any} child Child process. */ child => {
      context.activeChild = child;
    },
  });
  context.activeChild = null;
  if (run.status === 'no-tests') {
    result.skippedFiles.push({ filePath, reason: 'No tests were executed' });
    await saveCheckpoint(outputPath, result);
    return null;
  }
  if (run.status === 'timeout') {
    return { status: 'timeout', error: run.error };
  }
  if (run.status !== 'ok') throw new Error(`Stryker failed for ${filePath}`);
  const mutationReport = JSON.parse(await readFile(report, 'utf8'));
  const fileReport = /** @type {any} */ (mutationReport.files[filePath]);
  if (!fileReport && mutationReport.config?.mutate?.includes(filePath))
    return [];
  if (!fileReport)
    throw new Error(`Mutation report did not include ${filePath}`);
  return fileReport.mutants.filter(
    /**
     * @param {{ status: string }} mutant Mutant record.
     * @returns {boolean} Whether it survived.
     */
    ({ status }) => status === 'Survived'
  );
}

/**
 * Acquire the scan lock.
 * @param {string} lockPath Lock file path.
 * @param {any} processApi Process API.
 * @returns {Promise<{ release: () => Promise<void> }>} Lock handle.
 */
async function acquireLock(lockPath, processApi) {
  try {
    const handle = await open(lockPath, 'wx');
    await handle.writeFile(`${processApi.pid}\n`);
    return {
      release: async () => {
        await handle.close();
        await unlink(lockPath).catch(() => {});
      },
    };
  } catch (error) {
    if (error.code === 'EEXIST') {
      const owner = await readFile(lockPath, 'utf8').catch(() => '');
      const ownerPid = Number.parseInt(owner, 10);
      if (!ownerPid || !(await isProcessAlive(ownerPid, processApi))) {
        await unlink(lockPath).catch(() => {});
        return acquireLock(lockPath, processApi);
      }
      throw new Error(
        `Mutation scan lock exists at ${lockPath}; owner PID ${ownerPid} is still running.`
      );
    }
    throw error;
  }
}

/**
 * Check whether a process is alive.
 * @param {number} pid Process id.
 * @param {any} processApi Process API.
 * @returns {Promise<boolean>} Whether the process is alive.
 */
async function isProcessAlive(pid, processApi) {
  try {
    await access(`/proc/${pid}/cmdline`);
  } catch {
    return false;
  }
  try {
    processApi.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a prior scan checkpoint.
 * @param {string} outputPath Checkpoint path.
 * @param {string[]} order Current scan order.
 * @returns {Promise<object>} Checkpoint state.
 */
export async function loadCheckpoint(outputPath, order) {
  try {
    const saved = JSON.parse(await readFile(outputPath, 'utf8'));
    const scanned = new Set(saved.scannedFiles ?? []);
    return {
      scannedFiles: order.filter(file => scanned.has(file)),
      skippedFiles: saved.skippedFiles ?? [],
      filesWithoutSurvivingMutant: saved.filesWithoutSurvivingMutant ?? [],
      fileWithSurvivingMutant: saved.fileWithSurvivingMutant ?? null,
      survivingMutants: saved.survivingMutants ?? [],
      timedOutFiles: saved.timedOutFiles ?? [],
      failedFiles: saved.failedFiles ?? [],
      fileRecords: saved.fileRecords ?? {},
    };
  } catch {
    return {
      scannedFiles: [],
      skippedFiles: [],
      filesWithoutSurvivingMutant: [],
      fileWithSurvivingMutant: null,
      survivingMutants: [],
      timedOutFiles: [],
      failedFiles: [],
      fileRecords: {},
    };
  }
}

/**
 * Remove only abandoned Stryker sandboxes owned by this scanner.
 * @param {string} root Repository root.
 * @returns {Promise<void>} Resolves after cleanup.
 */
export async function cleanupStaleMutationSandboxes(root) {
  const tempRoot = path.join(root, '.stryker-tmp');
  const entries = await readdir(tempRoot, { withFileTypes: true }).catch(
    () => []
  );
  await Promise.all(
    entries
      .filter(
        entry =>
          entry.isDirectory() &&
          (entry.name.startsWith('sandbox-') ||
            entry.name.startsWith('backup-'))
      )
      .map(entry =>
        rm(path.join(tempRoot, entry.name), { recursive: true, force: true })
      )
  );
}

/**
 * Save a scan checkpoint.
 * @param {string} outputPath Checkpoint path.
 * @param {Record<string, any>} value Checkpoint state.
 * @returns {Promise<void>} Resolves after writing the checkpoint.
 */
async function saveCheckpoint(outputPath, value) {
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Recursively list source files.
 * @param {string} dir Directory to visit.
 * @param {string} root Repository root.
 * @returns {Promise<string[]>} Relative JavaScript paths.
 */
async function walk(dir, root) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full, root)));
    else if (entry.isFile() && entry.name.endsWith('.js'))
      files.push(path.relative(root, full).replaceAll(path.sep, '/'));
  }
  return files;
}

/**
 * Shuffle scan items.
 * @param {string[]} items Items to shuffle.
 * @returns {string[]} Shuffled items.
 */
function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

/**
 * Terminate a child process group.
 * @param {number} pid Process-group id.
 * @param {any} processApi Process API.
 * @returns {void} Nothing.
 */
function terminateProcessGroup(pid, processApi) {
  try {
    processApi.kill(-pid, 'SIGTERM');
  } catch {}
  setTimeout(() => {
    try {
      processApi.kill(-pid, 'SIGKILL');
    } catch {}
  }, 2000).unref();
}

/**
 * Run Stryker for one source file.
 * @param {Record<string, any>} options Run settings.
 * @returns {Promise<{ status: string, exitCode?: number, error?: string }>} Run result.
 */
function runStryker(options) {
  const {
    root,
    runCommand,
    runArgs,
    filePath,
    fileTimeoutMs,
    onChild,
    processApi,
    output,
  } = options;
  return new Promise((resolve, reject) => {
    let stderr = '',
      stdoutBuffer = '',
      stderrBuffer = '',
      settled = false;
    const child = spawn(runCommand, [...runArgs, '--', '--mutate', filePath], {
      cwd: root,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    onChild(child);
    const timer = setTimeout(() => {
      terminateProcessGroup(/** @type {number} */ (child.pid), processApi);
      finish(null, {
        status: 'timeout',
        error: `Stryker timed out after ${fileTimeoutMs}ms for ${filePath}`,
      });
    }, /** @type {number} */ (fileTimeoutMs));
    /**
     * @param {string} buffer Buffered output.
     * @param {string} prefix Output prefix.
     * @returns {string} Unflushed text.
     */
    const flush = (buffer, prefix) => {
      let next = buffer,
        newlineIndex = next.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = next.slice(0, newlineIndex).replace(/\r$/, '');
        if (line) output.log(`${prefix}${line}`);
        next = next.slice(newlineIndex + 1);
        newlineIndex = next.indexOf('\n');
      }
      return next;
    };
    const dump = () => {
      if (stdoutBuffer) output.log(`[stryker ${filePath}] ${stdoutBuffer}`);
      if (stderrBuffer)
        output.log(`[stryker ${filePath}][stderr] ${stderrBuffer}`);
    };
    /**
     * @param {unknown} error Failure value.
     * @param {any} [value] Result value.
     * @returns {void} Completes the promise.
     */
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      dump();
      if (error) reject(error);
      else resolve(value);
    };
    child.stdout.on('data', chunk => {
      stdoutBuffer = flush(
        stdoutBuffer + chunk.toString('utf8'),
        `[stryker ${filePath}] `
      );
    });
    child.stderr.on('data', chunk => {
      const text = chunk.toString('utf8');
      stderr += text;
      stderrBuffer = flush(
        stderrBuffer + text,
        `[stryker ${filePath}][stderr] `
      );
    });
    child.once('error', error => finish(error));
    child.once('exit', (code, signal) => {
      if (signal) {
        finish(
          new Error(
            `Stryker was terminated by signal ${signal} for ${filePath}`
          )
        );
        return;
      }
      if (stderr.includes('No tests were executed')) {
        finish(null, { status: 'no-tests', exitCode: code ?? 1 });
        return;
      }
      if (code !== 0) {
        finish(new Error(`Stryker failed for ${filePath}:\n${stderr}`));
        return;
      }
      finish(null, { status: 'ok', exitCode: code ?? 1 });
    });
  });
}
