import { readFile, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT = path.resolve('.'), CORE = path.join(ROOT, 'src/core'), REPORT = path.join(ROOT, 'reports/mutation/mutation.json'), OUTPUT = path.join(ROOT, 'reports/mutation/core-mutant-scan.json');
const files = shuffle(await walk(CORE));
const result = { scannedFiles: [], skippedFiles: [], filesWithoutSurvivingMutant: [], fileWithSurvivingMutant: null, survivingMutants: [] };
process.stdout.write(`Found ${files.length} files under src/core\nWriting JSON result to ${path.relative(ROOT, OUTPUT)}\n`);

for (const [index, filePath] of files.entries()) { result.scannedFiles.push(filePath); process.stdout.write(`[${index + 1}/${files.length}] Running Stryker for ${filePath}\n`); const run = await runStryker(filePath); if (run.status === 'no-tests') { result.skippedFiles.push({ filePath, reason: 'No tests were executed' }); process.stdout.write(`Skipping ${filePath} because Stryker reported no tests were executed.\n`); continue; } if (run.status !== 'ok') throw new Error(`Stryker failed for ${filePath} with exit code ${run.exitCode}`); const report = JSON.parse(await readFile(REPORT, 'utf8')); const fileReport = report.files[filePath]; if (!fileReport) throw new Error(`Mutation report did not include ${filePath}`); const surviving = fileReport.mutants.filter(({ status }) => status === 'Survived'); if (surviving.length) { result.fileWithSurvivingMutant = filePath; result.survivingMutants = surviving.map(({ id, mutatorName, replacement, location }) => ({ filePath, id, mutatorName, replacement, location })); process.stdout.write(`Found ${surviving.length} surviving mutant(s) in ${filePath}; stopping scan.\n`); break; } result.filesWithoutSurvivingMutant.push(filePath); process.stdout.write(`No surviving mutant in ${filePath}\n`); }

await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`Wrote scan result to ${path.relative(ROOT, OUTPUT)}\nScanned ${result.scannedFiles.length} files\n${result.fileWithSurvivingMutant ? `Surviving mutant file: ${result.fileWithSurvivingMutant}` : 'No surviving mutant found'}\n`);

async function walk(dir) { const files = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) files.push(...await walk(full)); else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.relative(ROOT, full).replaceAll(path.sep, '/')); } return files; }

function shuffle(items) { const shuffled = [...items]; for (let index = shuffled.length - 1; index > 0; index -= 1) { const swapIndex = crypto.randomInt(index + 1); [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]; } return shuffled; }

function runStryker(filePath) {
  return new Promise((resolve, reject) => {
    let stderr = '', stdoutBuffer = '', stderrBuffer = '';
    const child = spawn('npm', ['run', 'mutant:all', '--', '--mutate', filePath], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const flush = (buffer, prefix) => { let next = buffer, newlineIndex = next.indexOf('\n'); while (newlineIndex !== -1) { const line = next.slice(0, newlineIndex).replace(/\r$/, ''); if (line) process.stdout.write(`${prefix}${line}\n`); next = next.slice(newlineIndex + 1); newlineIndex = next.indexOf('\n'); } return next; };
    const dump = () => { if (stdoutBuffer) process.stdout.write(`[stryker ${filePath}] ${stdoutBuffer}\n`); if (stderrBuffer) process.stdout.write(`[stryker ${filePath}][stderr] ${stderrBuffer}\n`); };
    child.stdout.on('data', chunk => { stdoutBuffer = flush(stdoutBuffer + chunk.toString('utf8'), `[stryker ${filePath}] `); });
    child.stderr.on('data', chunk => { const text = chunk.toString('utf8'); stderr += text; stderrBuffer = flush(stderrBuffer + text, `[stryker ${filePath}][stderr] `); });
    child.once('error', error => { dump(); reject(error); });
    child.once('exit', (code, signal) => { dump(); if (signal) return reject(new Error(`Stryker was terminated by signal ${signal} for ${filePath}`)); if (stderr.includes('No tests were executed')) return resolve({ status: 'no-tests', exitCode: typeof code === 'number' ? code : 1 }); if (code !== 0) return reject(new Error(`Stryker failed for ${filePath}:\n${stderr}`)); resolve({ status: 'ok', exitCode: typeof code === 'number' ? code : 1 }); });
  });
}
