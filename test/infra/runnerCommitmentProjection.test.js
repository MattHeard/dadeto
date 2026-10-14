import { readFileSync } from 'node:fs';

describe('runner commitment projection rollout configuration', () => {
  test('deploys retried triggers for all source collections and gates the reader', () => {
    const terraform = readFileSync(
      'infra/functions-object-minute-rental-search.tf',
      'utf8'
    );
    const variables = readFileSync('infra/variables.tf', 'utf8');
    const firestore = readFileSync('infra/dendrite-firestore.tf', 'utf8');
    const entrypoint = readFileSync(
      'src/cloud/object-minute-rental-search/index.js',
      'utf8'
    );

    expect(terraform).toContain('enable_runner_commitment_projection');
    expect(terraform).toContain('failure_policy {');
    expect(terraform).toContain('retry = true');
    expect(terraform).toContain('runner_assignments/{assignmentId}');
    expect(terraform).toContain('segments/{segmentId}');
    expect(terraform).toContain('spacetime_points/{pointId}');
    expect(firestore).toContain('"runner_commitment_projections"');
    expect(entrypoint).toContain('RUNNER_COMMITMENT_PROJECTION_ENABLED');
    expect(entrypoint).toContain(
      'createFirestoreRunnerCommitmentProjectionReader'
    );
    expect(variables).toMatch(
      /variable "enable_runner_commitment_projection"\s*\{[^}]*default\s*=\s*false/s
    );
  });

  test('documents an idempotent backfill before enabling projected reads', () => {
    const operations = readFileSync('infra/README.md', 'utf8');
    const backfill = readFileSync(
      'src/cloud/object-minute-rental-search/runner-commitment-projection-backfill.js',
      'utf8'
    );
    const command = readFileSync(
      'scripts/backfill-runner-commitment-projections.js',
      'utf8'
    );

    expect(operations).toContain(
      'node scripts/backfill-runner-commitment-projections.js'
    );
    expect(operations).toContain('deployed and the backfill completes');
    expect(command).toContain('backfillRunnerCommitmentProjections');
    expect(backfill).toContain('.orderBy(documentIdFieldPath)');
    expect(backfill).toContain('.limit(pageSize)');
    expect(backfill).toContain("collection('runner_assignments')");
    expect(backfill).toContain('repository.refresh(allowEffects');
  });
});
