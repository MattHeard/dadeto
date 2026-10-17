import { describe, expect, it } from '@jest/globals';
import { validateEvidenceGraphV1 } from '../../../src/core/interpretability/interpretability.js';

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
});
