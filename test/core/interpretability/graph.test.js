import { describe, expect, it } from '@jest/globals';
import {
  exportEvidenceGraphV1,
  validateEvidenceGraphV1,
} from '../../../src/core/interpretability/interpretability.js';

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
});
