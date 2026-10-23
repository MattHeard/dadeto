import { describe, expect, it } from '@jest/globals';
import {
  appendMechanisticEstimateV1,
  appendExperimentSubmissionV1,
  createInterpretabilitySchemasV1,
  exportEvidenceGraphV1,
  getEvidenceGraphContextV1,
  getEvidenceGraphContextSnapshotV1,
  importEvidenceGraphV1,
  presentEvidenceGraphContextV1,
  validateEvidenceGraphV1,
} from '../../../src/core/interpretability/interpretability.js';
import { loadOptionalTestZod } from './testZod.js';

const { zod } = loadOptionalTestZod();
const submissionSchemas = createInterpretabilitySchemasV1(zod);

/**
 * Create a complete native-neuron record for graph identity checks.
 * @param {string} id Record ID.
 * @param {Record<string, any>} [overrides] Mechanism kind and coordinate overrides.
 * @returns {Record<string, any>} Mechanism fixture.
 */
function mechanismRecord(id, overrides = {}) {
  return {
    id,
    model: {
      modelId: 'model-a',
      repository: 'https://huggingface.co/example/model-a',
      revision: 'a'.repeat(40),
      architecture: 'GPT2LMHeadModel',
      tokenizer: {
        repository: 'https://huggingface.co/example/tokenizer-a',
        revision: 'b'.repeat(40),
      },
    },
    layerIndex: 2,
    activationHook: 'blocks.2.mlp.post_activation',
    kind: 'native-neuron',
    sourceId: 'mlp',
    neuronIndex: 7,
    ...overrides,
  };
}

/** @returns {Record<string, any>} Graph with two directed hops of context. */
function connectedContextGraph() {
  return {
    mechanisms: [mechanismRecord('mechanism-a')],
    hypotheses: [
      {
        id: 'hypothesis-a',
        status: 'proposed',
        mechanismIds: [],
        confidence: undefined,
        authorId: 'researcher-a',
      },
    ],
    experiments: [
      { id: 'experiment-a', status: 'registered', mechanismIds: [] },
    ],
    evidence: [
      {
        id: 'evidence-a',
        kind: 'negative',
        validationState: 'unreviewed',
      },
    ],
    edges: [
      {
        id: 'edge-a',
        fromId: 'mechanism-a',
        toId: 'hypothesis-a',
        relation: 'connected-to',
      },
      {
        id: 'edge-b',
        fromId: 'hypothesis-a',
        toId: 'evidence-a',
        relation: 'contradicts',
      },
      {
        id: 'edge-c',
        fromId: 'experiment-a',
        toId: 'hypothesis-a',
        relation: 'depends-on',
      },
    ],
  };
}

/** @returns {Record<string, any>} Schema-valid new experiment and evidence. */
function experimentSubmission() {
  return {
    experiment: {
      schemaVersion: 1,
      id: 'experiment-b',
      status: 'completed',
      model: mechanismRecord('mechanism-a').model,
      mechanismIds: ['mechanism-a'],
      hypothesisIds: ['hypothesis-a'],
      procedure: {
        repository: 'https://github.com/example/experiment',
        revision: 'c'.repeat(40),
        path: 'experiments/run.py',
      },
      seed: 11,
      inputSplitId: 'held-out-v1',
      runtime: { python: '3.12' },
      predictions: [{ target: 'activation', expected: 'lower' }],
      observations: [{ kind: 'negative', summary: 'Prediction did not hold.' }],
      causalInterventionResult: {
        schemaVersion: 1,
        status: 'tested',
        targetMechanismId: 'mechanism-a',
        operation: 'set-activation-zero',
        timeStepIndex: 3,
        inputSequenceSha256: 'd'.repeat(64),
        predictedOutputIndex: 4,
        baselineOutputIndex: 2,
        intervenedOutputIndex: 5,
        causalScore: 0,
        artifactSha256: 'e'.repeat(64),
      },
      authorId: 'investigator-b',
      createdAt: '2026-10-17T10:00:00Z',
    },
    evidence: [
      {
        schemaVersion: 1,
        id: 'evidence-b',
        kind: 'negative',
        summary: 'The intervention failed to change the held-out output.',
        mechanismIds: ['mechanism-a'],
        hypothesisIds: ['hypothesis-a'],
        experimentIds: ['experiment-b'],
        validationState: 'unreviewed',
        authorId: 'investigator-b',
        createdAt: '2026-10-17T10:00:00Z',
      },
    ],
    edges: [
      {
        schemaVersion: 1,
        id: 'edge-d',
        fromId: 'experiment-b',
        toId: 'evidence-b',
        relation: 'supports',
        authorId: 'investigator-b',
        createdAt: '2026-10-17T10:00:00Z',
      },
    ],
  };
}

/** @returns {Record<string, any>} Schema-valid graph for portable round trips. */
function portableGraph() {
  return {
    mechanisms: [
      mechanismRecord('recurrent-state-10-step-4', {
        schemaVersion: 1,
        kind: 'recurrent-state',
        sourceId: 'hidden-state',
        neuronIndex: 10,
        timeStep: 4,
      }),
    ],
    hypotheses: [
      {
        schemaVersion: 1,
        id: 'hypothesis-rnn',
        revision: 1,
        claim: 'The state contributes to the second-argmax decision.',
        status: 'proposed',
        mechanismIds: ['recurrent-state-10-step-4'],
        evidenceIds: ['evidence-negative'],
        authorId: 'investigator-a',
        createdAt: '2026-10-17T09:00:00Z',
      },
    ],
    experiments: [
      {
        ...experimentSubmission().experiment,
        id: 'experiment-rnn',
        mechanismIds: ['recurrent-state-10-step-4'],
        hypothesisIds: ['hypothesis-rnn'],
        causalInterventionResult: {
          ...experimentSubmission().experiment.causalInterventionResult,
          targetMechanismId: 'recurrent-state-10-step-4',
        },
      },
    ],
    estimates: [],
    evidence: [
      {
        schemaVersion: 1,
        id: 'evidence-negative',
        kind: 'negative',
        summary: 'The intervention did not reproduce the prediction.',
        mechanismIds: ['recurrent-state-10-step-4'],
        hypothesisIds: ['hypothesis-rnn'],
        experimentIds: ['experiment-rnn'],
        artifactSha256: 'f'.repeat(64),
        validationState: 'unreviewed',
        authorId: 'investigator-b',
        createdAt: '2026-10-17T10:00:00Z',
      },
    ],
    edges: [
      {
        schemaVersion: 1,
        id: 'edge-negative',
        fromId: 'experiment-rnn',
        toId: 'evidence-negative',
        relation: 'contradicts',
        authorId: 'investigator-b',
        createdAt: '2026-10-17T10:00:00Z',
      },
    ],
  };
}

describe('importEvidenceGraphV1', () => {
  it('round-trips recurrent identities, provenance, negative evidence, and edges', () => {
    const graph = portableGraph();
    const exported = exportEvidenceGraphV1(graph);
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;

    const imported = importEvidenceGraphV1(exported.json, submissionSchemas);
    expect(imported).toEqual({ valid: true, graph });
    if (imported.valid) {
      expect(imported.graph.mechanisms[0].timeStep).toBe(4);
      expect(imported.graph.evidence[0].authorId).toBe('investigator-b');
      expect(imported.graph.evidence[0].kind).toBe('negative');
      expect(imported.graph.edges[0].relation).toBe('contradicts');
    }
  });

  it('rejects malformed JSON, documents, versions, and collection shapes', () => {
    expect(importEvidenceGraphV1('{', submissionSchemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importEvidenceGraphV1('null', submissionSchemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(importEvidenceGraphV1(1, submissionSchemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(
      importEvidenceGraphV1('{"schemaVersion":2}', submissionSchemas)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'unsupported-version', schemaVersion: 2 }],
    });
    const missingEdges = { ...portableGraph(), schemaVersion: 1 };
    delete missingEdges.edges;
    expect(
      importEvidenceGraphV1(JSON.stringify(missingEdges), submissionSchemas)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-collection', collection: 'edges' }],
    });
  });

  it('rejects invalid record schemas, graph references, and missing validators', () => {
    const schemaInvalid = { ...portableGraph(), schemaVersion: 1 };
    schemaInvalid.evidence[0].validationState = 'accepted';
    const schemaResult = importEvidenceGraphV1(
      JSON.stringify(schemaInvalid),
      submissionSchemas
    );
    expect(schemaResult.valid).toBe(false);
    if (!schemaResult.valid) {
      expect(schemaResult.errors.map(error => error.code)).toContain(
        'invalid-record'
      );
    }
    expect(schemaResult).not.toHaveProperty('graph');

    const unresolved = { ...portableGraph(), schemaVersion: 1 };
    unresolved.experiments[0].hypothesisIds = ['missing-hypothesis'];
    const referenceResult = importEvidenceGraphV1(
      JSON.stringify(unresolved),
      submissionSchemas
    );
    expect(referenceResult.valid).toBe(false);
    if (!referenceResult.valid) {
      expect(referenceResult.errors.map(error => error.code)).toContain(
        'unresolved-reference'
      );
    }

    const emptyDocument = {
      schemaVersion: 1,
      mechanisms: [],
      hypotheses: [],
      experiments: [],
      estimates: [],
      evidence: [],
      edges: [],
    };
    const missingSchemas = importEvidenceGraphV1(
      JSON.stringify(emptyDocument),
      {}
    );
    expect(missingSchemas.valid).toBe(false);
    if (!missingSchemas.valid) {
      expect(missingSchemas.errors.map(error => error.code)).toEqual(
        Array(6).fill('missing-schema-validator')
      );
    }
  });
});

describe('appendExperimentSubmissionV1', () => {
  it('appends validated negative findings without changing the source graph', () => {
    const graph = connectedContextGraph();
    const originalExperiments = graph.experiments;
    const result = appendExperimentSubmissionV1(
      graph,
      experimentSubmission(),
      submissionSchemas
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.graph.experiments).toHaveLength(2);
    expect(result.graph.experiments.at(-1).causalInterventionResult).toEqual(
      experimentSubmission().experiment.causalInterventionResult
    );
    expect(result.graph.evidence.at(-1).kind).toBe('negative');
    expect(result.graph.evidence.at(-1).authorId).toBe('investigator-b');
    expect(result.graph.edges.at(-1).toId).toBe('evidence-b');
    expect(graph.experiments).toBe(originalExperiments);
    expect(graph.experiments).toHaveLength(1);
  });

  it('rejects schema errors, duplicate IDs, and unresolved references atomically', () => {
    const graph = connectedContextGraph();
    const invalidSchemaSubmission = experimentSubmission();
    invalidSchemaSubmission.evidence[0].validationState = 'accepted';
    expect(
      appendExperimentSubmissionV1(
        graph,
        invalidSchemaSubmission,
        submissionSchemas
      )
    ).toEqual({
      valid: false,
      errors: [
        {
          code: 'invalid-record',
          collection: 'evidence',
          index: 0,
          id: 'evidence-b',
        },
      ],
    });

    const duplicateSubmission = experimentSubmission();
    duplicateSubmission.experiment.id = 'experiment-a';
    const duplicateResult = appendExperimentSubmissionV1(
      graph,
      duplicateSubmission,
      submissionSchemas
    );
    expect(duplicateResult.valid).toBe(false);
    if (!duplicateResult.valid) {
      expect(duplicateResult.errors.map(error => error.code)).toContain(
        'duplicate-id'
      );
    }

    const unresolvedSubmission = experimentSubmission();
    unresolvedSubmission.evidence[0].mechanismIds = ['missing-mechanism'];
    const unresolvedResult = appendExperimentSubmissionV1(
      graph,
      unresolvedSubmission,
      submissionSchemas
    );
    expect(unresolvedResult.valid).toBe(false);
    if (!unresolvedResult.valid) {
      expect(unresolvedResult.errors.map(error => error.code)).toContain(
        'unresolved-reference'
      );
    }
    expect(graph.experiments).toHaveLength(1);
    expect(graph.evidence).toHaveLength(1);
  });

  it('rejects invalid submission shapes and missing injected schema validators', () => {
    expect(appendExperimentSubmissionV1({}, null, submissionSchemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-submission' }],
    });
    expect(
      appendExperimentSubmissionV1({}, experimentSubmission(), {})
    ).toEqual({
      valid: false,
      errors: [
        { code: 'missing-schema-validator', collection: 'experiments' },
        { code: 'missing-schema-validator', collection: 'evidence' },
        { code: 'missing-schema-validator', collection: 'edges' },
      ],
    });
  });

  it('rejects an invalid source graph before inspecting the submission', () => {
    expect(
      appendExperimentSubmissionV1(
        { mechanisms: [{ id: 'duplicate' }, { id: 'duplicate' }] },
        experimentSubmission(),
        submissionSchemas
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'duplicate-id' }] });
  });

  it('defaults omitted graph collections and submission edges to empty arrays', () => {
    const graph = {
      mechanisms: [mechanismRecord('mechanism-a')],
      hypotheses: [
        { id: 'hypothesis-a', mechanismIds: ['mechanism-a'], evidenceIds: [] },
      ],
    };
    const submission = experimentSubmission();
    delete submission.edges;

    const result = appendExperimentSubmissionV1(
      graph,
      submission,
      submissionSchemas
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.graph.experiments).toHaveLength(1);
      expect(result.graph.evidence).toHaveLength(1);
      expect(result.graph.edges).toEqual([]);
    }
  });
});

describe('appendMechanisticEstimateV1', () => {
  it('appends a validated estimate without mutating the source graph', () => {
    const graph = connectedContextGraph();
    const originalEstimates = graph.estimates;
    const estimate = {
      schemaVersion: 1,
      id: 'estimate-b',
      model: mechanismRecord('mechanism-a').model,
      metric: { name: 'accuracy', value: 0.72 },
      uncertainty: { lower: 0.68, upper: 0.76, method: 'bootstrap' },
      compute: { quantity: 4, unit: 'GPU-hours' },
      method: {
        repository: 'https://github.com/example/estimator',
        revision: 'c'.repeat(40),
        path: 'estimate.py',
      },
      assumptions: ['The held-out perturbations represent target inputs.'],
      hypothesisIds: ['hypothesis-a'],
      evidenceIds: ['evidence-a'],
      heldOutSplitId: 'perturbations-held-out-v1',
      authorId: 'researcher-b',
      createdAt: '2026-10-20T16:00:00Z',
    };

    const result = appendMechanisticEstimateV1(
      graph,
      estimate,
      submissionSchemas
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.graph.estimates).toEqual([estimate]);
    expect(graph.estimates).toBe(originalEstimates);
    expect(graph.estimates).toBeUndefined();
  });

  it('rejects schema errors, duplicate IDs, unresolved references, and missing validators', () => {
    const graph = connectedContextGraph();
    const invalidEstimate = {
      schemaVersion: 1,
      id: 'estimate-invalid',
      model: mechanismRecord('mechanism-a').model,
      metric: { name: 'accuracy', value: 1.2 },
      uncertainty: { lower: 0.8, upper: 0.7, method: 'bootstrap' },
      compute: { quantity: 4, unit: 'GPU-hours' },
      method: {
        repository: 'https://github.com/example/estimator',
        revision: 'c'.repeat(40),
        path: 'estimate.py',
      },
      assumptions: ['A testable assumption.'],
      hypothesisIds: ['hypothesis-a'],
      evidenceIds: ['evidence-a'],
      heldOutSplitId: 'perturbations-held-out-v1',
      authorId: 'researcher-b',
      createdAt: '2026-10-20T16:00:00Z',
    };
    expect(
      appendMechanisticEstimateV1(graph, invalidEstimate, submissionSchemas)
    ).toMatchObject({ valid: false, errors: [{ code: 'invalid-record' }] });

    const validEstimate = {
      ...invalidEstimate,
      metric: { name: 'accuracy', value: 0.5 },
      uncertainty: { lower: 0.4, upper: 0.6, method: 'bootstrap' },
    };
    const duplicate = { ...validEstimate, id: 'hypothesis-a' };
    const duplicateResult = appendMechanisticEstimateV1(
      graph,
      duplicate,
      submissionSchemas
    );
    expect(duplicateResult.valid).toBe(false);
    if (!duplicateResult.valid) {
      expect(duplicateResult.errors.map(error => error.code)).toContain(
        'duplicate-id'
      );
    }

    const unresolved = {
      ...validEstimate,
      id: 'estimate-unresolved',
      hypothesisIds: ['missing-hypothesis'],
    };
    const unresolvedResult = appendMechanisticEstimateV1(
      graph,
      unresolved,
      submissionSchemas
    );
    expect(unresolvedResult.valid).toBe(false);
    if (!unresolvedResult.valid) {
      expect(unresolvedResult.errors.map(error => error.code)).toContain(
        'unresolved-reference'
      );
    }

    expect(appendMechanisticEstimateV1(graph, null, submissionSchemas)).toEqual(
      {
        valid: false,
        errors: [{ code: 'invalid-submission' }],
      }
    );
    expect(
      appendMechanisticEstimateV1(graph, [], submissionSchemas)
    ).toMatchObject({ valid: false, errors: [{ code: 'invalid-submission' }] });
    expect(
      appendMechanisticEstimateV1(
        { mechanisms: [{ id: 'duplicate' }, { id: 'duplicate' }] },
        validEstimate,
        submissionSchemas
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'duplicate-id' }] });
    expect(appendMechanisticEstimateV1(graph, validEstimate, {})).toEqual({
      valid: false,
      errors: [{ code: 'missing-schema-validator', collection: 'estimates' }],
    });
    expect(graph.estimates).toBeUndefined();
  });
});

describe('validateEvidenceGraphV1', () => {
  it('accepts unique records with resolved references and edge endpoints', () => {
    const graph = {
      mechanisms: [{ id: 'mechanism-1' }],
      hypotheses: [
        {
          id: 'hypothesis-1',
          mechanismIds: ['mechanism-1'],
          evidenceIds: ['evidence-1'],
        },
      ],
      experiments: [
        {
          id: 'experiment-1',
          mechanismIds: ['mechanism-1'],
          hypothesisIds: ['hypothesis-1'],
        },
      ],
      evidence: [
        {
          id: 'evidence-1',
          mechanismIds: ['mechanism-1'],
          hypothesisIds: ['hypothesis-1'],
          experimentIds: ['experiment-1'],
        },
      ],
      estimates: [
        {
          id: 'estimate-1',
          hypothesisIds: ['hypothesis-1'],
          evidenceIds: ['evidence-1'],
        },
      ],
      edges: [{ id: 'edge-1', fromId: 'hypothesis-1', toId: 'evidence-1' }],
    };

    expect(validateEvidenceGraphV1(graph)).toEqual({ valid: true, errors: [] });
  });

  it('reports duplicate IDs, unresolved artifact references, and missing edge endpoints', () => {
    const graph = {
      mechanisms: [{ id: 'shared-id' }],
      hypotheses: [
        {
          id: 'shared-id',
          mechanismIds: ['missing-mechanism'],
          evidenceIds: ['missing-evidence'],
        },
      ],
      experiments: [],
      evidence: [],
      estimates: [],
      edges: [{ id: 'edge-1', fromId: 'missing-source', toId: 'shared-id' }],
    };
    const result = validateEvidenceGraphV1(graph);

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual([
      'duplicate-id',
      'unresolved-edge-endpoint',
      'unresolved-reference',
      'unresolved-reference',
    ]);
  });

  it('reports records without a stable string ID', () => {
    expect(
      validateEvidenceGraphV1({ mechanisms: [{ id: '  ' }] }).errors
    ).toEqual([{ code: 'invalid-id', type: 'mechanisms' }]);
  });

  it('handles empty collections, omitted references, and malformed graph rows', () => {
    expect(validateEvidenceGraphV1({})).toEqual({ valid: true, errors: [] });
    expect(
      validateEvidenceGraphV1({
        mechanisms: [{ id: 'mechanism-1' }, null],
        hypotheses: [{ id: 'hypothesis-1' }],
      }).valid
    ).toBe(false);
    expect(
      validateEvidenceGraphV1({
        mechanisms: [null, { id: 'mechanism-1' }],
        hypotheses: [{ id: 'hypothesis-1' }],
      }).valid
    ).toBe(false);
  });

  it('skips identity fingerprinting when required identity fields are absent', () => {
    expect(
      validateEvidenceGraphV1({
        mechanisms: [
          { id: 'mechanism-without-kind', model: {}, activationHook: 'hook' },
          { id: 'mechanism-without-hook', model: {}, kind: 'native-neuron' },
        ],
      }).valid
    ).toBe(true);
  });

  it('rejects different IDs for one physical mechanism', () => {
    const result = validateEvidenceGraphV1({
      mechanisms: [
        mechanismRecord('mechanism-a'),
        mechanismRecord('mechanism-b'),
      ],
    });

    expect(result.errors).toEqual([
      {
        code: 'duplicate-mechanism-identity',
        id: 'mechanism-b',
        firstId: 'mechanism-a',
      },
    ]);
  });

  it('preserves distinct neuron coordinates as distinct mechanisms', () => {
    expect(
      validateEvidenceGraphV1({
        mechanisms: [
          mechanismRecord('mechanism-a', { neuronIndex: 7 }),
          mechanismRecord('mechanism-b', { neuronIndex: 8 }),
        ],
      })
    ).toEqual({ valid: true, errors: [] });
  });

  it('fingerprints coordinates for SAE features and attention heads', () => {
    expect(
      validateEvidenceGraphV1({
        mechanisms: [
          mechanismRecord('sae-feature', {
            kind: 'sae-feature',
            sourceId: 'resid-sae',
            neuronIndex: undefined,
            featureIndex: 7,
          }),
          mechanismRecord('attention-head', {
            kind: 'attention-head',
            sourceId: undefined,
            neuronIndex: undefined,
            headIndex: 3,
          }),
        ],
      })
    ).toEqual({ valid: true, errors: [] });
  });

  it('round-trips a versioned portable graph with deterministic collection order', () => {
    const graph = {
      mechanisms: [{ id: 'mechanism-b' }, { id: 'mechanism-a' }],
      hypotheses: [
        {
          id: 'hypothesis-a',
          mechanismIds: ['mechanism-a'],
          evidenceIds: ['evidence-negative'],
          claim: 'The circuit predicts the held-out behavior.',
          status: 'proposed',
        },
      ],
      experiments: [
        {
          id: 'experiment-a',
          mechanismIds: ['mechanism-a'],
          hypothesisIds: ['hypothesis-a'],
          seed: 17,
          inputSplitId: 'held-out-v1',
          observations: [
            { kind: 'negative', summary: 'The effect did not reproduce.' },
          ],
        },
      ],
      estimates: [
        {
          id: 'estimate-a',
          hypothesisIds: ['hypothesis-a'],
          evidenceIds: ['evidence-negative'],
          metric: { name: 'accuracy', value: 0.72 },
        },
      ],
      evidence: [
        {
          id: 'evidence-negative',
          mechanismIds: ['mechanism-a'],
          hypothesisIds: ['hypothesis-a'],
          experimentIds: ['experiment-a'],
          kind: 'negative',
          validationState: 'reviewed',
        },
      ],
      edges: [
        {
          id: 'edge-supports',
          fromId: 'hypothesis-a',
          toId: 'evidence-negative',
          relation: 'supports',
        },
      ],
    };
    const exported = exportEvidenceGraphV1(graph);

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const reconstructed = JSON.parse(exported.json);
    expect(reconstructed.schemaVersion).toBe(1);
    expect(reconstructed.mechanisms.map(record => record.id)).toEqual([
      'mechanism-a',
      'mechanism-b',
    ]);
    expect(reconstructed.hypotheses).toEqual(graph.hypotheses);
    expect(reconstructed.experiments).toEqual(graph.experiments);
    expect(reconstructed.estimates).toEqual(graph.estimates);
    expect(reconstructed.evidence).toEqual(graph.evidence);
    expect(reconstructed.edges).toEqual(graph.edges);
    expect(
      exportEvidenceGraphV1({
        ...graph,
        mechanisms: [...graph.mechanisms].reverse(),
      })
    ).toEqual(exported);
  });

  it('does not export graphs with unresolved references', () => {
    expect(
      exportEvidenceGraphV1({
        hypotheses: [
          { id: 'hypothesis-a', mechanismIds: ['missing-mechanism'] },
        ],
      })
    ).toEqual({
      valid: false,
      errors: [
        {
          code: 'unresolved-reference',
          id: 'hypothesis-a',
          field: 'mechanismIds',
          referenceId: 'missing-mechanism',
        },
      ],
    });
  });

  it('exports omitted graph collections as empty arrays', () => {
    const exported = exportEvidenceGraphV1({});

    expect(exported).toEqual({
      valid: true,
      json: JSON.stringify({
        schemaVersion: 1,
        mechanisms: [],
        hypotheses: [],
        experiments: [],
        estimates: [],
        evidence: [],
        edges: [],
      }),
    });
  });

  it('retrieves directed graph context in deterministic bounded pages', () => {
    const graph = connectedContextGraph();
    const firstPage = getEvidenceGraphContextV1(graph, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 3,
    });

    expect(firstPage.valid).toBe(true);
    if (!firstPage.valid) return;
    expect(firstPage.mechanism.id).toBe('mechanism-a');
    expect(firstPage.totalItems).toBe(6);
    expect(firstPage.items.map(item => item.id)).toEqual([
      'edge-a',
      'edge-b',
      'edge-c',
    ]);
    expect(firstPage.items[1].record).toMatchObject({
      fromId: 'hypothesis-a',
      toId: 'evidence-a',
      relation: 'contradicts',
    });
    expect(firstPage.nextCursor).toEqual({ type: 'edge', id: 'edge-c' });
    expect(firstPage.warnings).toContainEqual({
      code: 'evidence-not-reproduced',
      id: 'evidence-a',
      validationState: 'unreviewed',
    });
    expect(firstPage.warnings).toContainEqual({
      code: 'hypothesis-confidence-unspecified',
      id: 'hypothesis-a',
    });

    const secondPage = getEvidenceGraphContextV1(graph, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 3,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.valid).toBe(true);
    if (!secondPage.valid) return;
    expect(secondPage.items.map(item => item.id)).toEqual([
      'evidence-a',
      'experiment-a',
      'hypothesis-a',
    ]);
    expect(secondPage.nextCursor).toBeNull();
    expect(secondPage.items[0].record.kind).toBe('negative');

    expect(
      getEvidenceGraphContextV1(graph, { mechanismId: 'mechanism-a' }).items
    ).toEqual([...firstPage.items, ...secondPage.items]);
  });
});

describe('presentEvidenceGraphContextV1', () => {
  it('presents competing hypotheses apart from their supporting and contradicting evidence', () => {
    const graph = connectedContextGraph();
    graph.hypotheses.push({
      id: 'hypothesis-b',
      status: 'proposed',
      mechanismIds: [],
      evidenceIds: ['evidence-b'],
      authorId: 'researcher-b',
    });
    graph.evidence.push({
      id: 'evidence-b',
      kind: 'observed',
      validationState: 'unreviewed',
    });
    graph.edges.push(
      {
        id: 'edge-d',
        fromId: 'mechanism-a',
        toId: 'hypothesis-b',
        relation: 'connected-to',
      },
      {
        id: 'edge-e',
        fromId: 'hypothesis-b',
        toId: 'evidence-b',
        relation: 'supports',
      }
    );
    const context = getEvidenceGraphContextV1(graph, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 100,
    });

    const presented = presentEvidenceGraphContextV1(context);

    expect(presented.valid).toBe(true);
    if (!presented.valid) return;
    expect(presented.hypotheses.map(record => record.id)).toEqual([
      'hypothesis-a',
      'hypothesis-b',
    ]);
    expect(presented.evidence.map(record => record.id)).toEqual([
      'evidence-a',
      'evidence-b',
    ]);
    expect(presented.evidence[0].kind).toBe('negative');
    expect(presented.hypotheses.map(record => record.id)).not.toContain(
      'evidence-a'
    );
    expect(presented.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromId: 'hypothesis-a',
          toId: 'evidence-a',
          relation: 'contradicts',
        }),
        expect.objectContaining({
          fromId: 'hypothesis-b',
          toId: 'evidence-b',
          relation: 'supports',
        }),
      ])
    );
    expect(presented.items).toEqual(context.items);
    expect(presented.nextCursor).toBeNull();
  });

  it('keeps relationship endpoint IDs when records are outside the current page', () => {
    const graph = connectedContextGraph();
    const context = getEvidenceGraphContextV1(graph, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 1,
    });
    expect(context.valid).toBe(true);
    if (!context.valid) return;

    const presented = presentEvidenceGraphContextV1(context);

    expect(presented.valid).toBe(true);
    if (!presented.valid) return;
    expect(presented.relationships).toEqual([
      expect.objectContaining({
        id: 'edge-a',
        fromId: 'mechanism-a',
        toId: 'hypothesis-a',
      }),
    ]);
    expect(presented.hypotheses).toEqual([]);
    expect(presented.evidence).toEqual([]);
    expect(presented.nextCursor).toEqual({ type: 'edge', id: 'edge-a' });
  });

  it('passes invalid context responses through unchanged', () => {
    const invalid = getEvidenceGraphContextV1(connectedContextGraph(), {
      mechanismId: 'missing-mechanism',
    });

    expect(presentEvidenceGraphContextV1(invalid)).toEqual(invalid);
  });
});

describe('getEvidenceGraphContextV1', () => {
  it('surfaces missing context and completed confidence metadata', () => {
    const empty = getEvidenceGraphContextV1(
      { mechanisms: [mechanismRecord('mechanism-a')] },
      { mechanismId: 'mechanism-a' }
    );
    expect(empty.valid).toBe(true);
    if (!empty.valid) return;
    expect(empty.items).toEqual([]);
    expect(empty.warnings).toEqual([
      { code: 'missing-evidence', mechanismId: 'mechanism-a' },
      { code: 'missing-experiments', mechanismId: 'mechanism-a' },
      { code: 'missing-hypotheses', mechanismId: 'mechanism-a' },
    ]);

    const graph = connectedContextGraph();
    graph.hypotheses[0].status = 'reproduced';
    graph.hypotheses[0].confidence = 0.9;
    graph.experiments[0].status = 'completed';
    graph.evidence[0].validationState = 'reproduced';
    const complete = getEvidenceGraphContextV1(graph, {
      mechanismId: 'mechanism-a',
    });
    expect(complete.valid).toBe(true);
    if (!complete.valid) return;
    expect(complete.warnings).toEqual([]);
  });

  it('rejects invalid context queries and unknown mechanism or cursor IDs', () => {
    const graph = connectedContextGraph();
    expect(getEvidenceGraphContextV1(graph, null)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-query' }],
    });
    expect(
      getEvidenceGraphContextV1(graph, {
        mechanismId: '',
        maxDepth: 0,
        pageSize: 101,
        cursor: { type: 'other', id: '' },
      }).errors.map(error => error.code)
    ).toEqual([
      'invalid-mechanism-id',
      'invalid-depth',
      'invalid-page-size',
      'invalid-cursor',
    ]);
    expect(
      getEvidenceGraphContextV1(graph, {
        mechanismId: 'hypothesis-a',
      })
    ).toEqual({
      valid: false,
      errors: [{ code: 'unknown-mechanism', mechanismId: 'hypothesis-a' }],
    });
    expect(
      getEvidenceGraphContextV1(graph, {
        mechanismId: 'mechanism-a',
        cursor: { type: 'edge', id: 'missing-edge' },
      })
    ).toEqual({
      valid: false,
      errors: [{ code: 'unknown-cursor', cursorId: 'missing-edge' }],
    });
    expect(
      getEvidenceGraphContextV1(
        {
          mechanisms: [{ id: 'mechanism-a' }],
          hypotheses: [{ id: 'bad', mechanismIds: ['missing-mechanism'] }],
        },
        { mechanismId: 'mechanism-a' }
      ).valid
    ).toBe(false);
  });
});

describe('getEvidenceGraphContextSnapshotV1', () => {
  const digest = async canonical => `sha256:${canonical.length}:${canonical}`;

  it('returns stable pages that preserve every typed record and edge once', async () => {
    const graph = connectedContextGraph();
    graph.evidence[0].kind = 'negative';
    graph.evidence.push({
      id: 'evidence-null',
      kind: 'null',
      validationState: 'unreviewed',
    });
    graph.edges.push({
      id: 'edge-null',
      fromId: 'hypothesis-a',
      toId: 'evidence-null',
      relation: 'supports',
    });
    const first = await getEvidenceGraphContextSnapshotV1(
      graph,
      {
        mechanismId: 'mechanism-a',
        pageSize: 2,
        maxItems: 3,
      },
      digest
    );
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(first.contextStatus).toBe('capped');
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const firstRepeat = await getEvidenceGraphContextSnapshotV1(
      graph,
      {
        mechanismId: 'mechanism-a',
        pageSize: 2,
        maxItems: 3,
      },
      digest
    );
    expect(firstRepeat.valid && firstRepeat.snapshotId).toBe(first.snapshotId);

    const all = [...first.items];
    let nextCursor = first.nextCursor;
    while (nextCursor) {
      const page = await getEvidenceGraphContextSnapshotV1(
        graph,
        {
          mechanismId: 'mechanism-a',
          pageSize: 2,
          maxItems: 3,
          cursor: nextCursor,
        },
        digest
      );
      expect(page.valid).toBe(true);
      if (!page.valid) return;
      expect(page.snapshotId).toBe(first.snapshotId);
      all.push(...page.items);
      nextCursor = page.nextCursor;
      if (!nextCursor && page.continuationCursor) {
        const continuation = await getEvidenceGraphContextSnapshotV1(
          graph,
          {
            mechanismId: 'mechanism-a',
            pageSize: 2,
            maxItems: 3,
            cursor: page.continuationCursor,
          },
          digest
        );
        expect(continuation.valid).toBe(true);
        if (!continuation.valid) return;
        expect(continuation.snapshotId).toBe(first.snapshotId);
        all.push(...continuation.items);
        nextCursor = continuation.nextCursor;
        if (!nextCursor && continuation.continuationCursor) {
          nextCursor = continuation.continuationCursor;
        }
      }
    }
    expect(new Set(all.map(item => `${item.itemType}:${item.id}`)).size).toBe(
      all.length
    );
    expect(all.map(item => item.id)).toEqual(
      [...all.map(item => item.id)].sort()
    );
    expect(all.find(item => item.id === 'evidence-a')).toMatchObject({
      itemType: 'record',
      record: { kind: 'negative' },
    });
    expect(all.find(item => item.id === 'evidence-null')).toMatchObject({
      itemType: 'record',
      record: { kind: 'null' },
    });
    expect(all.find(item => item.id === 'edge-b')).toMatchObject({
      itemType: 'edge',
      record: { relation: 'contradicts' },
    });
    expect(first.warnings).toContainEqual({
      code: 'evidence-not-reproduced',
      id: 'evidence-a',
      validationState: 'unreviewed',
    });
  });

  it('marks empty and completed snapshots explicitly and changes ID with source data', async () => {
    const graph = connectedContextGraph();
    const complete = await getEvidenceGraphContextSnapshotV1(
      graph,
      {
        mechanismId: 'mechanism-a',
        pageSize: 20,
      },
      digest
    );
    expect(complete).toMatchObject({
      valid: true,
      contextStatus: 'complete',
      continuationCursor: null,
    });
    if (!complete.valid) return;
    graph.evidence[0].summary = 'Source changed';
    const changed = await getEvidenceGraphContextSnapshotV1(
      graph,
      {
        mechanismId: 'mechanism-a',
        pageSize: 20,
      },
      digest
    );
    expect(changed.valid && changed.snapshotId).not.toBe(complete.snapshotId);
    const empty = await getEvidenceGraphContextSnapshotV1(
      { mechanisms: [mechanismRecord('mechanism-a')] },
      {
        mechanismId: 'mechanism-a',
      },
      digest
    );
    expect(empty).toMatchObject({
      valid: true,
      items: [],
      contextStatus: 'complete',
      nextCursor: null,
      continuationCursor: null,
    });
  });

  it('rejects missing hash adapters, invalid bounds, changed snapshots and invalid windows', async () => {
    const graph = connectedContextGraph();
    expect(
      await getEvidenceGraphContextSnapshotV1(graph, {
        mechanismId: 'mechanism-a',
      })
    ).toEqual({
      valid: false,
      errors: [{ code: 'missing-snapshot-hasher' }],
    });
    for (const query of [
      { mechanismId: 'mechanism-a', maxItems: 0 },
      { mechanismId: 'mechanism-a', maxItems: 1001 },
      { mechanismId: 'mechanism-a', maxDepth: 5 },
      { mechanismId: 'mechanism-a', pageSize: 101 },
      { mechanismId: 'mechanism-a', pageSize: 5, maxItems: 4 },
      {
        mechanismId: 'mechanism-a',
        cursor: { snapshotId: 'x', offset: -1, windowStart: 0, windowEnd: 1 },
      },
    ]) {
      expect(
        (await getEvidenceGraphContextSnapshotV1(graph, query, digest)).valid
      ).toBe(false);
    }
    const page = await getEvidenceGraphContextSnapshotV1(
      graph,
      {
        mechanismId: 'mechanism-a',
        pageSize: 1,
        maxItems: 2,
      },
      digest
    );
    expect(page.valid).toBe(true);
    if (!page.valid) return;
    expect(
      await getEvidenceGraphContextSnapshotV1(
        graph,
        {
          mechanismId: 'mechanism-a',
          pageSize: 1,
          maxItems: 2,
          cursor: { ...page.nextCursor, snapshotId: 'unknown-snapshot' },
        },
        digest
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'snapshot-changed' }] });
    expect(
      await getEvidenceGraphContextSnapshotV1(
        graph,
        {
          mechanismId: 'mechanism-a',
          pageSize: 1,
          maxItems: 2,
          cursor: {
            snapshotId: page.snapshotId,
            offset: 1,
            windowStart: 1,
            windowEnd: 2,
          },
        },
        digest
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-snapshot-cursor' }],
    });
  });

  it('reports invalid graph, query, mechanism, and digest states', async () => {
    expect(
      await getEvidenceGraphContextSnapshotV1(
        null,
        { mechanismId: 'mechanism-a' },
        digest
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'invalid-graph' }] });
    expect(
      await getEvidenceGraphContextSnapshotV1(
        connectedContextGraph(),
        null,
        digest
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'invalid-query' }] });
    expect(
      await getEvidenceGraphContextSnapshotV1(
        connectedContextGraph(),
        { mechanismId: 'unknown-mechanism' },
        digest
      )
    ).toMatchObject({ valid: false, errors: [{ code: 'unknown-mechanism' }] });
    expect(
      await getEvidenceGraphContextSnapshotV1(
        connectedContextGraph(),
        { mechanismId: 'mechanism-a' },
        async () => null
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-snapshot-digest' }],
    });
  });
});
