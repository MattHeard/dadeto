import {
  createActivationObservationV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  exportInterpretabilityResearchBundleV2,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const model = {
  modelId: 'arc/alg-zoo-m16-10',
  repository: 'https://huggingface.co/example/alg-zoo-m16-10',
  revision: 'a'.repeat(40),
  architecture: 'RecurrentNeuralNetwork',
};
const z = createTestZod();
const evidenceSchemas = createInterpretabilitySchemasV1(z);
const identitySchemas = createInterpretabilitySchemasV2(z);
const schemas = {
  evidenceGraphSchemasV1: evidenceSchemas,
  identityGraphSchemaV2: identitySchemas.identityGraphSchemaV2,
};

/**
 * Create V1 evidence records that refer to one another through typed IDs.
 * @returns {Record<string, any>} Versioned V1 graph.
 */
function createEvidenceGraph() {
  const mechanisms = [0, 1].map(neuronIndex => ({
    schemaVersion: 1,
    id: `legacy-neuron-${neuronIndex}`,
    model,
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    kind: 'recurrent-state',
    sourceId: 'alg-zoo-m16-10',
    neuronIndex,
    timeStep: 9,
  }));
  const hypotheses = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `hypothesis-${index}`,
    revision: 1,
    claim: `Neuron ${index} contributes to the output.`,
    status: 'proposed',
    mechanismIds: [mechanism.id],
    evidenceIds: [`evidence-${index}`],
    authorId: 'researcher-a',
    createdAt: '2026-10-20T10:00:00Z',
  }));
  const experiments = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `experiment-${index}`,
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypotheses[index].id],
    procedure: {
      repository: 'https://github.com/example/alg-zoo-test',
      revision: 'b'.repeat(40),
      path: 'experiments/replay.py',
    },
    seed: 17 + index,
    inputSplitId: 'held-out-gaussian-v1',
    runtime: { python: '3.12' },
    predictions: [{ target: 'activation', expected: 'lower' }],
    observations: [
      { kind: 'negative', summary: 'Intervention did not match prediction.' },
    ],
    authorId: 'researcher-a',
    createdAt: '2026-10-20T10:01:00Z',
  }));
  const evidence = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `evidence-${index}`,
    kind: 'negative',
    summary: 'The held-out intervention did not reproduce the prediction.',
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypotheses[index].id],
    experimentIds: [experiments[index].id],
    validationState: 'unreviewed',
    authorId: 'researcher-b',
    createdAt: '2026-10-20T10:02:00Z',
  }));
  const edges = evidence.map((record, index) => ({
    schemaVersion: 1,
    id: `edge-${index}`,
    fromId: experiments[index].id,
    toId: record.id,
    relation: 'contradicts',
    authorId: 'researcher-b',
    createdAt: '2026-10-20T10:03:00Z',
  }));
  return {
    mechanisms,
    hypotheses,
    experiments,
    estimates: [],
    evidence,
    edges,
  };
}

/**
 * Create V2 identity records that refer to the same experiments.
 * @returns {Record<string, any>} V2 identity graph.
 */
function createIdentityGraph() {
  const components = [0, 1].map(neuronIndex =>
    createRecurrentNeuronComponentV2(model, 'alg-zoo-m16-10', {
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      neuronIndex,
    })
  );
  const activationPositions = components.map(component =>
    createRecurrentActivationPositionV2({
      componentId: component.id,
      timeStepIndex: 9,
    })
  );
  const observations = activationPositions.map((position, index) =>
    createActivationObservationV2(position.id, `experiment-${index}`, {
      inputSequenceId: 'gaussian-sequence-1',
      runId: `replay-${index}`,
      value: 0.25 + index,
      numericPrecision: 'float32',
    })
  );
  return {
    components,
    activationPositions,
    observations,
    structuralConnections: [],
    circuitSnapshots: [],
  };
}

describe('portable research bundle V2', () => {
  it('round-trips V1 evidence and V2 identities in deterministic order', () => {
    const bundle = {
      evidenceGraph: createEvidenceGraph(),
      identityGraph: createIdentityGraph(),
    };
    const original = JSON.parse(JSON.stringify(bundle));
    const exported = exportInterpretabilityResearchBundleV2(bundle, schemas);
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;

    const envelope = JSON.parse(exported.json);
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.evidenceGraph.schemaVersion).toBe(1);
    expect(envelope.identityGraph.schemaVersion).toBe(2);

    const reordered = {
      evidenceGraph: Object.fromEntries(
        Object.entries(bundle.evidenceGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
      identityGraph: Object.fromEntries(
        Object.entries(bundle.identityGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
    };
    expect(exportInterpretabilityResearchBundleV2(reordered, schemas)).toEqual(
      exported
    );

    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(
      imported.bundle.evidenceGraph.mechanisms.map(record => record.id)
    ).toEqual(['legacy-neuron-0', 'legacy-neuron-1']);
    expect(imported.bundle.evidenceGraph.hypotheses).toHaveLength(2);
    expect(imported.bundle.evidenceGraph.experiments).toHaveLength(2);
    expect(imported.bundle.evidenceGraph.evidence[0].kind).toBe('negative');
    expect(imported.bundle.evidenceGraph.edges[0].relation).toBe('contradicts');
    expect(imported.bundle.identityGraph.components).toHaveLength(2);
    expect(imported.bundle.identityGraph.activationPositions).toHaveLength(2);
    expect(imported.bundle.identityGraph.observations).toHaveLength(2);
    expect(bundle).toEqual(original);
  });

  it('returns stable failures for malformed envelopes and invalid subgraphs', () => {
    expect(importInterpretabilityResearchBundleV2(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV2('{', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV2('[]', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(
      importInterpretabilityResearchBundleV2('{"schemaVersion":3}', schemas)
    ).toEqual({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
    expect(
      importInterpretabilityResearchBundleV2('{"schemaVersion":2}', schemas)
    ).toEqual({
      valid: false,
      errors: [
        {
          code: 'invalid-evidence-graph',
          details: [{ code: 'invalid-json' }],
        },
      ],
    });

    const validBundle = exportInterpretabilityResearchBundleV2(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(validBundle.valid).toBe(true);
    if (!validBundle.valid) return;
    const wrongIdentityVersion = JSON.parse(validBundle.json);
    wrongIdentityVersion.identityGraph.schemaVersion = 1;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(wrongIdentityVersion),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });

    const exported = exportInterpretabilityResearchBundleV2(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const invalidEvidence = JSON.parse(exported.json);
    invalidEvidence.evidenceGraph.evidence[0].kind = 'untyped';
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidEvidence),
        schemas
      ).errors
    ).toEqual([{ code: 'invalid-evidence-graph', details: expect.any(Array) }]);

    const invalidIdentity = JSON.parse(exported.json);
    invalidIdentity.identityGraph.extra = true;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidIdentity),
        schemas
      ).errors
    ).toEqual([{ code: 'invalid-identity-graph', details: expect.any(Array) }]);

    const unknownOuterField = { ...JSON.parse(exported.json), extra: true };
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(unknownOuterField),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
  });

  it('rejects invalid exports and missing schema adapters with stable errors', () => {
    expect(exportInterpretabilityResearchBundleV2(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      exportInterpretabilityResearchBundleV2(
        { evidenceGraph: null, identityGraph: createIdentityGraph() },
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV2(
        {
          evidenceGraph: {
            hypotheses: [{ id: 'hypothesis', mechanismIds: ['absent'] }],
          },
          identityGraph: createIdentityGraph(),
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV2(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: createIdentityGraph(),
        },
        { evidenceGraphSchemasV1: evidenceSchemas }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV2(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: createIdentityGraph(),
        },
        { identityGraphSchemaV2: identitySchemas.identityGraphSchemaV2 }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
  });
});
