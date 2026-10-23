import { readFileSync } from 'node:fs';
import { createAlgZooActivationTraceReport } from '../../src/local/algZooActivationTraceReport.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);

describe('AlgZoo activation trace report', () => {
  it('reproduces byte-identical 10 x 16 replay output for the same seed', () => {
    const first = JSON.stringify(
      createAlgZooActivationTraceReport(12345, fixture)
    );
    const second = JSON.stringify(
      createAlgZooActivationTraceReport(12345, fixture)
    );
    const report = JSON.parse(first);

    expect(second).toBe(first);
    expect(report).toMatchObject({
      schemaVersion: 1,
      evidenceType: 'deterministic-replay-only',
      seed: 12345,
      model: {
        id: 'arc-algzoo/m16-10-second-argmax',
        sourceRevision: fixture.source.revision,
        checkpointSha256: fixture.source.checkpointSha256,
      },
    });
    expect(report.input).toHaveLength(10);
    expect(report.activationTraceByTimeStep).toHaveLength(10);
    expect(
      report.activationTraceByTimeStep.every(step => step.length === 16)
    ).toBe(true);
  });

  it('changes the generated sequence when the seed changes', () => {
    const first = createAlgZooActivationTraceReport(12345, fixture);
    const second = createAlgZooActivationTraceReport(12346, fixture);

    expect(second.input).not.toEqual(first.input);
  });

  it('rejects a fixture that does not match the pinned model identity', () => {
    expect(() =>
      createAlgZooActivationTraceReport(12345, {
        ...fixture,
        source: { ...fixture.source, revision: '0'.repeat(40) },
      })
    ).toThrow(TypeError);
  });

  it('rejects invalid seeds before creating a report', () => {
    expect(() => createAlgZooActivationTraceReport(-1, fixture)).toThrow(
      RangeError
    );
    expect(() => createAlgZooActivationTraceReport(2 ** 32, fixture)).toThrow(
      RangeError
    );
  });
});
