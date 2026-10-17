import { createInterpretabilitySchemasV1 } from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const {
  experimentSchemaV1,
  evidenceSchemaV1,
  evidenceEdgeSchemaV1,
  hypothesisSchemaV1,
  interpretabilityJsonSchemasV1,
  mechanismSchemaV1,
  mechanisticEstimateSchemaV1,
} = createInterpretabilitySchemasV1(createTestZod());

const model = {
  modelId: 'model-a',
  repository: 'https://huggingface.co/example/model-a',
  revision: 'a'.repeat(40),
};

describe('versioned interpretability schemas', () => {
  it('keeps native, SAE, attention, and recurrent mechanism identities distinct', () => {
    const common = { schemaVersion: 1, model, layerIndex: 2 };
    const native = mechanismSchemaV1.parse({
      ...common,
      kind: 'native-neuron',
      sourceId: 'mlp',
      neuronIndex: 7,
    });
    const sae = mechanismSchemaV1.parse({
      ...common,
      kind: 'sae-feature',
      sourceId: 'resid-sae',
      featureIndex: 7,
    });
    const recurrent = mechanismSchemaV1.parse({
      ...common,
      kind: 'recurrent-state',
      sourceId: 'state',
      neuronIndex: 7,
      timeStep: 3,
    });
    const attention = mechanismSchemaV1.parse({
      ...common,
      kind: 'attention-head',
      headIndex: 7,
    });

    expect(
      new Set([native.kind, sae.kind, recurrent.kind, attention.kind]).size
    ).toBe(4);
    expect(recurrent.timeStep).toBe(3);
  });

  it('rejects mutable revisions and ambiguous mechanism identities', () => {
    expect(
      mechanismSchemaV1.safeParse({
        schemaVersion: 1,
        kind: 'native-neuron',
        model: { ...model, revision: 'main' },
        layerIndex: 1,
        sourceId: 'mlp',
        neuronIndex: 0,
      }).success
    ).toBe(false);
    expect(
      mechanismSchemaV1.safeParse({
        schemaVersion: 1,
        kind: 'native-neuron',
        model,
        layerIndex: 1,
        neuronIndex: 0,
      }).success
    ).toBe(false);
    expect(
      mechanismSchemaV1.safeParse({
        schemaVersion: 1,
        kind: 'recurrent-state',
        model,
        layerIndex: 1,
        sourceId: 'state',
        neuronIndex: 0,
      }).success
    ).toBe(false);
  });

  it('accepts linked hypotheses and experiments that record negative evidence', () => {
    const hypothesis = hypothesisSchemaV1.parse({
      schemaVersion: 1,
      id: 'hypothesis-1',
      revision: 1,
      claim: 'The feature tracks the target behavior.',
      status: 'reviewed',
      mechanismIds: ['mechanism-1'],
      evidenceIds: ['evidence-1'],
      authorId: 'investigator-1',
      createdAt: '2026-10-16T10:00:00Z',
    });
    const experiment = experimentSchemaV1.parse({
      schemaVersion: 1,
      id: 'experiment-1',
      status: 'completed',
      model,
      mechanismIds: ['mechanism-1'],
      hypothesisIds: [hypothesis.id],
      procedure: {
        repository: 'https://github.com/example/experiment',
        revision: 'b'.repeat(40),
        path: 'experiments/run.py',
      },
      seed: 42,
      inputSplitId: 'held-out-v1',
      runtime: { python: '3.12', steps: 100 },
      predictions: [{ target: 'classification', expected: 'positive' }],
      observations: [
        {
          kind: 'negative',
          summary: 'Ablation did not change held-out accuracy.',
          artifactSha256: 'c'.repeat(64),
        },
      ],
      authorId: 'investigator-1',
      createdAt: '2026-10-16T10:00:00Z',
    });

    expect(experiment.observations[0].kind).toBe('negative');
  });

  it('accepts whole-model estimates and rejects inverted uncertainty bounds', () => {
    const estimate = {
      schemaVersion: 1,
      id: 'estimate-1',
      model,
      metric: { name: 'accuracy', value: 0.8 },
      uncertainty: { lower: 0.75, upper: 0.85, method: 'bootstrap' },
      compute: { quantity: 12, unit: 'gpu-hours' },
      method: {
        repository: 'https://github.com/example/estimate',
        revision: 'd'.repeat(40),
        path: 'estimate.py',
      },
      assumptions: ['Held-out split reflects intended task distribution.'],
      hypothesisIds: ['hypothesis-1'],
      evidenceIds: ['evidence-1'],
      heldOutSplitId: 'held-out-v1',
      authorId: 'investigator-1',
      createdAt: '2026-10-16T10:00:00Z',
    };

    expect(mechanisticEstimateSchemaV1.parse(estimate).metric.value).toBe(0.8);
    expect(
      mechanisticEstimateSchemaV1.safeParse({
        ...estimate,
        uncertainty: { ...estimate.uncertainty, lower: 0.9, upper: 0.8 },
      }).success
    ).toBe(false);
  });

  it('records negative evidence with provenance and validation state', () => {
    const evidence = evidenceSchemaV1.parse({
      schemaVersion: 1,
      id: 'evidence-1',
      kind: 'negative',
      summary: 'The intervention did not change the held-out output.',
      mechanismIds: ['mechanism-1'],
      hypothesisIds: ['hypothesis-1'],
      experimentIds: ['experiment-1'],
      artifactSha256: 'e'.repeat(64),
      validationState: 'unreviewed',
      authorId: 'investigator-2',
      createdAt: '2026-10-17T10:00:00Z',
    });

    expect(evidence.kind).toBe('negative');
    expect(evidence.validationState).toBe('unreviewed');
    expect(
      evidenceSchemaV1.safeParse({
        ...evidence,
        artifactSha256: 'mutable-artifact-name',
      }).success
    ).toBe(false);
  });

  it('validates typed directed evidence relationships', () => {
    const relations = [
      'depends-on',
      'supports',
      'contradicts',
      'projects-to',
      'connected-to',
    ];
    const edge = relation =>
      evidenceEdgeSchemaV1.parse({
        schemaVersion: 1,
        id: `edge-${relation}`,
        fromId: 'hypothesis-1',
        toId: 'evidence-1',
        relation,
        authorId: 'investigator-2',
        createdAt: '2026-10-17T10:00:00Z',
      });

    expect(relations.map(relation => edge(relation).relation)).toEqual(
      relations
    );
    expect(
      evidenceEdgeSchemaV1.safeParse({
        schemaVersion: 1,
        id: 'unknown-edge',
        fromId: 'hypothesis-1',
        toId: 'evidence-1',
        relation: 'amends',
        authorId: 'investigator-2',
        createdAt: '2026-10-17T10:00:00Z',
      }).success
    ).toBe(false);
  });

  it('exports machine-readable schemas for all artifact types', () => {
    expect(Object.keys(interpretabilityJsonSchemasV1).sort()).toEqual([
      'evidence',
      'evidenceEdge',
      'experiment',
      'hypothesis',
      'mechanism',
      'mechanisticEstimate',
    ]);
    expect(interpretabilityJsonSchemasV1.mechanism.oneOf).toHaveLength(4);
  });
});
