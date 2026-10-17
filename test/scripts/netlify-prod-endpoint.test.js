import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const resolverPath = path.resolve(
  '.github/scripts/resolve-netlify-rental-endpoint.sh'
);
const validRun = {
  databaseId: 123,
  workflowName: 'gcp-prod',
  headBranch: 'main',
  status: 'completed',
  conclusion: 'success',
};

describe('Netlify production endpoint resolver', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'dadeto-netlify-endpoint-')
    );
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('selects, validates, and downloads the latest successful main gcp-prod run for pushes', () => {
    const result = runResolver({
      runList: [{ databaseId: validRun.databaseId }],
      run: validRun,
      endpoint: 'https://search.example.run.app',
    });

    expect(result.status).toBe(0);
    expect(result.envFile).toBe(
      'DADETO_BUILD_TARGET=production\n' +
        'OBJECT_MINUTE_RENTAL_SEARCH_URL=https://search.example.run.app\n'
    );
    expect(result.calls).toContain(
      'run list --repo MattHeard/dadeto --workflow gcp-prod.yml --branch main --status success --limit 1 --json databaseId'
    );
    expect(result.calls).toContain(
      'run view 123 --repo MattHeard/dadeto --json databaseId,workflowName,headBranch,status,conclusion'
    );
    expect(
      result.calls.some(call =>
        call.startsWith(
          'run download 123 --repo MattHeard/dadeto --name object-minute-rental-search-url --dir '
        )
      )
    ).toBe(true);
  });

  it('validates the explicitly selected run for manual dispatch without listing runs', () => {
    const result = runResolver({
      runId: '456',
      runList: [{ databaseId: 123 }],
      run: { ...validRun, databaseId: 456 },
      endpoint: 'https://search.example.run.app',
    });

    expect(result.status).toBe(0);
    expect(result.calls.some(call => call.startsWith('run list '))).toBe(false);
    expect(result.calls).toContain(
      'run view 456 --repo MattHeard/dadeto --json databaseId,workflowName,headBranch,status,conclusion'
    );
  });

  it.each([
    ['another repository branch', { ...validRun, headBranch: 'feature' }],
    ['another workflow', { ...validRun, workflowName: 'gcp-test' }],
    [
      'an incomplete run',
      { ...validRun, status: 'in_progress', conclusion: null },
    ],
    ['a failed run', { ...validRun, conclusion: 'failure' }],
  ])('rejects %s before downloading its artifact', (_description, run) => {
    const result = runResolver({
      run,
      endpoint: 'https://search.example.run.app',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'completed successful gcp-prod run on main'
    );
    expect(result.calls.some(call => call.startsWith('run download '))).toBe(
      false
    );
    expect(result.envFile).toBe('');
  });

  it('reports when no successful gcp-prod run exists for the push', () => {
    const result = runResolver({ runList: [], run: validRun });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No successful gcp-prod run on main');
    expect(result.calls.some(call => call.startsWith('run view '))).toBe(false);
    expect(result.envFile).toBe('');
  });

  it.each([
    ['missing', '', false, 'has no non-empty endpoint.txt'],
    ['empty', '', true, 'has no non-empty endpoint.txt'],
    [
      'non-HTTPS',
      'http://search.example.run.app',
      true,
      'must contain one non-empty HTTPS URL',
    ],
    [
      'multi-line',
      'https://search.example.run.app\nother',
      true,
      'must contain one non-empty HTTPS URL',
    ],
  ])(
    'rejects a %s endpoint artifact before build configuration',
    (_description, endpoint, artifactPresent, message) => {
      const result = runResolver({ run: validRun, endpoint, artifactPresent });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(message);
      expect(result.envFile).toBe('');
    }
  );

  it('reports artifact download failures with the selected run ID', () => {
    const result = runResolver({
      run: validRun,
      endpoint: 'https://search.example.run.app',
      downloadExitCode: 1,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'Could not download object-minute-rental-search-url from gcp-prod run 123'
    );
    expect(result.envFile).toBe('');
  });

  /**
   *
   * @param root0
   * @param root0.runId
   * @param root0.runList
   * @param root0.run
   * @param root0.endpoint
   * @param root0.artifactPresent
   * @param root0.downloadExitCode
   */
  /**
   * Execute the endpoint resolver with a fake GitHub CLI.
   * @param {object} options Resolver inputs.
   * @param {string} [options.runId] Optional explicitly selected run ID.
   * @param {Array<{databaseId: number}>} [options.runList] Runs returned by the fake listing command.
   * @param {{databaseId: number, workflowName: string, headBranch: string, status: string, conclusion: string | null}} [options.run] Run metadata returned by the fake view command.
   * @param {string} [options.endpoint] Endpoint written to the fake artifact.
   * @param {boolean} [options.artifactPresent] Whether the fake artifact contains endpoint.txt.
   * @param {number} [options.downloadExitCode] Exit status from the fake artifact download.
   * @returns {import('node:child_process').SpawnSyncReturns<string> & {calls: string[], envFile: string}} Resolver output, recorded CLI calls, and workflow environment contents.
   */
  function runResolver(options = {}) {
    const {
      runId = '',
      runList = [{ databaseId: 123 }],
      run = validRun,
      endpoint = 'https://search.example.run.app',
      artifactPresent = true,
      downloadExitCode = 0,
    } = options;
    const binDir = path.join(tempRoot, 'bin');
    const runnerTemp = path.join(tempRoot, 'runner-temp');
    const envFile = path.join(tempRoot, 'github-env');
    const callsFile = path.join(tempRoot, 'gh-calls');
    fs.mkdirSync(binDir);
    fs.mkdirSync(runnerTemp);
    fs.writeFileSync(envFile, '');
    fs.writeFileSync(
      path.join(binDir, 'gh'),
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$GH_CALL_LOG"
case "$1 $2" in
  'run list') printf '%s' "$GH_RUN_LIST_JSON" ;;
  'run view') printf '%s' "$GH_RUN_VIEW_JSON" ;;
  'run download')
    if [[ "$GH_DOWNLOAD_EXIT_CODE" != 0 ]]; then exit "$GH_DOWNLOAD_EXIT_CODE"; fi
    shift 2
    while [[ $# -gt 0 ]]; do
      if [[ "$1" == '--dir' ]]; then artifact_dir="$2"; shift 2; else shift; fi
    done
    mkdir -p "$artifact_dir"
    if [[ "$GH_ARTIFACT_PRESENT" == 'true' ]]; then printf '%s' "$GH_ENDPOINT" > "$artifact_dir/endpoint.txt"; fi
    ;;
  *) exit 64 ;;
esac
`
    );
    fs.chmodSync(path.join(binDir, 'gh'), 0o755);

    const processResult = spawnSync('bash', [resolverPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        GITHUB_REPOSITORY: 'MattHeard/dadeto',
        GITHUB_ENV: envFile,
        RUNNER_TEMP: runnerTemp,
        GCP_PROD_RUN_ID: runId,
        GH_CALL_LOG: callsFile,
        GH_RUN_LIST_JSON: JSON.stringify(runList),
        GH_RUN_VIEW_JSON: JSON.stringify(run),
        GH_ENDPOINT: endpoint,
        GH_ARTIFACT_PRESENT: String(artifactPresent),
        GH_DOWNLOAD_EXIT_CODE: String(downloadExitCode),
      },
    });

    return {
      ...processResult,
      calls: fs.existsSync(callsFile)
        ? fs.readFileSync(callsFile, 'utf8').trim().split('\n')
        : [],
      envFile: fs.readFileSync(envFile, 'utf8'),
    };
  }
});
