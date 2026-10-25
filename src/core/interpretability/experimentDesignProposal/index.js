/**
 * Draft a bounded AlgZoo follow-up plan from one complete attributed context.
 * The returned plan is always proposed and untested; this function performs no
 * replay, model inference, persistence, or external I/O.
 * @param {Record<string, any>} candidate Discovered candidate with resolved identity.
 * @param {Record<string, any>} context Complete immutable context snapshot.
 * @param {{id: string, authorId: string, agentId?: string, createdAt: string}} proposal Proposal identity and attribution.
 * @returns {{valid: true, design: Record<string, any>}|{valid: false, errors: Array<{code: string}>}} Proposed plan or a stable refusal.
 */
export function proposeAlgZooEvidenceSensitiveExperimentDesignV1(
  candidate,
  context,
  proposal
) {
  const { id, authorId, agentId, createdAt } = proposal ?? {};
  const candidateModelIdentity = parsePinnedModelIdentity(candidate?.model);
  const mechanismModelIdentity = parsePinnedModelIdentity(
    context?.mechanism?.model
  );
  if (
    !candidate ||
    !context?.valid ||
    !Array.isArray(context.items) ||
    context.items.length !== context.totalItems ||
    !context.mechanism ||
    context.contextStatus !== 'complete' ||
    context.nextCursor ||
    context.continuationCursor ||
    typeof context.snapshotId !== 'string' ||
    !/^atlas:context:v1:[a-f0-9]{64}$/i.test(context.snapshotId) ||
    typeof id !== 'string' ||
    !id.trim() ||
    typeof authorId !== 'string' ||
    !authorId.trim() ||
    typeof createdAt !== 'string' ||
    Number.isNaN(Date.parse(createdAt))
  ) {
    return failure('invalid-design-input');
  }
  if (
    candidate.identityStatus !== 'resolved' ||
    typeof candidate.canonicalMechanismId !== 'string' ||
    candidate.canonicalMechanismId.trim() === '' ||
    candidate.legacyMechanismId !== context.mechanism?.id ||
    !candidateModelIdentity ||
    !mechanismModelIdentity ||
    JSON.stringify(candidateModelIdentity) !==
      JSON.stringify(mechanismModelIdentity)
  ) {
    return failure('unresolved-candidate-identity');
  }
  if (
    context.mechanism.kind !== 'recurrent-state' ||
    context.mechanism.model.modelId !== 'arc-algzoo/m16-10-second-argmax' ||
    context.mechanism.sourceId !== 'alg-zoo-m16-10' ||
    context.mechanism.activationHook !== 'rnn.hidden_state' ||
    context.mechanism.neuronIndex !== 0 ||
    context.mechanism.timeStep !== 9
  ) {
    return failure('unsupported-design-domain');
  }

  const records = context.items
    .filter(item => item.itemType === 'record')
    .map(item => item.record);
  const hypothesis = records
    .filter(
      record =>
        record?.schemaVersion === 1 &&
        Array.isArray(record.mechanismIds) &&
        record.mechanismIds.includes(context.mechanism.id) &&
        typeof record.claim === 'string' &&
        record.claim.trim() !== ''
    )
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!hypothesis) return failure('insufficient-hypothesis-context');
  const threshold = parseThreshold(hypothesis.claim);
  if (threshold === null) return failure('insufficient-hypothesis-context');

  const experimentsById = new Map(
    records
      .filter(record => record?.procedure && Array.isArray(record.mechanismIds))
      .map(
        record =>
          /** @type {[string, Record<string, any>]} */ ([record.id, record])
      )
  );
  const relevantEvidence = records
    .filter(
      record =>
        record?.schemaVersion === 1 &&
        Array.isArray(record.experimentIds) &&
        (record.mechanismIds?.includes(context.mechanism.id) ||
          record.hypothesisIds?.includes(hypothesis.id)) &&
        (hypothesis.evidenceIds?.includes(record.id) ||
          record.hypothesisIds?.includes(hypothesis.id))
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const evidenceWithSeed = relevantEvidence.flatMap(
    (/** @type {Record<string, any>} */ evidence) =>
      evidence.experimentIds
        .map((/** @type {string} */ experimentId) =>
          experimentsById.get(experimentId)
        )
        .filter(
          (
            /** @type {Record<string, any>|undefined} */
            experiment
          ) =>
            experiment?.mechanismIds?.includes(context.mechanism.id) &&
            Number.isInteger(experiment.seed) &&
            experiment.seed >= 0
        )
        .map((/** @type {Record<string, any>} */ experiment) => ({
          evidence,
          experiment,
        }))
  );
  const observed = evidenceWithSeed.find(
    ({ evidence }) => evidence.kind === 'observation'
  );
  if (!observed) return failure('insufficient-observed-evidence');
  const counterexample = evidenceWithSeed.find(
    ({ evidence }) =>
      ['negative', 'null', 'contradictory'].includes(evidence.kind) &&
      evidence.id !== observed.evidence.id
  );
  const hasCounterexample = counterexample !== undefined;
  const usedSeeds = new Set(
    evidenceWithSeed.map(({ experiment }) => experiment.seed)
  );
  const heldOutSeeds = hasCounterexample ? buildHeldOutSeeds(usedSeeds) : [];
  let replicationSeed = 0;
  while (usedSeeds.has(replicationSeed)) replicationSeed += 1;

  const test = hasCounterexample
    ? createContrastiveTest(observed, counterexample, heldOutSeeds, threshold)
    : createReplicationTest(observed, replicationSeed, threshold);
  const citations = [
    {
      targetType: 'hypothesis',
      targetId: hypothesis.id,
      relation: 'motivated-by',
    },
    {
      targetType: 'evidence',
      targetId: observed.evidence.id,
      relation: 'tests',
    },
    ...(hasCounterexample
      ? [
          {
            targetType: 'evidence',
            targetId: counterexample.evidence.id,
            relation: 'challenges',
          },
        ]
      : []),
  ];
  return {
    valid: true,
    design: {
      schemaVersion: 1,
      id,
      status: 'proposed',
      executionStatus: 'untested',
      authorId,
      ...(agentId ? { agentId } : {}),
      createdAt,
      mechanism: {
        mechanismId: context.mechanism.id,
        componentId: candidate.canonicalMechanismId,
        model: context.mechanism.model,
      },
      contextSnapshotId: context.snapshotId,
      citations,
      uncertainty: hasCounterexample
        ? `Prior replay evidence ${observed.evidence.id} at seed ${observed.experiment.seed} and ${counterexample.evidence.id} at seed ${counterexample.experiment.seed} disagree; the contrast may depend on input sequence or an uncontrolled condition.`
        : `Only the prior observation ${observed.evidence.id} at seed ${observed.experiment.seed} is available; independent reproduction at a new seed is unknown.`,
      favoredHypothesis: hasCounterexample
        ? 'The neuron-0 threshold response at recurrent step 9 varies across normal input sequences.'
        : hypothesis.claim,
      alternativeHypothesis: {
        kind: 'null',
        statement: hasCounterexample
          ? 'The apparent difference between the prior input-sequence conditions does not reproduce under matched held-out inputs.'
          : 'The reported threshold response does not reproduce on an independent input sequence.',
      },
      test,
      reproducibility: {
        status: 'not-yet-executable',
        inputSpecification: hasCounterexample
          ? `Generate new input sequences at held-out seeds ${heldOutSeeds.join(', ')}; preserve source artifact digests and do not reuse prior measurements as new results.`
          : `One new deterministic input sequence using seed ${replicationSeed}, distinct from all cited prior experiment seeds.`,
        budget: {
          maxInputs: hasCounterexample ? heldOutSeeds.length : 1,
          maxComputeUnits: hasCounterexample ? heldOutSeeds.length : 1,
          computeUnit: 'AlgZoo fixture forward pass',
        },
        sourceReferences: [],
      },
    },
  };
}

/**
 * Choose the lowest 16 nonnegative seeds not present in prior evidence.
 * @param {Set<number>} usedSeeds Seeds already attached to relevant evidence.
 * @returns {number[]} Deterministic held-out seed selection.
 */
function buildHeldOutSeeds(usedSeeds) {
  const heldOutSeeds = [];
  for (let seed = 0; heldOutSeeds.length < 16; seed += 1) {
    if (!usedSeeds.has(seed)) heldOutSeeds.push(seed);
  }
  return heldOutSeeds;
}

/**
 * Describe an evidence contrast as a new seed-sweep test.
 * @param {{evidence: Record<string, any>, experiment: Record<string, any>}} observed Prior positive observation.
 * @param {{evidence: Record<string, any>, experiment: Record<string, any>}} counterexample Prior negative/null/contradictory evidence.
 * @param {number[]} heldOutSeeds New deterministic seeds.
 * @param {number} threshold Explicit scalar threshold from the cited hypothesis.
 * @returns {Record<string, any>} Test design tied to both source experiments.
 */
function createContrastiveTest(
  observed,
  counterexample,
  heldOutSeeds,
  threshold
) {
  return {
    inputSelection: `Run a held-out seed sweep over [${heldOutSeeds.join(', ')}], excluding the prior observed seed ${observed.experiment.seed} and counterexample seed ${counterexample.experiment.seed}.`,
    inputConstruction:
      'Generate each sequence from the pinned AlgZoo M16,10 normal-input fixture and retain its exact sequence digest.',
    measurements: [
      `Recurrent hidden-state activation for neuron 0 at step 9 for each seed, classified as above ${threshold} or at-or-below ${threshold}.`,
    ],
    interventions: [],
    controls: [
      `Use prior observed record ${observed.evidence.id} at seed ${observed.experiment.seed} and counterexample ${counterexample.evidence.id} at seed ${counterexample.experiment.seed} as reported reference points, not as held-out results.`,
      'Preserve the cited source artifact digests and model/checkpoint identity unchanged.',
    ],
    expectedOutcomes: expectedOutcomePair(
      `Held-out activations include values above ${threshold} and at-or-below ${threshold}, reproducing the sequence-dependent threshold crossing.`,
      `Held-out activations remain on one side of ${threshold}, so the prior difference does not generalize across sequences.`
    ),
    weakeningCondition: `The input-sensitivity account is weakened if all 16 held-out seed activations fall on the same side of ${threshold}.`,
  };
}

/**
 * Describe an independent replication when the complete context has no counterexample.
 * @param {{evidence: Record<string, any>, experiment: Record<string, any>}} observed Prior observation.
 * @param {number} seed Unused deterministic seed.
 * @param {number} threshold Explicit scalar threshold from the cited hypothesis.
 * @returns {Record<string, any>} Replication test design tied to its source.
 */
function createReplicationTest(observed, seed, threshold) {
  return {
    inputSelection: `Generate one previously unrun normal input sequence at seed ${seed}; the only existing positive reference is ${observed.evidence.id} from seed ${observed.experiment.seed}.`,
    inputConstruction:
      'Use the pinned AlgZoo M16,10 input generator with the selected seed and record the exact sequence digest before evaluation.',
    measurements: [
      `Activation at the cited recurrent mechanism and step 9, compared with ${threshold}.`,
    ],
    interventions: [],
    controls: [
      `Compare the new measurement with the prior observation ${observed.evidence.id}; do not treat the earlier value as a new result.`,
    ],
    expectedOutcomes: expectedOutcomePair(
      `The new seed produces an activation above ${threshold}, reproducing the prior threshold claim.`,
      `The new seed produces an activation at or below ${threshold}, failing to reproduce the prior threshold claim.`
    ),
    weakeningCondition: `The threshold claim is weakened if the new independent seed produces an activation at or below ${threshold}.`,
  };
}

/**
 * Pair predictions without implying an evidence-backed ranking.
 * @param {string} favoredObservation Expected observation under the proposed account.
 * @param {string} alternativeObservation Expected observation under the rival account.
 * @returns {Array<{hypothesis: string, observation: string}>} Explicit rival outcomes.
 */
function expectedOutcomePair(favoredObservation, alternativeObservation) {
  return [
    { hypothesis: 'favored', observation: favoredObservation },
    { hypothesis: 'alternative', observation: alternativeObservation },
  ];
}

/**
 * Return one deterministic validation refusal.
 * @param {string} code Stable refusal code.
 * @returns {{valid: false, errors: Array<{code: string}>}} Failure result.
 */
function failure(code) {
  return { valid: false, errors: [{ code }] };
}

/**
 * Parse only an explicit scalar threshold supported by the initial AlgZoo example.
 * @param {string} claim Attributed hypothesis claim.
 * @returns {number|null} Threshold or null when no threshold is explicit.
 */
function parseThreshold(claim) {
  const match = claim.match(
    /\b(?:exceeds|above|greater than)\s+(-?\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  const threshold = Number(match[1]);
  return Number.isFinite(threshold) ? threshold : null;
}

/**
 * Parse every model/checkpoint field that contributes to research identity.
 * @param {Record<string, any>} model Candidate or retrieved model identity.
 * @returns {Array<unknown>|null} Ordered identity fields, or null when absent.
 */
function parsePinnedModelIdentity(model) {
  if (!model || typeof model !== 'object') return null;
  return [
    model.modelId,
    model.repository,
    model.revision,
    model.architecture,
    model.checkpoint?.sha256,
    model.checkpoint?.trainingRunId,
    model.tokenizer?.repository,
    model.tokenizer?.revision,
  ];
}
