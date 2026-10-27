import { afterEach, expect, test } from '@jest/globals';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { load } from 'js-yaml';

const workflow = load(readFileSync('.github/workflows/gcp-test.yml', 'utf8'));
const job = workflow.jobs.terraform;
const download = job.steps.find(
  step => step.name === 'Download Playwright report from GCS'
);
const upload = job.steps.find(step => step.name === 'Upload e2e artifacts');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Execute the actual workflow shell against local CLI stubs.
 * @param {string} [missingTree] Required remote tree reported missing.
 * @returns {object} Shell result and fixture paths.
 */
function runDownload(missingTree = '') {
  const root = mkdtempSync(path.join(tmpdir(), 'dadeto-report-transfer-'));
  temporaryRoots.push(root);
  const workspace = path.join(root, 'repository with spaces');
  const infra = path.join(workspace, 'infra');
  const bin = path.join(root, 'bin');
  const callsLog = path.join(root, 'calls.jsonl');
  mkdirSync(infra, { recursive: true });
  mkdirSync(bin);
  writeFileSync(path.join(infra, 'keep.txt'), 'unrelated file');
  for (const tree of ['playwright-report', 'test-results']) {
    mkdirSync(path.join(workspace, tree));
    writeFileSync(path.join(workspace, tree, 'stale.txt'), 'stale report');
  }
  writeFileSync(
    path.join(bin, 'terraform'),
    `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.CALLS_LOG, JSON.stringify({tool:'terraform',cwd:process.cwd(),args:process.argv.slice(2)})+String.fromCharCode(10));
process.stdout.write('reports-bucket');
`,
    { mode: 0o755 }
  );
  writeFileSync(
    path.join(bin, 'gcloud'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS_LOG, JSON.stringify({tool:'gcloud',cwd:process.cwd(),args})+String.fromCharCode(10));
if (args[0] !== 'storage') process.exit(2);
if (args[1] === 'ls') {
  if (process.env.MISSING_TREE && args[2].includes('/'+process.env.MISSING_TREE+'/')) process.exit(1);
  process.exit(0);
}
if (args[1] !== 'cp') process.exit(2);
const tree = args[3].split('/').pop();
const target = path.join(args[4], tree);
fs.mkdirSync(target, {recursive:true});
fs.writeFileSync(path.join(target, tree === 'playwright-report' ? 'index.html' : 'interaction.json'), 'fixture artifact');
`,
    { mode: 0o755 }
  );
  const result = spawnSync('bash', ['-euo', 'pipefail', '-c', download.run], {
    cwd: path.resolve(
      workspace,
      download['working-directory'] ?? job.defaults.run['working-directory']
    ),
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      GITHUB_WORKSPACE: workspace,
      ['TF_VAR_environment']: 't-fixture',
      GITHUB_RUN_ID: '123',
      CALLS_LOG: callsLog,
      MISSING_TREE: missingTree,
    },
    encoding: 'utf8',
  });
  const calls = readFileSync(callsLog, 'utf8')
    .trim()
    .split(String.fromCharCode(10))
    .map(line => JSON.parse(line));
  return { result, calls, workspace, infra };
}

test('downloads reports where the artifact action reads them while Terraform stays in infra', () => {
  const f = runDownload();
  expect(f.result.status).toBe(0);
  expect(f.calls.find(call => call.tool === 'terraform').cwd).toBe(f.infra);
  expect(
    f.calls
      .filter(call => call.tool === 'gcloud' && call.args[1] === 'cp')
      .map(call => path.resolve(call.cwd, call.args[4]))
  ).toEqual([f.workspace, f.workspace]);
  const artifactPaths = upload.with.path
    .trim()
    .split(String.fromCharCode(10))
    .map(entry => entry.trim());
  expect(artifactPaths).toContain('playwright-report');
  expect(artifactPaths).toContain('test-results');
  expect(upload.with['if-no-files-found']).toBe('error');
  expect(
    existsSync(path.join(f.workspace, 'playwright-report/index.html'))
  ).toBe(true);
  expect(
    existsSync(path.join(f.workspace, 'test-results/interaction.json'))
  ).toBe(true);
  for (const tree of ['playwright-report', 'test-results']) {
    expect(existsSync(path.join(f.workspace, tree, 'stale.txt'))).toBe(false);
    expect(existsSync(path.join(f.infra, tree))).toBe(false);
  }
  expect(readFileSync(path.join(f.infra, 'keep.txt'), 'utf8')).toBe(
    'unrelated file'
  );
});

test('fails the download step if either required report tree is unavailable', () => {
  const f = runDownload('test-results');
  expect(f.result.status).not.toBe(0);
  expect(f.result.stdout).toContain('Missing test-results');
});
