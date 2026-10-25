import { readFileSync } from 'node:fs';

describe('gcp-test workflow report handling', () => {
  it('does not provision the daily stats scheduler for test environments', () => {
    const source = readFileSync('infra/main.tf', 'utf8');

    expect(source).toContain('count     = var.environment == "prod" ? 1 : 0');
  });

  it('downloads the cloud-generated Playwright report before artifact upload', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain('Download Playwright report from GCS');
    expect(source).toContain('download_tree playwright-report');
    expect(source).toContain('download_tree test-results');
    expect(source).toContain('gcloud storage cp -r "${REPORT_ROOT}/${tree}" .');
  });

  it('persists Playwright attachments and requires a non-empty E2E artifact', () => {
    const workflow = readFileSync('.github/workflows/gcp-test.yml', 'utf8');
    const config = readFileSync('test/e2e/cloud.config.ts', 'utf8');
    const runner = readFileSync('scripts/run-e2e.js', 'utf8');
    const uploadStep = workflow
      .split('      - name: Upload e2e artifacts\n')[1]
      ?.split('\n      - name: ')[0];

    expect(config).toContain("outputDir: 'test-results'");
    expect(config).toContain(
      "['html', { outputFolder: 'playwright-report', open: 'never' }]"
    );
    expect(runner).toContain(
      "for (const reportDirectory of ['playwright-report', 'test-results'])"
    );
    expect(runner).toContain(
      'throw new Error(`Cloud Playwright did not create ${reportDirectory}`)'
    );
    expect(runner).toContain("await run('gcloud', args);");
    expect(uploadStep).toContain(
      "if: always() && steps.run_playwright_job.outcome != 'skipped'"
    );
    expect(uploadStep).toContain('if-no-files-found: error');
    expect(uploadStep).toContain('playwright-report');
    expect(uploadStep).toContain('test-results');
  });

  it('filters Cloud Run logs by the execution label used by the log URI', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(
      source.match(/labels\."run\.googleapis\.com\/execution_name"/g)
    ).toHaveLength(2);
    expect(source).not.toContain('resource.labels.execution_name');
  });

  it('retries the seed object upload before failing the run', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain(
      'ACCESS_TOKEN="$(gcloud auth print-access-token)"'
    );
    expect(source).toContain(
      'SEED_UPLOAD_URL="https://storage.googleapis.com/upload/storage/v1/b/${TEST_STATIC_BUCKET}/o?uploadType=media&name=${ENVIRONMENT}/seed.json"'
    );
    expect(source).toContain('for attempt in $(seq 1 8); do');
    expect(source).toContain('--data-binary @/tmp/e2e-seed.json');
    expect(source).toContain('sleep "$((attempt * 15))"');
  });

  it('builds and stages the Tetracube page inside the temporary test prefix', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');
    const pageSeedStep = source
      .split('      - name: Seed Tetracube static page for Playwright\n')[1]
      ?.split('\n      - name: ')[0];
    const waitStep = source
      .split('      - name: Wait for seeded pages\n')[1]
      ?.split('\n      - name: ')[0];

    expect(source).toContain('npm run build:mattheard-net');
    expect(pageSeedStep).toContain('../public/tetracube/${asset}');
    expect(pageSeedStep).toContain(
      'gs://${TEST_STATIC_BUCKET}/${ENVIRONMENT}/tetracube/${asset}'
    );
    expect(waitStep).toContain('wait_for_object tetracube/index.html');
    expect(waitStep).toContain('wait_for_object tetracube/game.js');
  });

  it('binds the workflow database id to the generated test environment', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain(
      'echo "TF_VAR_database_id=$ENVIRONMENT" >> "$GITHUB_ENV"'
    );
    expect(source).toContain(
      'terraform destroy -refresh=false -lock-timeout=5m -auto-approve -input=false -var="environment=${ENVIRONMENT}" -var="database_id=${ENVIRONMENT}" -var="create_default_firestore_database=false"'
    );
  });

  it('deletes only named Playwright databases during Terraform teardown', () => {
    const source = readFileSync('infra/main.tf', 'utf8');

    expect(source).toContain(
      'deletion_policy = var.database_id == "(default)" || !local.playwright_enabled ? "ABANDON" : "DELETE"'
    );
  });

  it('checks whether the temporary scheduler job exists before deleting it', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source.match(/gcloud scheduler jobs list/g)).toHaveLength(2);
    expect(source.match(/gcloud scheduler jobs delete/g)).toHaveLength(2);
    expect(source).toContain(
      'if grep -Fq "/jobs/${SCHEDULER_JOB}" <<<"${SCHEDULER_JOBS}"; then'
    );
  });

  it('runs teardown in a separate always-on cleanup job', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain('cleanup:');
    expect(source).toContain(
      'environment: ${{ steps.environment.outputs.environment }}'
    );
    expect(source).toContain(
      'needs:\n      - schedule_gate\n      - terraform'
    );
    expect(source).toContain(
      "ENVIRONMENT='${{ needs.terraform.outputs.environment }}'"
    );
    expect(source).toContain(
      "if: always() && needs.schedule_gate.outputs.should_run == 'true'"
    );
    expect(source).toContain('Terraform Destroy');
    expect(source).toContain('Cleanup test static prefix');
  });

  it('ignores the current scheduled run when checking the latest prior run', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(source).toContain(
      'const latest = data.workflow_runs.find(\n              run => run.id !== context.runId,\n            );'
    );
  });

  it('records query latency as an observational artifact in gcp-test', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');
    const performanceScript = readFileSync(
      'scripts/gcp-test-query-performance.js',
      'utf8'
    );
    const measurementStep = source
      .split('      - name: Measure object-minute rental query latency\n')[1]
      ?.split('\n      - name: ')[0];
    const artifactStep = source
      .split('      - name: Upload query performance artifact\n')[1]
      ?.split('\n      - name: ')[0];

    expect(measurementStep).toContain('continue-on-error: true');
    expect(measurementStep).toContain(
      'node ../scripts/gcp-test-query-performance.js'
    );
    expect(measurementStep).toContain('schedule-seed-failed');
    expect(measurementStep).toContain('2035-01-01T00:00:00Z');
    expect(performanceScript).toContain('2030-01-02T19:00:00Z');
    expect(artifactStep).toContain('if: always()');
    expect(artifactStep).toContain(
      'query-performance-${{ steps.environment.outputs.environment }}'
    );
    expect(artifactStep).toContain('path: /tmp/query-performance.json');
  });

  it('enables the projection only after E2E and before latency sampling', () => {
    const source = readFileSync('.github/workflows/gcp-test.yml', 'utf8');
    const playwrightIndex = source.indexOf('Run Playwright job');
    const enableIndex = source.indexOf(
      'Enable runner commitment projection for latency sampling'
    );
    const measureIndex = source.indexOf(
      'Measure object-minute rental query latency'
    );
    const enableStep = source
      .split(
        '      - name: Enable runner commitment projection for latency sampling\n'
      )[1]
      ?.split('\n      - name: ')[0];
    const measureStep = source
      .split('      - name: Measure object-minute rental query latency\n')[1]
      ?.split('\n      - name: ')[0];

    expect(playwrightIndex).toBeLessThan(enableIndex);
    expect(enableIndex).toBeLessThan(measureIndex);
    expect(enableStep).toContain(
      '-var="enable_runner_commitment_projection=true"'
    );
    expect(measureStep).toContain(
      "RUNNER_COMMITMENT_PROJECTION_ENABLED: 'true'"
    );
  });
});
