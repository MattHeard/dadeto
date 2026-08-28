import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000;
const ROOT = path.resolve('.');

/**
 * @typedef {{ file: string, status?: string, survivingMutants?: number | null }} ScanRecord
 */

/**
 * Enumerate JavaScript mutation targets in stable order.
 * @param {string} directory Directory to scan.
 * @param {{ readdir: Function }} fsModule Filesystem dependency.
 * @returns {Promise<string[]>} Relative file paths.
 */
export async function enumerateMutationTargets(directory, fsModule) {
  const entries = await fsModule.readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await enumerateMutationTargets(fullPath, fsModule)));
    } else if (/\.(?:js|mjs)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result.sort();
}

/**
 * Read the latest terminal state for each file.
 * @param {string} statePath JSONL state path.
 * @param {{ readFile: Function }} fsModule Filesystem dependency.
 * @returns {Promise<Map<string, ScanRecord>>} Latest records.
 */
export async function readLatestState(statePath, fsModule) {
  try {
    const text = await fsModule.readFile(statePath, 'utf8');
    const state = new Map(
      text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .map(record => [record.file, record])
    );
    for (const [file, record] of state) {
      if (record.status !== 'success' || !record.reportPath) continue;
      try {
        const counts = await readFileReport(record.reportPath, file, fsModule);
        state.set(file, { ...record, ...counts });
      } catch {
        // Preserve the checkpoint if its historical report is unavailable.
      }
    }
    return state;
  } catch {
    return new Map();
  }
}

/**
 * Count confirmed survivors in a report for exactly one target file.
 * @param {string} reportPath Mutation report path.
 * @param {string} file Target file.
 * @param {{ readFile: Function }} fsModule Filesystem dependency.
 * @returns {Promise<{ mutantCount: number, survivingMutants: number }>} Counts.
 */
export async function readFileReport(reportPath, file, fsModule) {
  const report = JSON.parse(await fsModule.readFile(reportPath, 'utf8'));
  const matchingFiles = Object.entries(report.files ?? {})
    .filter(([key]) => key === file || key.endsWith(`/${file}`))
    .map(([, value]) => value);
  if (matchingFiles.length === 0 && Object.keys(report.files ?? {}).length === 0) {
    return { mutantCount: 0, survivingMutants: 0 };
  }
  if (matchingFiles.length !== 1) {
    throw new Error(`Mutation report did not uniquely identify ${file}`);
  }
  const mutants = Object.values(matchingFiles[0].mutants ?? {});
  return {
    mutantCount: mutants.length,
    survivingMutants: mutants.filter(
      mutant => mutant.status === 'Survived' && mutant.static !== true
    ).length,
  };
}

/**
 * Run a child command with a process-group wall-clock limit.
 * @param {{ command: string, args: string[], cwd: string, timeoutMs: number, env?: object, spawnImpl?: Function }} options Run options.
 * @returns {Promise<{ code: number | null, timedOut: boolean, signal: string | null }>} Result.
 */
export function runBoundedCommand({
  command,
  args,
  cwd,
  timeoutMs,
  env,
  spawnImpl = spawn,
}) {
  return new Promise(resolve => {
    const child = spawnImpl(command, args, {
      cwd,
      stdio: 'inherit',
      detached: true,
      env,
    });
    let settled = false;
    const finish = result => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch {}
        }, 5000).unref();
      } catch {}
      finish({ code: null, timedOut: true, signal: 'SIGTERM' });
    }, timeoutMs);
    child.once('error', error => {
      clearTimeout(timer);
      finish({ code: null, timedOut: false, signal: error.message });
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      finish({ code, timedOut: false, signal });
    });
  });
}

async function appendRecord(statePath, record, fsModule) {
  await fsModule.appendFile(statePath, `${JSON.stringify(record)}\n`);
}

async function writeSurvivorList(state, survivorListPath, files, fsModule) {
  const currentFiles = new Set(files);
  const survivors = [...state.values()]
    .filter(
      record =>
        currentFiles.has(record.file) &&
        record.status === 'success' &&
        Number.isInteger(record.survivingMutants) &&
        record.survivingMutants > 0
    )
    .map(record => ({
      file: record.file,
      survivingMutants: record.survivingMutants,
    }));
  await fsModule.writeFile(
    survivorListPath,
    `${JSON.stringify(survivors, null, 2)}\n`
  );
}

async function writeSummary(state, files, summaryPath, fsModule) {
  const currentFiles = new Set(files);
  const terminal = [...state.values()].filter(
    record => currentFiles.has(record.file) && record.status
  );
  await fsModule.writeFile(
    summaryPath,
    `${JSON.stringify(
      {
        total: files.length,
        completed: terminal.filter(record =>
          record.status === 'success' || record.status === 'timed_out'
        ).length,
        pending: files.length - terminal.filter(record =>
          record.status === 'success' || record.status === 'timed_out'
        ).length,
        failed: terminal.filter(record => record.status === 'failed').length,
        timedOut: terminal.filter(record => record.status === 'timed_out')
          .length,
        survivors: terminal.filter(record => record.survivingMutants > 0)
          .length,
      },
      null,
      2
    )}\n`
  );
}

/**
 * Find tests that reference a source file, falling back to the full suite.
 * @param {string} rootDir Repository root.
 * @param {string} file Relative source path.
 * @param {{ readFile: Function, readdir: Function }} fsModule Filesystem APIs.
 * @returns {Promise<string[]>} Relative test paths.
 */
export async function findRelatedTests(rootDir, file, fsModule) {
  const tests = [];
  const allTests = [];
  const visit = async directory => {
    for (const entry of await fsModule.readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (/\.test\.[cm]?js$/.test(entry.name)) {
        allTests.push(path.relative(rootDir, fullPath).replaceAll(path.sep, '/'));
        const source = await fsModule.readFile(fullPath, 'utf8');
        if (source.includes(file) || source.includes(path.basename(file)))
          tests.push(path.relative(rootDir, fullPath).replaceAll(path.sep, '/'));
      }
    }
  };
  await visit(path.join(rootDir, 'test'));
  return tests.length > 0 ? tests.sort() : allTests.sort();
}

/**
 * Run the resumable scan.
 * @param {{ rootDir?: string, timeoutMs?: number, fsModule?: object, spawnImpl?: Function, runCommand?: Function }} options Scan options.
 * @returns {Promise<object>} Scan summary.
 */
export async function scanCoreMutants(options = {}) {
  const rootDir = options.rootDir || ROOT;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const fsModule = options.fsModule || {
    appendFile,
    mkdir,
    rm,
    readFile,
    writeFile,
    readdir: (directory, options) =>
      import('node:fs/promises').then(fs => fs.readdir(directory, options)),
  };
  const run =
    options.runCommand ||
    (args => runBoundedCommand({ ...args, spawnImpl: options.spawnImpl }));
  const reportRoot = path.join(rootDir, 'reports', 'mutation');
  const worktreePath = path.join(rootDir, '.worktrees', 'core-mutant-scan');
  const lockPath = path.join(reportRoot, '.core-file-scan.lock');
  const statePath = path.join(reportRoot, 'core-file-scan.jsonl');
  const summaryPath = path.join(reportRoot, 'core-file-scan-summary.json');
  const survivorListPath = path.join(
    reportRoot,
    'core-files-with-surviving-mutants.json'
  );
  await fsModule.mkdir(reportRoot, { recursive: true });
  await fsModule.mkdir(path.dirname(worktreePath), { recursive: true });
  try {
    await fsModule.mkdir(lockPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Mutation scan already running for ${rootDir}`);
    }
    throw error;
  }
  const state = await readLatestState(statePath, fsModule);
  const files = await enumerateMutationTargets(
    path.join(rootDir, 'src', 'core'),
    fsModule
  );
  const mutationFiles = files.map(file =>
    path.relative(rootDir, file).replaceAll(path.sep, '/')
  );
  const baseEnv = { ...process.env, BEADS_NO_DAEMON: '1' };
  await run({
    command: 'git',
    args: ['worktree', 'remove', '--force', worktreePath],
    cwd: rootDir,
    timeoutMs,
    env: baseEnv,
  });
  const prepared = await run({
    command: 'git',
    args: ['worktree', 'add', '--detach', worktreePath],
    cwd: rootDir,
    timeoutMs,
    env: baseEnv,
  });
  if (prepared.code !== 0)
    throw new Error('Unable to prepare mutation worktree');
  const installed = await run({
    command: 'npm',
    args: ['install'],
    cwd: worktreePath,
    timeoutMs,
    env: baseEnv,
  });
  if (installed.code !== 0)
    throw new Error('Unable to install mutation worktree dependencies');
  try {
    for (const absolutePath of files) {
      const file = path.relative(rootDir, absolutePath);
      const previous = state.get(file);
      const refreshSurvivor =
        options.refreshSurvivors &&
        previous?.status === 'success' &&
        previous.survivingMutants > 0;
      if (['success', 'timed_out'].includes(previous?.status) && !refreshSurvivor)
        continue;
      const startedAt = new Date().toISOString();
      const startedAtMs = Date.now();
      await appendRecord(
        statePath,
        { type: 'start', phase: 'mutation', file, startedAt },
        fsModule
      );
      const result = await run({
        command: 'npm',
        args: ['run', 'mutant:worktree', '--', file],
        cwd: rootDir,
        timeoutMs,
        env: {
          ...baseEnv,
          STRYKER_REUSE_WORKTREE_PATH: worktreePath,
          ...(options.findTests
            ? {
                STRYKER_TEST_FILES: JSON.stringify(
                  await findRelatedTests(rootDir, file, fsModule)
                ),
              }
            : {}),
        },
      });
      const record = {
        type: 'result',
        phase: result.timedOut ? 'mutation' : 'complete',
        file,
        status: result.timedOut
          ? 'timed_out'
          : result.code === 0
            ? 'success'
            : 'failed',
        exitCode: result.code,
        signal: result.signal,
        error: result.timedOut ? `Timed out after ${timeoutMs}ms` : null,
        durationMs: Date.now() - startedAtMs,
        finishedAt: new Date().toISOString(),
      };
      if (record.status === 'success') {
        const reportPath = path.join(
          reportRoot,
          `${file.replaceAll('/', '__')}.json`
        );
        try {
          const currentReportPath = path.join(reportRoot, 'mutation.json');
          const counts = await readFileReport(
            currentReportPath,
            file,
            fsModule
          );
          await fsModule.writeFile(
            reportPath,
            await fsModule.readFile(currentReportPath, 'utf8')
          );
          Object.assign(record, counts, { reportPath });
        } catch (error) {
          record.status = 'failed';
          record.error = error.message;
        }
      }
      await appendRecord(statePath, record, fsModule);
      state.set(file, record);
      await writeSurvivorList(state, survivorListPath, mutationFiles, fsModule);
      await writeSummary(state, mutationFiles, summaryPath, fsModule);
    }
  } finally {
    await run({
      command: 'git',
      args: ['worktree', 'remove', '--force', worktreePath],
      cwd: rootDir,
      timeoutMs,
      env: baseEnv,
    });
    await fsModule.rm(lockPath, { recursive: true, force: true });
  }
  await writeSummary(state, mutationFiles, summaryPath, fsModule);
  return JSON.parse(await fsModule.readFile(summaryPath, 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const timeoutMs = Number(
    process.env.CORE_MUTANT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );
  const summary = await scanCoreMutants({ timeoutMs });
  console.log(`Mutation scan summary: ${JSON.stringify(summary)}`);
}
