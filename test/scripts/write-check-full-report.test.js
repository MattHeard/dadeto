import { expect, test } from '@jest/globals';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test.each([
  ['invalid JSON', 'not-json', '{}', { status: 0, available: false }],
  ['malformed shape', '{}', '{}', { status: 1, available: false }],
  [
    'irrelevant malformed reason',
    JSON.stringify({
      total: Object.fromEntries(
        ['statements', 'branches', 'functions', 'lines'].map(metric => [
          metric,
          { pct: 100 },
        ])
      ),
    }),
    '{"failureReason":{"toString":17}}',
    { status: 0, available: true },
  ],
])(
  'the actual report adapter preserves %s semantics',
  (_name, summary, run, expected) => {
    const directory = mkdtempSync(
      path.join(os.tmpdir(), 'dadeto-report-json-')
    );
    const coverageDir = path.join(directory, 'reports/coverage');
    const entrypoint = fileURLToPath(
      new URL('../../src/local/write-check-full-report.js', import.meta.url)
    );
    try {
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(path.join(coverageDir, 'coverage-summary.json'), summary);
      writeFileSync(path.join(coverageDir, 'full-test-run.json'), run);
      const execution = spawnSync(process.execPath, [entrypoint], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_SHA: 'fixture',
          DADETO_CHECK_BASE_SHA: '',
          CHECK_FULL_RESULT: 'failure',
          GITHUB_STEP_SUMMARY: '',
        },
      });
      expect(execution.status).toBe(expected.status);
      const reportPath = path.join(coverageDir, 'check-full-report.json');
      if (expected.status === 0)
        expect(
          JSON.parse(readFileSync(reportPath, 'utf8')).coverageAvailable
        ).toBe(expected.available);
      else {
        expect(execution.stderr).toContain(
          "TypeError: Cannot read properties of undefined (reading 'statements')"
        );
        expect(existsSync(reportPath)).toBe(false);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
);

test('the actual report entrypoint distinguishes a Git rename from missing current coverage', () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), 'dadeto-report-deletion-')
  );
  const entrypoint = fileURLToPath(
    new URL('../../src/local/write-check-full-report.js', import.meta.url)
  );
  const git = args =>
    execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
  const commit = message =>
    git([
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--quiet',
      '-m',
      message,
    ]);
  const oldPath = 'src/core/old.js';
  const newPath = 'src/logic/core/new.js';
  const missing = 'src/logic/boundary/missing.js';
  try {
    git(['init', '--quiet']);
    mkdirSync(path.join(directory, 'src/core'), { recursive: true });
    writeFileSync(path.join(directory, oldPath), 'export const value = 1;\n');
    git(['add', '-A']);
    commit('baseline');
    const base = git(['rev-parse', 'HEAD']).trim();
    mkdirSync(path.join(directory, 'src/logic/core'), { recursive: true });
    mkdirSync(path.join(directory, 'src/logic/boundary'), { recursive: true });
    renameSync(path.join(directory, oldPath), path.join(directory, newPath));
    writeFileSync(
      path.join(directory, missing),
      'export const unmeasured = 2;\n'
    );
    git(['add', '-A']);
    commit('move and add');
    const coverageDir = path.join(directory, 'reports/coverage');
    mkdirSync(coverageDir, { recursive: true });
    const metrics = Object.fromEntries(
      ['statements', 'branches', 'functions', 'lines'].map(metric => [
        metric,
        { pct: 100 },
      ])
    );
    writeFileSync(
      path.join(coverageDir, 'coverage-summary.json'),
      JSON.stringify({ total: metrics, [newPath]: metrics })
    );
    execFileSync(process.execPath, [entrypoint], {
      cwd: directory,
      env: {
        ...process.env,
        DADETO_CHECK_BASE_SHA: base,
        CHECK_FULL_RESULT: 'success',
        GITHUB_SHA: git(['rev-parse', 'HEAD']).trim(),
        GITHUB_STEP_SUMMARY: '',
      },
    });
    const report = JSON.parse(
      readFileSync(path.join(coverageDir, 'check-full-report.json'), 'utf8')
    );
    expect(report.changedFileCoverage.map(entry => entry.file)).toEqual([
      newPath,
    ]);
    expect(report.changedFileCoverageNote).toBe(
      `Changed logic files are absent from the coverage summary: \`${missing}\`.\n\nDeleted logic files have no current source to measure: \`${oldPath}\`.`
    );
    expect(
      readFileSync(path.join(coverageDir, 'check-full-report.md'), 'utf8')
    ).toContain(report.changedFileCoverageNote);
    expect(report.commitSha).toBe(git(['rev-parse', 'HEAD']).trim());
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
