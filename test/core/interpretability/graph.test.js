import { describe, expect, it } from '@jest/globals';
import {
  exportEvidenceGraphV1,
  getEvidenceGraphContextV1,
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
