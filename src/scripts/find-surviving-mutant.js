import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const ROOT_DIR = path.resolve('.');
const CORE_DIR = path.join(ROOT_DIR, 'src', 'core');
const REPORT_PATH = path.join(ROOT_DIR, 'reports', 'mutation', 'mutation.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'reports', 'mutation', 'core-mutant-scan.json');

const files = shuffle(
  await collectJavaScriptFiles(CORE_DIR)
);

process.stdout.write(
  [
    `Found ${files.length} files under src/core`,
    `Writing JSON result to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`,
  ].join('\n') + '\n'
);

const result = {
  scannedFiles: [],
  skippedFiles: [],
  filesWithoutSurvivingMutant: [],
  fileWithSurvivingMutant: null,
  survivingMutants: [],
};

for (const [index, filePath] of files.entries()) {
  result.scannedFiles.push(filePath);
  process.stdout.write(
    `[${index + 1}/${files.length}] Running Stryker for ${filePath}\n`
  );

  const runResult = await runStrykerForFile(filePath);
  if (runResult.status === 'no-tests') {
    result.skippedFiles.push({
      filePath,
      reason: 'No tests were executed',
    });
    process.stdout.write(
      `Skipping ${filePath} because Stryker reported no tests were executed.\n`
    );
    continue;
  }

  if (runResult.status !== 'ok') {
    throw new Error(`Stryker failed for ${filePath} with exit code ${runResult.exitCode}`);
  }

  const report = JSON.parse(await readFile(REPORT_PATH, 'utf8'));
  const fileReport = report.files[filePath];

  if (!fileReport) {
    throw new Error(`Mutation report did not include ${filePath}`);
  }

  const survivingMutants = fileReport.mutants.filter((mutant) => mutant.status === 'Survived');

  if (survivingMutants.length > 0) {
    result.fileWithSurvivingMutant = filePath;
    result.survivingMutants = survivingMutants.map((mutant) => ({
      filePath,
      id: mutant.id,
      mutatorName: mutant.mutatorName,
      replacement: mutant.replacement,
      location: mutant.location,
    }));
    process.stdout.write(
      `Found ${survivingMutants.length} surviving mutant(s) in ${filePath}; stopping scan.\n`
    );
    break;
  }

  result.filesWithoutSurvivingMutant.push(filePath);
  process.stdout.write(`No surviving mutant in ${filePath}\n`);
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(
  [
    `Wrote scan result to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`,
    `Scanned ${result.scannedFiles.length} files`,
    result.fileWithSurvivingMutant
      ? `Surviving mutant file: ${result.fileWithSurvivingMutant}`
      : 'No surviving mutant found',
  ].join('\n') + '\n'
);

async function collectJavaScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collected.push(...await collectJavaScriptFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      collected.push(path.relative(ROOT_DIR, absolutePath).replaceAll(path.sep, '/'));
    }
  }

  return collected;
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function runStrykerForFile(filePath) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';
    const child = spawn(
      'npm',
      ['run', 'mutant:all', '--', '--mutate', filePath],
      {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString('utf8');
      stdoutBuffer = flushBufferedLines(stdoutBuffer, (line) => {
        process.stdout.write(`[stryker ${filePath}] ${line}\n`);
      });
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      stderr += text;
      stderrBuffer += text;
      stderrBuffer = flushBufferedLines(stderrBuffer, (line) => {
        process.stdout.write(`[stryker ${filePath}][stderr] ${line}\n`);
      });
    });

    child.once('error', (error) => {
      if (stdoutBuffer) {
        process.stdout.write(`[stryker ${filePath}] ${stdoutBuffer}\n`);
      }
      if (stderrBuffer) {
        process.stdout.write(`[stryker ${filePath}][stderr] ${stderrBuffer}\n`);
      }
      reject(error);
    });
    child.once('exit', (code, signal) => {
      if (stdoutBuffer) {
        process.stdout.write(`[stryker ${filePath}] ${stdoutBuffer}\n`);
      }
      if (stderrBuffer) {
        process.stdout.write(`[stryker ${filePath}][stderr] ${stderrBuffer}\n`);
      }

      if (signal) {
        reject(new Error(`Stryker was terminated by signal ${signal} for ${filePath}`));
        return;
      }

      if (stderr.includes('No tests were executed')) {
        resolve({
          status: 'no-tests',
          exitCode: typeof code === 'number' ? code : 1,
        });
        return;
      }

      if (code !== 0) {
        reject(new Error(`Stryker failed for ${filePath}:\n${stderr}`));
        return;
      }

      resolve({
        status: 'ok',
        exitCode: typeof code === 'number' ? code : 1,
      });
    });
  });
}

function flushBufferedLines(buffer, onLine) {
  let nextBuffer = buffer;
  let newlineIndex = nextBuffer.indexOf('\n');

  while (newlineIndex !== -1) {
    const line = nextBuffer.slice(0, newlineIndex).replace(/\r$/, '');
    if (line.length > 0) {
      onLine(line);
    }
    nextBuffer = nextBuffer.slice(newlineIndex + 1);
    newlineIndex = nextBuffer.indexOf('\n');
  }

  return nextBuffer;
}
