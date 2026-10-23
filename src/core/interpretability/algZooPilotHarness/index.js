export {
  evaluateAlgZooRestrictedRule,
  scoreAlgZooBlindedSubmissions,
} from '../algZooPredictionScorer/index.js';

const TARGET_COUNT = 16;
const HELD_OUT_SEQUENCE_COUNT = 1024;
const SEQUENCE_LENGTH = 10;
const WHOLE_MODEL_VARIANT_COUNT = 32;
const WHOLE_MODEL_SAMPLE_COUNT = 100000;
const WHOLE_MODEL_NOISE_SCALES = Object.freeze([0.01, 0.05, 0.1, 0.2]);
const PILOT_BUDGET = Object.freeze({
  investigatorTokens: 20000,
  elapsedMillis: 30 * 60 * 1000,
  toolCalls: 100,
  targetForwardPasses: 10000,
});
const METERED_BUDGET_FIELDS = Object.freeze([
  'investigatorTokens',
  'toolCalls',
  'targetForwardPasses',
]);
const PILOT_TARGETS = Object.freeze(
  Array.from({ length: TARGET_COUNT }, (_, index) => index)
);
const MANIFEST_FIELDS = Object.freeze([
  'gitCommit',
  'protocolSha256',
  'fixturePath',
  'fixtureSha256',
  'targetEvaluatorSha256',
  'investigatorModel',
  'evaluatorModel',
  'tokenizerHash',
  'promptHashes',
  'toolHashes',
  'dependencyHashes',
  'orderSeedCommitment',
  'inputSeedCommitments',
  'heldOutSeedCommitments',
  'perturbationSeedCommitments',
  'mapSchemaHash',
  'commonBackgroundHash',
  'accessControlConfiguration',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;

/**
 * Create the fixed census schedule using a reproducible target and session order.
 * @param {number} seed Committed 32-bit randomization seed.
 * @returns {{valid: true, protocolVersion: string, targetOrder: Array<number>, pairs: Array<Record<string, any>>}} Deterministic paired schedule.
 */
export function createAlgZooPilotSchedule(seed) {
  if (seed !== seed >>> 0) {
    throw new RangeError('A valid 32-bit order seed is required.');
  }
  const random = createSeededRandom(seed);
  const targetOrder = [...PILOT_TARGETS];
  for (let index = targetOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [targetOrder[index], targetOrder[swapIndex]] = [
      targetOrder[swapIndex],
      targetOrder[index],
    ];
  }

  const pairs = targetOrder.map((unitIndex, pairOrder) => {
    const sessionOrder =
      random() < 0.5 ? ['control', 'treatment'] : ['treatment', 'control'];
    const pairId = `m16-10-pair-${String(pairOrder + 1).padStart(2, '0')}`;
    return {
      pairId,
      pairOrder,
      unitIndex,
      sessionOrder,
      sessions: {
        control: createSessionPlan(pairId, pairOrder, unitIndex, 'control'),
        treatment: createSessionPlan(pairId, pairOrder, unitIndex, 'treatment'),
      },
    };
  });
  return { valid: true, protocolVersion: '1.0.3', targetOrder, pairs };
}

/**
 * Generate one pinned standard-normal input sequence using Mulberry32 and Box-Muller.
 * @param {number} seed 32-bit input seed.
 * @param {number} [length] Number of sequence values.
 * @returns {Array<number>} Deterministic standard-normal input sequence.
 */
export function createAlgZooNormalSequence(seed, length = SEQUENCE_LENGTH) {
  if (seed !== seed >>> 0 || !Number.isSafeInteger(length) || length < 0) {
    throw new RangeError(
      'A valid 32-bit seed and nonnegative length are required.'
    );
  }
  const random = createSeededRandom(seed);
  const sequence = [];
  while (sequence.length < length) {
    const firstUniform = Math.max(random(), Number.MIN_VALUE);
    const secondUniform = random();
    const radius = Math.sqrt(-2 * Math.log(firstUniform));
    const angle = 2 * Math.PI * secondUniform;
    sequence.push(radius * Math.cos(angle));
    if (sequence.length < length) sequence.push(radius * Math.sin(angle));
  }
  return sequence;
}

/**
 * Generate the deterministic held-out set for one target from its committed seed.
 * @param {number} seed Target-specific 32-bit held-out seed.
 * @param {number} [count] Number of length-ten sequences.
 * @returns {Array<Array<number>>} Held-out sequences for the evaluator adapter.
 */
export function createAlgZooHeldOutSequences(
  seed,
  count = HELD_OUT_SEQUENCE_COUNT
) {
  createAlgZooNormalSequence(seed, 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(
      'A valid 32-bit seed and nonnegative count are required.'
    );
  }
  return Array.from({ length: count }, (_, index) =>
    createAlgZooNormalSequence((seed + index) >>> 0)
  );
}

/**
 * Build the deterministic prelaunch manifest and session plan from frozen metadata.
 * @param {Record<string, any>} configuration Frozen model, tool, prompt, and seed metadata.
 * @param {Record<string, any>} fixture Pinned AlgZoo fixture metadata.
 * @returns {{valid: true, schedule: Record<string, any>, manifest: Record<string, any>, json: string}|{valid: false, errors: Array<Record<string, any>>}} Prelaunch plan or stable configuration errors.
 */
export function createAlgZooPilotPlan(configuration, fixture) {
  /** @type {Array<{code: string, field?: string}>} */
  const errors = MANIFEST_FIELDS.filter(field => {
    const value = configuration?.[field];
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0)
    );
  }).map(field => ({ code: 'missing-manifest-field', field }));
  if (
    !Number.isSafeInteger(configuration?.orderSeed) ||
    configuration.orderSeed < 0 ||
    configuration.orderSeed > 0xffffffff
  ) {
    errors.push({ code: 'invalid-order-seed' });
  }
  if (
    configuration?.inputSeedCommitments?.length !== TARGET_COUNT ||
    configuration?.heldOutSeedCommitments?.length !== TARGET_COUNT ||
    configuration?.perturbationSeedCommitments?.length !== 32
  ) {
    errors.push({ code: 'invalid-seed-commitment-count' });
  }
  const manifestHashes = [
    configuration?.protocolSha256,
    configuration?.fixtureSha256,
    configuration?.targetEvaluatorSha256,
    configuration?.tokenizerHash,
    configuration?.orderSeedCommitment,
    configuration?.mapSchemaHash,
    configuration?.commonBackgroundHash,
    ...Object.values(configuration?.promptHashes ?? {}),
    ...Object.values(configuration?.toolHashes ?? {}),
    ...Object.values(configuration?.dependencyHashes ?? {}),
    ...(configuration?.inputSeedCommitments ?? []),
    ...(configuration?.heldOutSeedCommitments ?? []),
    ...(configuration?.perturbationSeedCommitments ?? []),
  ];
  if (
    !COMMIT_PATTERN.test(configuration?.gitCommit ?? '') ||
    !manifestHashes.every(
      value => typeof value === 'string' && SHA256_PATTERN.test(value)
    )
  ) {
    errors.push({ code: 'invalid-manifest-hash' });
  }
  if (
    configuration?.fixturePath !==
    'test/fixtures/interpretability/alg-zoo-m16-10.json'
  ) {
    errors.push({ code: 'fixture-path-does-not-match-preregistration' });
  }
  if (
    fixture?.source?.revision !== '4433f505a90e85a37d35d34f80f6cccf4a37cef4' ||
    fixture?.source?.checkpointSha256 !==
      '498bd9a87c469e18e824a78e55c22843c7595776f1bfc2dfe07c36e5616218bb' ||
    fixture?.model?.id !== 'arc-algzoo/m16-10-second-argmax' ||
    fixture?.model?.hiddenSize !== 16 ||
    fixture?.model?.sequenceLength !== SEQUENCE_LENGTH
  ) {
    errors.push({ code: 'fixture-does-not-match-preregistration' });
  }
  if (errors.length > 0) return { valid: false, errors };

  const schedule = createAlgZooPilotSchedule(configuration.orderSeed);
  const manifest = {
    schemaVersion: 1,
    status: 'prelaunch-not-launched',
    protocolVersion: schedule.protocolVersion,
    gitCommit: configuration.gitCommit,
    preregistration: {
      path: 'docs/interpretability/algzoo-preregistration.md',
      sha256: configuration.protocolSha256,
    },
    fixture: {
      path: configuration.fixturePath,
      sha256: configuration.fixtureSha256,
      sourceRevision: fixture.source.revision,
      checkpointSha256: fixture.source.checkpointSha256,
      modelId: fixture.model.id,
    },
    evaluator: {
      implementationSha256: configuration.targetEvaluatorSha256,
      model: configuration.evaluatorModel,
      tokenizerHash: configuration.tokenizerHash,
    },
    investigatorModel: configuration.investigatorModel,
    promptHashes: configuration.promptHashes,
    toolHashes: configuration.toolHashes,
    dependencyHashes: configuration.dependencyHashes,
    randomization: {
      prng: 'mulberry32-32bit-v1',
      normalTransform: 'box-muller-cos-sin-pair-v1',
      orderSeedCommitment: configuration.orderSeedCommitment,
      inputSeedCommitments: configuration.inputSeedCommitments,
      heldOutSeedCommitments: configuration.heldOutSeedCommitments,
      perturbationSeedCommitments: configuration.perturbationSeedCommitments,
    },
    targetOrder: schedule.targetOrder,
    sessionOrder: schedule.pairs.map(pair => ({
      pairId: pair.pairId,
      unitIndex: pair.unitIndex,
      arms: pair.sessionOrder,
    })),
    budgets: PILOT_BUDGET,
    mapSchemaHash: configuration.mapSchemaHash,
    commonBackgroundHash: configuration.commonBackgroundHash,
    accessControlConfiguration: configuration.accessControlConfiguration,
    launchReady:
      configuration.accessControlConfiguration.controlCanaryDenied === true &&
      configuration.accessControlConfiguration.futureCanaryDenied === true,
  };
  const planPairs = schedule.pairs.map(pair => ({
    ...pair,
    fixtureSha256: configuration.fixtureSha256,
    sessions: {
      control: addSessionMetadata(
        pair.sessions.control,
        configuration,
        pair.pairOrder
      ),
      treatment: addSessionMetadata(
        pair.sessions.treatment,
        configuration,
        pair.pairOrder
      ),
    },
  }));
  const planSchedule = { ...schedule, pairs: planPairs };
  return {
    valid: true,
    schedule: planSchedule,
    manifest,
    json: JSON.stringify(sortObjectKeys(manifest), null, 2),
  };
}

/**
 * Filter one treatment map snapshot to completed, strictly earlier findings.
 * @param {{arm: string, pairOrder: number}} session Target session boundary.
 * @param {Array<Record<string, any>>} mapEntries Candidate treatment map records.
 * @returns {{entries: Array<Record<string, any>>, accessLog: Array<Record<string, string|number>>}} Sanitized map entries and denied retrieval log.
 */
export function getAlgZooPilotMapContext(session, mapEntries) {
  if (!session || !Array.isArray(mapEntries)) {
    throw new TypeError('A pilot session and map-entry array are required.');
  }
  const entries = [];
  const accessLog = [];
  for (const entry of mapEntries) {
    const entryId = entry.id ?? 'unknown-entry';
    const isEarlierCompletedTreatment =
      session.arm === 'treatment' &&
      entry.arm === 'treatment' &&
      entry.completed === true &&
      Number.isInteger(entry.pairOrder) &&
      entry.pairOrder < session.pairOrder;
    if (isEarlierCompletedTreatment) {
      entries.push(sanitizeTreatmentMapEntry(entry));
      accessLog.push({ entryId, outcome: 'returned' });
    } else {
      accessLog.push({
        entryId,
        outcome: 'denied',
        reason: session.arm !== 'treatment' ? 'control-isolated' : 'not-prior',
      });
    }
  }
  entries.sort(
    (left, right) =>
      left.pairOrder - right.pairOrder || left.id.localeCompare(right.id)
  );
  return { entries, accessLog };
}

/**
 * Create a blinded scorer input without arm, ordering, investigator, map, or cost data.
 * @param {Record<string, any>} sessionRecord Completed investigator session.
 * @returns {Record<string, any>} Blinded interpretation submission.
 */
export function createAlgZooBlindedSubmission(sessionRecord) {
  const submission = sessionRecord.submission ?? {};
  return {
    targetUnit: sessionRecord.unitIndex,
    ...(sessionRecord.attemptStatus
      ? { attemptStatus: sessionRecord.attemptStatus }
      : {}),
    hypothesis: submission.hypothesis,
    restrictedRule: submission.restrictedRule,
    predictions: submission.predictions,
    causalEvidence: submission.causalEvidence,
    causalInterventionResult: submission.causalInterventionResult,
    evidence: submission.evidence,
  };
}

/**
 * @typedef {object} AlgZooPilotDeadline Deadline adapter for one session.
 * @property {{aborted: boolean}} signal Abort signal passed to external providers.
 * @property {Promise<unknown>} expired Promise that resolves at the hard deadline.
 * @property {() => number} elapsedMillis Current elapsed session time.
 * @property {() => void} abort Stop the active provider request.
 * @property {() => void} cancel Release deadline resources after the session.
 */

/**
 * @typedef {object} AlgZooPilotRunnerAdapters Injected pilot dependencies.
 * @property {(request: Record<string, any>) => Promise<Record<string, any>>} runInvestigator Research session adapter.
 * @property {(request: Record<string, any>) => Promise<Array<Record<string, any>>>} scoreBlindedSubmissions Blinded evaluator.
 * @property {(entries: Array<Record<string, any>>) => string|Promise<string>} hashMapSnapshot Snapshot hasher.
 * @property {(elapsedMillis: number) => AlgZooPilotDeadline} createDeadline Per-session deadline adapter.
 */

/**
 * Create the pilot runner around injected investigator and blinded-score adapters.
 * @param {AlgZooPilotRunnerAdapters} adapters Investigator adapters must reserve usage before external work and honor the abort signal.
 * @returns {{runTargetPair: (pair: Record<string, any>, mapEntries: Array<Record<string, any>>, heldOutEvaluationData: unknown) => Promise<Record<string, any>>}} Pair runner that never passes held-out values to investigators.
 */
export function createAlgZooPilotRunner(adapters) {
  if (
    typeof adapters?.runInvestigator !== 'function' ||
    typeof adapters?.scoreBlindedSubmissions !== 'function' ||
    typeof adapters?.hashMapSnapshot !== 'function' ||
    typeof adapters?.createDeadline !== 'function'
  ) {
    throw new TypeError(
      'Pilot adapters must supply investigator, scorer, snapshot hasher, and deadline factory.'
    );
  }
  return Object.freeze({
    async runTargetPair(pair, mapEntries, heldOutEvaluationData) {
      const sessionRecords = [];
      for (const arm of pair.sessionOrder) {
        const session = pair.sessions[arm];
        const retrieval = getAlgZooPilotMapContext(session, mapEntries);
        const mapSnapshotHash = await adapters.hashMapSnapshot(
          retrieval.entries
        );
        const deadline = adapters.createDeadline(session.budget.elapsedMillis);
        if (
          !deadline ||
          typeof deadline.signal?.aborted !== 'boolean' ||
          typeof deadline.expired?.then !== 'function' ||
          typeof deadline.elapsedMillis !== 'function' ||
          typeof deadline.abort !== 'function' ||
          typeof deadline.cancel !== 'function'
        ) {
          throw new TypeError(
            'Pilot deadline adapter returned an invalid deadline.'
          );
        }
        const budget = createPilotSessionBudget(session.budget, deadline);
        /** @type {Record<string, any>} */
        let execution;
        try {
          const expired = Promise.resolve(deadline.expired).then(() => {
            throw createPilotBudgetError('elapsedMillis');
          });
          const investigator = adapters.runInvestigator({
            session,
            mapEntries: retrieval.entries,
            fixtureSha256: pair.fixtureSha256,
            budget: budget.api,
            signal: deadline.signal,
          });
          execution = await Promise.race([expired, investigator]);
          budget.assertSettled();
          assertInvestigatorCostWasMetered(execution.cost, budget.snapshot());
          execution = {
            ...execution,
            cost: { ...execution.cost, ...budget.snapshot() },
          };
        } catch (error) {
          if (error?.code !== 'pilot-budget-exceeded') throw error;
          execution = {
            status: 'budget-stopped',
            failureCode: error.field,
            submission: { causalEvidence: 'not tested' },
            cost: budget.snapshot(),
          };
        } finally {
          deadline.cancel();
        }
        sessionRecords.push(
          createAlgZooPilotSessionRecord(
            session,
            retrieval,
            execution,
            mapSnapshotHash
          )
        );
      }
      const blindedSubmissions = sessionRecords.map(
        createAlgZooBlindedSubmission
      );
      const blindedScores = await adapters.scoreBlindedSubmissions({
        submissions: blindedSubmissions,
        heldOutEvaluationData,
      });
      return {
        pairId: pair.pairId,
        sessionRecords,
        blindedSubmissions,
        blindedScores,
      };
    },
  });
}

/**
 * Create the stable error returned for an invalid or unmatched variant.
 * @param {number} index Invalid variant position.
 * @returns {{valid: false, errors: Array<{code: string, index: number}>}} Validation error.
 */
function invalidAccuracyVariant(index) {
  return {
    valid: false,
    errors: [{ code: 'invalid-or-unmatched-accuracy-variant', index }],
  };
}

/**
 * Compare mechanistic accuracy estimates with a matched-compute sampling baseline.
 * @param {Array<Record<string, any>>} variants Held-out reference and paired estimates.
 * @returns {{valid: true, variantCount: number, mechanisticMse: number, samplingMse: number}|{valid: false, errors: Array<{code: string, index?: number}>}} MSE comparison or stable validation errors.
 */
export function compareAlgZooWholeModelAccuracy(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { valid: false, errors: [{ code: 'missing-accuracy-variants' }] };
  }
  const invalidIndex = variants.findIndex(
    variant =>
      !(
        Number.isFinite(variant?.referenceAccuracy) &&
        Number.isFinite(variant?.mechanisticEstimate) &&
        Number.isFinite(variant?.samplingEstimate) &&
        Number.isFinite(variant?.mechanisticCompute) &&
        variant.mechanisticCompute > 0 &&
        variant.mechanisticCompute === variant.samplingCompute
      )
  );
  if (invalidIndex >= 0) return invalidAccuracyVariant(invalidIndex);
  const mechanisticSquaredError = variants.map(variant =>
    square(variant.mechanisticEstimate - variant.referenceAccuracy)
  );
  const samplingSquaredError = variants.map(variant =>
    square(variant.samplingEstimate - variant.referenceAccuracy)
  );
  return {
    valid: true,
    variantCount: variants.length,
    mechanisticMse: mean(mechanisticSquaredError),
    samplingMse: mean(samplingSquaredError),
  };
}

/**
 * Validate preregistered held-out measurements and produce a versioned MSE report.
 * @param {{heldOutSplitId: string, sampleCountPerVariant: number, samplingBaseline: {method: {repository: string, revision: string, path: string}, seedCommitment: string}, variants: Array<{variantId: string, heldOutSplitId: string, noiseScale: number, referenceAccuracy: number, mechanisticEstimate: number, samplingEstimate: number, mechanisticCompute: number, samplingCompute: number}>}} evaluation Whole-model variant measurements and provenance.
 * @returns {{valid: true, report: Record<string, any>}|{valid: false, errors: Array<Record<string, string|number>>}} Stable comparison report or validation errors.
 */
export function evaluateAlgZooWholeModelAccuracyV1(evaluation) {
  if (
    !evaluation ||
    typeof evaluation !== 'object' ||
    Array.isArray(evaluation)
  ) {
    return { valid: false, errors: [{ code: 'invalid-accuracy-evaluation' }] };
  }
  if (evaluation.sampleCountPerVariant !== WHOLE_MODEL_SAMPLE_COUNT) {
    return {
      valid: false,
      errors: [{ code: 'invalid-held-out-sample-count' }],
    };
  }
  if (
    typeof evaluation.heldOutSplitId !== 'string' ||
    evaluation.heldOutSplitId.trim() === '' ||
    !Array.isArray(evaluation.variants) ||
    evaluation.variants.length !== WHOLE_MODEL_VARIANT_COUNT
  ) {
    return {
      valid: false,
      errors: [{ code: 'invalid-accuracy-variant-count' }],
    };
  }
  const baseline = evaluation.samplingBaseline;
  if (
    !baseline ||
    typeof baseline !== 'object' ||
    typeof baseline.method?.repository !== 'string' ||
    !baseline.method.repository.startsWith('https://') ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(baseline.method.revision ?? '') ||
    typeof baseline.method.path !== 'string' ||
    baseline.method.path.trim() === '' ||
    !SHA256_PATTERN.test(baseline.seedCommitment ?? '')
  ) {
    return { valid: false, errors: [{ code: 'invalid-sampling-baseline' }] };
  }

  const variantIds = evaluation.variants.map(variant => variant?.variantId);
  if (
    variantIds.some(id => typeof id !== 'string' || id.trim() === '') ||
    new Set(variantIds).size !== variantIds.length
  ) {
    return { valid: false, errors: [{ code: 'invalid-accuracy-variant-ids' }] };
  }
  const overall = compareAlgZooWholeModelAccuracy(evaluation.variants);
  if (!overall.valid) return overall;

  const invalidVariantIndex = evaluation.variants.findIndex(
    variant =>
      !(
        variant.heldOutSplitId === evaluation.heldOutSplitId &&
        WHOLE_MODEL_NOISE_SCALES.includes(variant.noiseScale) &&
        variant.referenceAccuracy >= 0 &&
        variant.referenceAccuracy <= 1 &&
        variant.mechanisticEstimate >= 0 &&
        variant.mechanisticEstimate <= 1 &&
        variant.samplingEstimate >= 0 &&
        variant.samplingEstimate <= 1
      )
  );
  if (invalidVariantIndex >= 0) {
    return invalidAccuracyVariant(invalidVariantIndex);
  }

  const scaleCounts = new Map(
    WHOLE_MODEL_NOISE_SCALES.map(noiseScale => [noiseScale, 0])
  );
  for (const variant of evaluation.variants) {
    const scaleCount = scaleCounts.get(variant.noiseScale);
    scaleCounts.set(variant.noiseScale, /** @type {number} */ (scaleCount) + 1);
  }
  if (
    WHOLE_MODEL_NOISE_SCALES.some(
      noiseScale => scaleCounts.get(noiseScale) !== 8
    )
  ) {
    return {
      valid: false,
      errors: [{ code: 'invalid-perturbation-scale-coverage' }],
    };
  }

  const byNoiseScale = WHOLE_MODEL_NOISE_SCALES.map(noiseScale => {
    const variants = evaluation.variants.filter(
      variant => variant.noiseScale === noiseScale
    );
    const comparison =
      /** @type {Extract<ReturnType<typeof compareAlgZooWholeModelAccuracy>, {valid: true}>} */ (
        compareAlgZooWholeModelAccuracy(variants)
      );
    return {
      noiseScale,
      variantCount: variants.length,
      mechanisticMse: comparison.mechanisticMse,
      samplingMse: comparison.samplingMse,
    };
  });
  const referenceAccuracies = evaluation.variants.map(
    variant => variant.referenceAccuracy
  );
  const minimumReferenceAccuracy = Math.min(...referenceAccuracies);
  const maximumReferenceAccuracy = Math.max(...referenceAccuracies);
  const referenceAccuracySpread =
    maximumReferenceAccuracy - minimumReferenceAccuracy;

  return {
    valid: true,
    report: {
      schemaVersion: 1,
      protocolVersion: '1.0.0',
      heldOutSplitId: evaluation.heldOutSplitId,
      sampleCountPerVariant: WHOLE_MODEL_SAMPLE_COUNT,
      variantCount: WHOLE_MODEL_VARIANT_COUNT,
      samplingBaseline: {
        method: { ...baseline.method },
        seedCommitment: baseline.seedCommitment,
      },
      variants: [...evaluation.variants]
        .sort(
          (left, right) =>
            left.noiseScale - right.noiseScale ||
            left.variantId.localeCompare(right.variantId)
        )
        .map(variant => ({ ...variant })),
      overall: {
        mechanisticMse: overall.mechanisticMse,
        samplingMse: overall.samplingMse,
      },
      byNoiseScale,
      referenceAccuracyRange: {
        minimum: minimumReferenceAccuracy,
        maximum: maximumReferenceAccuracy,
        spread: referenceAccuracySpread,
      },
      materialVariationMet: referenceAccuracySpread >= 0.05,
    },
  };
}

/**
 * Create one target's stable control or treatment session descriptor.
 * @param {string} pairId Paired target identity.
 * @param {number} pairOrder Sequential preregistered pair order.
 * @param {number} unitIndex Recurrent unit index.
 * @param {'control'|'treatment'} arm Experiment arm.
 * @returns {Record<string, any>} Session plan with frozen resource caps.
 */
function createSessionPlan(pairId, pairOrder, unitIndex, arm) {
  return {
    sessionId: `${pairId}-unit-${unitIndex}-${arm}`,
    pairId,
    pairOrder,
    unitIndex,
    arm,
    budget: PILOT_BUDGET,
  };
}

/**
 * Add immutable model, prompt, tool, and map references to a session plan.
 * @param {Record<string, any>} session Base target session.
 * @param {Record<string, any>} configuration Frozen plan metadata.
 * @param {number} pairOrder Sequential pair order.
 * @returns {Record<string, any>} Fully attributable session plan.
 */
function addSessionMetadata(session, configuration, pairOrder) {
  return {
    ...session,
    investigatorModel: configuration.investigatorModel,
    tokenizerHash: configuration.tokenizerHash,
    promptHashes: configuration.promptHashes,
    toolHashes: configuration.toolHashes,
    commonBackgroundHash: configuration.commonBackgroundHash,
    mapSnapshotHash: configuration.treatmentSnapshotHashes?.[pairOrder] ?? null,
  };
}

/**
 * Preserve only the map fields approved for prior-treatment retrieval.
 * @param {Record<string, any>} entry Candidate treatment finding.
 * @returns {Record<string, any>} Sanitized shared-map finding.
 */
function sanitizeTreatmentMapEntry(entry) {
  return {
    id: entry.id,
    pairOrder: entry.pairOrder,
    targetUnit: entry.targetUnit,
    claim: entry.claim,
    evidence: entry.evidence,
    status: entry.status,
    provenance: entry.provenance,
    lineage: entry.lineage,
  };
}

/**
 * Record one investigator call, retrieval receipt, and all bounded resource costs.
 * @param {Record<string, any>} session Planned session.
 * @param {{entries: Array<Record<string, any>>, accessLog: Array<Record<string, string|number>>}} retrieval Allowed map context.
 * @param {Record<string, any>} execution Investigator output and measured costs.
 * @param {string} mapSnapshotHash Hash of the exact sanitized map snapshot.
 * @returns {Record<string, any>} Attributed immutable run record.
 */
function createAlgZooPilotSessionRecord(
  session,
  retrieval,
  execution,
  mapSnapshotHash
) {
  const measuredCost = execution.cost;
  const cost = {
    investigatorTokens: measuredCost.investigatorTokens,
    elapsedMillis: measuredCost.elapsedMillis,
    toolCalls: measuredCost.toolCalls,
    targetForwardPasses: measuredCost.targetForwardPasses,
    monetaryCostUsd: measuredCost.monetaryCostUsd ?? null,
  };
  const exceededBudgetLimits = [];
  if (cost.investigatorTokens > session.budget.investigatorTokens) {
    exceededBudgetLimits.push('investigatorTokens');
  }
  if (cost.elapsedMillis > session.budget.elapsedMillis) {
    exceededBudgetLimits.push('elapsedMillis');
  }
  if (cost.toolCalls > session.budget.toolCalls) {
    exceededBudgetLimits.push('toolCalls');
  }
  if (cost.targetForwardPasses > session.budget.targetForwardPasses) {
    exceededBudgetLimits.push('targetForwardPasses');
  }
  return {
    ...session,
    attemptStatus: execution.status ?? 'submitted',
    ...(execution.failureCode ? { failureCode: execution.failureCode } : {}),
    submission: execution.submission,
    cost,
    exceededBudgetLimits,
    retrievedMapEntryIds: retrieval.entries.map(entry => entry.id),
    mapSnapshot: retrieval.entries,
    mapSnapshotHash,
    retrievalAccessLog: retrieval.accessLog,
  };
}

/**
 * Create a per-session reservation ledger that adapters consult before work.
 * @param {Record<string, number>} limits Frozen preregistered session limits.
 * @param {{signal: {aborted: boolean}, elapsedMillis: () => number, abort: () => void}} deadline Enforced session deadline.
 * @returns {{api: Record<string, Function>, snapshot: () => Record<string, number>, assertSettled: () => void}} Metered usage interface and final cost snapshot.
 */
function createPilotSessionBudget(limits, deadline) {
  const used = Object.fromEntries(
    METERED_BUDGET_FIELDS.map(field => [field, 0])
  );
  const reserved = Object.fromEntries(
    METERED_BUDGET_FIELDS.map(field => [field, 0])
  );
  const snapshot = () => ({
    investigatorTokens: used.investigatorTokens,
    elapsedMillis: Number.isFinite(deadline.elapsedMillis())
      ? Math.max(0, deadline.elapsedMillis())
      : 0,
    toolCalls: used.toolCalls,
    targetForwardPasses: used.targetForwardPasses,
  });
  /**
   * Abort the session after reaching a hard budget boundary.
   * @param {string} field Budget field that stopped the session.
   * @returns {never} Always throws the stable budget error.
   */
  const stop = field => {
    deadline.abort();
    throw createPilotBudgetError(field);
  };
  const assertWithinDeadline = () => {
    const elapsedMillis = deadline.elapsedMillis();
    if (
      deadline.signal.aborted ||
      !Number.isFinite(elapsedMillis) ||
      elapsedMillis >= limits.elapsedMillis
    ) {
      stop('elapsedMillis');
    }
  };
  /**
   * Reserve usage before starting an external provider action.
   * @param {Record<string, number>} [requested] Maximum usage for the action.
   * @returns {{complete: (actual?: Record<string, number>) => void, cancel: () => void}} Reservation settlement handle.
   */
  const reserve = requested => {
    assertWithinDeadline();
    const reservation = /** @type {Record<string, number>} */ ({});
    for (const field of METERED_BUDGET_FIELDS) {
      const amount = requested?.[field] ?? 0;
      if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new TypeError(
          `Pilot budget reservation ${field} must be a nonnegative integer.`
        );
      }
      if (used[field] + reserved[field] + amount > limits[field]) {
        stop(field);
      }
      reservation[field] = amount;
    }
    for (const field of METERED_BUDGET_FIELDS) {
      reserved[field] += reservation[field];
    }
    let settled = false;
    /**
     * Release the reservation exactly once.
     * @returns {void}
     */
    const release = () => {
      if (settled) {
        throw new TypeError('Pilot budget reservation is already settled.');
      }
      settled = true;
      for (const field of METERED_BUDGET_FIELDS) {
        reserved[field] -= reservation[field];
      }
    };
    return Object.freeze({
      /**
       * Settle a completed provider action with its measured usage.
       * @param {Record<string, number>} [actual] Measured usage for the action.
       * @returns {void}
       */
      complete(actual = {}) {
        assertWithinDeadline();
        for (const field of METERED_BUDGET_FIELDS) {
          const amount = actual[field] ?? 0;
          if (!Number.isSafeInteger(amount) || amount < 0) {
            throw new TypeError(
              `Pilot budget usage ${field} must be a nonnegative integer.`
            );
          }
        }
        release();
        for (const field of METERED_BUDGET_FIELDS) {
          used[field] += actual[field] ?? 0;
          if (
            used[field] > limits[field] ||
            actual[field] > reservation[field]
          ) {
            stop(field);
          }
        }
      },
      cancel() {
        release();
      },
    });
  };
  return {
    api: Object.freeze({ reserve }),
    snapshot,
    assertSettled() {
      if (METERED_BUDGET_FIELDS.some(field => reserved[field] !== 0)) {
        stop('unsettled-reservation');
      }
    },
  };
}

/**
 * Create the stable error for a budget reservation or deadline stop.
 * @param {string} field Budget field that stopped the session.
 * @returns {Error & {code: string, field: string}} Budget stop error.
 */
function createPilotBudgetError(field) {
  const error = /** @type {Error & {code: string, field: string}} */ (
    new Error('Preregistered pilot session budget reached.')
  );
  error.code = 'pilot-budget-exceeded';
  error.field = field;
  return error;
}

/**
 * Reject provider usage reports that bypass the reservation ledger.
 * @param {Record<string, number>|undefined} reported Provider-reported usage.
 * @param {Record<string, number>} metered Usage settled through reservations.
 * @returns {void}
 */
function assertInvestigatorCostWasMetered(reported, metered) {
  for (const field of METERED_BUDGET_FIELDS) {
    if (reported?.[field] !== undefined && reported[field] !== metered[field]) {
      throw createPilotBudgetError(`unmetered-${field}`);
    }
  }
}

/**
 * Compute the arithmetic mean for a nonempty set of squared errors.
 * @param {Array<number>} values Squared error values.
 * @returns {number} Mean squared error.
 */
function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Square an error value.
 * @param {number} value Error value.
 * @returns {number} Squared value.
 */
function square(value) {
  return value * value;
}

/**
 * Create the versioned deterministic Mulberry32 random source.
 * @param {number} seed 32-bit seed.
 * @returns {() => number} Next value in [0, 1).
 */
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sort object keys recursively to make the prelaunch manifest byte-reproducible.
 * @param {unknown} value Value to normalize.
 * @returns {unknown} Value with object keys in lexical order.
 */
function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value === null || typeof value !== 'object') return value;
  const record = /** @type {Record<string, unknown>} */ (value);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, sortObjectKeys(record[key])])
  );
}
