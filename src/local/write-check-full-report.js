import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createCheckFullReport, renderCheckFullReportMarkdown } from '../core/local/checkFullReport.js';
import { bindStartupEffectBoundary } from './allow-effects.js';

const coverageDir = path.resolve('reports/coverage');
const readJson = file => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};
const readText = file => {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
};

bindStartupEffectBoundary(permission => {
  void permission;
  const baseSha = process.env.DADETO_CHECK_BASE_SHA;
  const changedPaths = baseSha && /^[a-f0-9]{40,64}$/i.test(baseSha)
    ? spawnSync('git', ['diff', '--name-only', '-z', '--no-renames', `${baseSha}...HEAD`, '--'], { encoding: 'utf8' })
    : { error: null, status: 1, stdout: '' };
  const readGit = args => spawnSync('git', args, { encoding: 'utf8' });
  const commit = process.env.GITHUB_SHA ?? readGit(['rev-parse', 'HEAD']).stdout?.trim() ?? '';
  const report = createCheckFullReport({
    commitSha: commit,
    workflowResult: process.env.CHECK_FULL_RESULT ?? 'unknown',
    coverageRun: readJson(path.join(coverageDir, 'full-test-run.json')),
    coverageSummary: readJson(path.join(coverageDir, 'coverage-summary.json')),
    changedPaths: changedPaths.error || changedPaths.status !== 0
      ? []
      : changedPaths.stdout.split('\0').filter(Boolean),
    failureLog: readText(path.resolve('reports/check-full.log')),
  });
  const markdown = renderCheckFullReportMarkdown(report);
  fs.mkdirSync(coverageDir, { recursive: true });
  fs.writeFileSync(path.join(coverageDir, 'check-full-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(coverageDir, 'check-full-report.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
});
