import { discoverResearchCandidatesV1 } from '../../../src/core/interpretability/interpretability.js';

const baseModel = {
  modelId: 'algzoo-m16x10',
  repository: 'https://huggingface.co/example/algzoo',
  revision: 'a'.repeat(40),
  architecture: 'RNN',
};

/**
 * Build a test mechanism.
 * @param {string} id Candidate mechanism ID.
 * @param {Record<string, any>} [model] Pinned model identity.
 * @param {string} [kind] Mechanism kind.
 * @returns {Record<string, any>} Test mechanism record.
 */
function mechanism(id, model = baseModel, kind = 'native-neuron') {
  return {
    id,
    schemaVersion: 1,
    kind,
    model,
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    sourceId: 'recurrent-core',
    neuronIndex: 7,
    ...(kind === 'recurrent-state' ? { timeStep: 1 } : {}),
  };
}

/**
 * Build a versioned graph record.
 * @param {string} id Record ID.
 * @param {Record<string, any>} fields Record fields.
 * @returns {Record<string, any>} Versioned test record.
 */
function record(id, fields) {
  return { id, schemaVersion: 1, ...fields };
}

/**
 * Build a portable bundle with two attributed mechanisms.
 * @returns {Record<string, any>} Portable test bundle.
 */
function createBundle() {
  const modelB = {
    ...baseModel,
    modelId: 'algzoo-m16x10-checkpoint-b',
    checkpoint: { sha256: 'c'.repeat(64), trainingRunId: 'run-b' },
  };
  const mechanismA = mechanism('mechanism-a');
  const mechanismB = mechanism('mechanism-b', modelB, 'recurrent-state');
  const hypothesisA = record('hypothesis-a', {
    revision: 1,
    claim: 'The unit carries the current input forward.',
    status: 'proposed',
    mechanismIds: [mechanismA.id],
    evidenceIds: ['evidence-a', 'evidence-negative'],
  });
  const hypothesisB = record('hypothesis-b', {
    revision: 1,
    claim: 'The unit retains a previous input.',
    status: 'reviewed',
    mechanismIds: [mechanismB.id],
    evidenceIds: ['evidence-b'],
  });
  const evidence = [
    record('evidence-a', {
      kind: 'observation',
      summary: 'A replay recorded an activation.',
      mechanismIds: [mechanismA.id],
      hypothesisIds: [hypothesisA.id],
      experimentIds: [],
      validationState: 'reviewed',
    }),
    record('evidence-negative', {
      kind: 'negative',
      summary: 'A counterexample weakened the claim.',
      mechanismIds: [],
      hypothesisIds: [hypothesisA.id],
      experimentIds: [],
      validationState: 'unreviewed',
    }),
    record('evidence-b', {
      kind: 'contradictory',
      summary: 'A competing result conflicts with the claim.',
      mechanismIds: [mechanismB.id],
      hypothesisIds: [hypothesisB.id],
      experimentIds: [],
      validationState: 'reviewed',
    }),
  ];
  return {
    evidenceGraph: {
      mechanisms: [mechanismB, mechanismA],
      hypotheses: [hypothesisB, hypothesisA],
      experiments: [],
      estimates: [],
      evidence,
      edges: [],
    },
    mechanismIdentityLinks: [
      {
        legacyMechanismId: mechanismA.id,
        componentId: 'atlas:v2:component:a',
        activationPositionId: 'atlas:v2:position:a',
      },
      {
        legacyMechanismId: mechanismB.id,
        componentId: 'atlas:v2:component:b',
      },
    ],
  };
}

describe('Atlas research candidate discovery', () => {
  it('returns stable, attributed candidate pages and evidence summaries', () => {
    const bundle = createBundle();
    const first = discoverResearchCandidatesV1(bundle, { pageSize: 1 });
    expect(first).toEqual({
      valid: true,
      candidates: [
        {
          candidateId: 'atlas:v2:component:a',
          canonicalMechanismId: 'atlas:v2:component:a',
          activationPositionId: 'atlas:v2:position:a',
          legacyMechanismId: 'mechanism-a',
          identityStatus: 'resolved',
          mechanismKind: 'native-neuron',
          model: baseModel,
          sourceIds: {
            mechanismId: 'mechanism-a',
            hypothesisIds: ['hypothesis-a'],
            evidenceIds: ['evidence-a', 'evidence-negative'],
          },
          hypothesisIds: ['hypothesis-a'],
          evidenceIds: ['evidence-a', 'evidence-negative'],
          hypothesisCount: 1,
          evidenceCounts: {
            prediction: 0,
            observation: 1,
            null: 0,
            negative: 1,
            contradictory: 0,
          },
        },
      ],
      nextCursor: 'atlas:v2:component:a',
    });
    expect(
      discoverResearchCandidatesV1(bundle, {
        pageSize: 1,
        cursor: first.nextCursor,
      })
    ).toMatchObject({
      valid: true,
      candidates: [
        {
          candidateId: 'atlas:v2:component:b',
          canonicalMechanismId: 'atlas:v2:component:b',
          activationPositionId: null,
          identityStatus: 'resolved',
          legacyMechanismId: 'mechanism-b',
          evidenceCounts: { contradictory: 1 },
        },
      ],
      nextCursor: null,
    });
  });

  it('filters by exact model, checkpoint and kind without invented ranking', () => {
    const bundle = createBundle();
    const result = discoverResearchCandidatesV1(bundle, {
      modelId: 'algzoo-m16x10-checkpoint-b',
      checkpointSha256: 'C'.repeat(64),
      mechanismKind: 'recurrent-state',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.candidates.map(item => item.legacyMechanismId)).toEqual([
        'mechanism-b',
      ]);
    }
    expect(
      discoverResearchCandidatesV1(bundle, { modelId: 'unmatched-model' })
    ).toEqual({ valid: true, candidates: [], nextCursor: null });
  });

  it('keeps unresolved identity explicit and requires hypothesis plus evidence', () => {
    const bundle = createBundle();
    bundle.mechanismIdentityLinks = [];
    expect(discoverResearchCandidatesV1(bundle)).toMatchObject({
      valid: true,
      candidates: [
        {
          candidateId: 'mechanism-a',
          canonicalMechanismId: null,
          identityStatus: 'unresolved',
        },
        {
          candidateId: 'mechanism-b',
          canonicalMechanismId: null,
          identityStatus: 'unresolved',
        },
      ],
    });
    const noEvidence = createBundle();
    noEvidence.evidenceGraph.hypotheses = [];
    noEvidence.evidenceGraph.experiments = [];
    noEvidence.evidenceGraph.evidence = [];
    expect(discoverResearchCandidatesV1(noEvidence)).toEqual({
      valid: true,
      candidates: [],
      nextCursor: null,
    });
  });

  it('rejects malformed bundles, filters, cursors and page sizes', () => {
    const bundle = createBundle();
    expect(discoverResearchCandidatesV1(null)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-bundle' }],
    });
    expect(discoverResearchCandidatesV1({ evidenceGraph: null })).toMatchObject(
      { valid: false, errors: [{ code: 'invalid-graph' }] }
    );
    for (const query of [
      null,
      [],
      { pageSize: 0 },
      { pageSize: 101 },
      { cursor: 2 },
      { cursor: 'missing' },
      { extra: 'ignored' },
      { modelId: '' },
      { checkpointSha256: 'bad' },
      { mechanismKind: 'unknown' },
    ]) {
      expect(discoverResearchCandidatesV1(bundle, query).valid).toBe(false);
    }
    expect(
      discoverResearchCandidatesV1({ evidenceGraph: { mechanisms: [] } })
    ).toMatchObject({ valid: true, candidates: [], nextCursor: null });
    expect(discoverResearchCandidatesV1({ evidenceGraph: {} })).toMatchObject({
      valid: true,
      candidates: [],
      nextCursor: null,
    });
    expect(
      discoverResearchCandidatesV1({
        evidenceGraph: { mechanisms: [mechanism('unattributed')] },
      })
    ).toMatchObject({ valid: true, candidates: [], nextCursor: null });
    expect(
      discoverResearchCandidatesV1({
        evidenceGraph: { mechanisms: [] },
        mechanismIdentityLinks: {},
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-links' }],
    });
    expect(
      discoverResearchCandidatesV1({
        evidenceGraph: { mechanisms: [] },
        mechanismIdentityLinks: [null],
      })
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-link' }],
    });
    const ambiguous = createBundle();
    ambiguous.mechanismIdentityLinks.push(ambiguous.mechanismIdentityLinks[0]);
    expect(discoverResearchCandidatesV1(ambiguous)).toMatchObject({
      valid: false,
      errors: [{ code: 'ambiguous-identity-link' }],
    });
  });
});
