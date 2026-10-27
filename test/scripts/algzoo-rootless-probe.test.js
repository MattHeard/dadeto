import { afterEach, expect, test } from '@jest/globals';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const script = path.resolve(
  'src/local/interpretability/probe-algzoo-rootless.sh'
);
const image = `docker.io/library/python@sha256:${'a'.repeat(64)}`;
const roots = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Run the real shell with an inert container-runtime stub, never a real container.
 * @param {object} [overrides] Stub failure mode.
 * @param {string} [imageArg] Requested runtime image.
 * @returns {object} Command result and retained paths/calls.
 */
function runProbe(overrides = {}, imageArg = image) {
  const root = mkdtempSync(path.join(tmpdir(), 'algzoo probe with spaces '));
  roots.push(root);
  const bin = path.join(root, 'bin');
  const scratch = path.join(root, 'scratch');
  mkdirSync(bin);
  mkdirSync(scratch);
  const callsPath = path.join(root, 'calls.jsonl');
  const report = path.join(root, 'report');
  writeFileSync(
    path.join(bin, 'podman'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS_LOG, JSON.stringify(args)+'\\n');
if (args[0] === 'info') {
  if (args[2].includes('Rootless')) process.stdout.write(process.env.ROOTLESS);
  else process.stdout.write(process.env.CONTROLLERS);
} else if (args[0] === '--version') process.stdout.write('podman version fixture');
else if (args[0] === 'run') {
  const probe = fs.readFileSync(0, 'utf8');
  fs.writeFileSync(process.env.PROBE_SOURCE, probe);
  if (process.env.FAIL_RUN === 'true') process.exit(42);
  const workspace = args[args.lastIndexOf('--volume') + 1].split(':')[0];
  fs.writeFileSync(path.join(workspace, 'result.txt'), 'synthetic-workspace-output\\n');
  const checks = Object.fromEntries(['allowedInputReadable','workspaceWritable','inputWriteDenied','rootWriteDenied','externalCanaryHidden','hostEnvironmentHidden','onlyLoopbackInterface','networkDenied'].map(key => [key, key !== process.env.FAIL_CHECK]));
  process.stdout.write(JSON.stringify({checks,passed:true}));
} else if (args[0] === 'container') process.exit(1);
else if (!['image','rm'].includes(args[0])) process.exit(2);
`,
    { mode: 0o755 }
  );
  const result = spawnSync('bash', [script, imageArg, report], {
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      TMPDIR: scratch,
      CALLS_LOG: callsPath,
      PROBE_SOURCE: path.join(root, 'probe.py'),
      ROOTLESS: 'true',
      CONTROLLERS: '["cpu","memory","pids"]',
      ...overrides,
    },
    encoding: 'utf8',
    timeout: 10000,
  });
  const calls = existsSync(callsPath)
    ? readFileSync(callsPath, 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line))
    : [];
  return { result, calls, report, root, scratch };
}

test('requires a digest and a rootless runtime before any container or report', () => {
  const mutable = runProbe({}, 'docker.io/library/python:latest');
  expect(mutable.result.status).toBe(2);
  expect(mutable.calls).toEqual([]);
  const rootful = runProbe({ ROOTLESS: 'false' });
  expect(rootful.result.status).toBe(1);
  expect(rootful.result.stderr).toContain('rootless Podman');
  expect(existsSync(rootful.report)).toBe(false);
});

test('records missing memory controller and never launches a container', () => {
  const f = runProbe({ CONTROLLERS: '["cpu","pids"]' });
  expect(f.result.status).toBe(1);
  expect(f.result.stderr).toContain('no container started');
  expect(f.calls.some(args => args[0] === 'run')).toBe(false);
  expect(
    JSON.parse(readFileSync(path.join(f.report, 'runtime.json'), 'utf8'))
  ).toMatchObject({
    rootless: true,
    resourcePreflightPassed: false,
    scientificLaunchReady: false,
  });
  expect(readFileSync(path.join(f.report, 'SHA256SUMS'), 'utf8')).toMatch(
    /^[a-f0-9]{64}  runtime.json/
  );
});

test('runs only bounded isolated synthetic probes and verifies cleanup', () => {
  const f = runProbe();
  expect(f.result.status).toBe(0);
  const args = f.calls.find(args => args[0] === 'run');
  for (const flag of [
    '--rm',
    '--pull=never',
    '--network=none',
    '--read-only',
    '--userns=keep-id',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--pids-limit=64',
    '--memory=128m',
    '--cpus=1',
    '--http-proxy=false',
    '--unsetenv-all',
  ])
    expect(args).toContain(flag);
  expect(args.slice(-2)).toEqual([image, '-']);
  expect(args).not.toContain('--env-host');
  expect(args).not.toContain('--privileged');
  const mounts = args.flatMap((arg, index) =>
    arg === '--volume' ? [args[index + 1]] : []
  );
  expect(mounts).toHaveLength(2);
  expect(mounts[0]).toMatch(/\/inputs:\/inputs:ro$/);
  expect(mounts[1]).toMatch(/\/workspace:\/workspace:rw$/);
  expect(mounts.every(mount => mount.startsWith(f.scratch))).toBe(true);
  expect(
    JSON.parse(readFileSync(path.join(f.report, 'cleanup.json'), 'utf8'))
  ).toEqual({ containerRemoved: true, scratchRemoved: true });
  expect(f.calls.some(args => args[0] === 'rm')).toBe(true);
  expect(readFileSync(path.join(f.root, 'probe.py'), 'utf8')).toContain(
    "connection.connect(('192.0.2.1', 9))"
  );
});

test.each(['', '1'])(
  'rejects a failed individual probe even with overall pass and PYTHONOPTIMIZE=%s',
  optimize => {
    const f = runProbe({
      FAIL_CHECK: 'networkDenied',
      PYTHONOPTIMIZE: optimize,
    });
    expect(f.result.status).not.toBe(0);
    expect(f.result.stderr).toContain('Isolation probe failed');
    expect(f.calls.some(args => args[0] === 'rm')).toBe(true);
    expect(existsSync(path.join(f.report, 'cleanup.json'))).toBe(false);
  }
);

test('preserves runtime launch failure and cleans up without claiming success', () => {
  const f = runProbe({ FAIL_RUN: 'true' });
  expect(f.result.status).toBe(42);
  expect(f.calls.some(args => args[0] === 'rm')).toBe(true);
  expect(existsSync(path.join(f.report, 'cleanup.json'))).toBe(false);
});
