import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import {
  compareAlgZooWholeModelAccuracy,
  createAlgZooBlindedSubmission,
  createAlgZooHeldOutSequences,
  createAlgZooNormalSequence,
  createAlgZooPilotPlan,
  createAlgZooPilotRunner,
  createAlgZooPilotSchedule,
  evaluateAlgZooWholeModelAccuracyV1,
  getAlgZooPilotMapContext,
} from '../../../src/core/interpretability/algZooPilotHarness/index.js';

const validateTestCausalInterventionResult = result => {
  if (result?.schemaVersion !== 1) return false;
  if (result.status === 'not-tested') {
    return (
      Object.keys(result).every(key =>
        ['schemaVersion', 'status', 'reason'].includes(key)
      ) &&
      (result.reason === undefined || typeof result.reason === 'string')
    );
  }
  return (
    result.status === 'tested' &&
    Object.keys(result).sort().join(',') ===
      'artifactSha256,baselineOutputIndex,causalScore,inputSequenceSha256,intervenedOutputIndex,operation,predictedOutputIndex,schemaVersion,status,targetMechanismId,timeStepIndex' &&
    typeof result.targetMechanismId === 'string' &&
    result.targetMechanismId.length > 0 &&
    result.operation === 'set-activation-zero' &&
    Number.isInteger(result.timeStepIndex) &&
    result.timeStepIndex >= 0 &&
    result.timeStepIndex <= 9 &&
    /^[a-f0-9]{64}$/.test(result.inputSequenceSha256) &&
    [
      result.predictedOutputIndex,
      result.baselineOutputIndex,
      result.intervenedOutputIndex,
      result.causalScore,
    ].every(value => Number.isInteger(value) && value >= 0 && value <= 9) &&
    (result.causalScore === 0 || result.causalScore === 1) &&
    /^[a-f0-9]{64}$/.test(result.artifactSha256)
  );
};
const createTestAlgZooPilotRunner = adapters =>
  createAlgZooPilotRunner({
    validateCausalInterventionResult: validateTestCausalInterventionResult,
    appendAuditRecord: async () => {},
    ...adapters,
  });

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const preregistration = readFileSync(
  new URL(
    '../../../docs/interpretability/algzoo-preregistration.md',
    import.meta.url
  ),
  'utf8'
);
const preregisteredProtocolVersion = preregistration.match(
  /^\*\*Protocol version:\*\* (.+)$/m
)?.[1];
const sha256 = 'a'.repeat(64);
const configuration = {
  gitCommit: 'b'.repeat(40),
  protocolSha256: sha256,
  fixturePath: 'test/fixtures/interpretability/alg-zoo-m16-10.json',
  fixtureSha256: 'c'.repeat(64),
  targetEvaluatorSha256: 'd'.repeat(64),
  investigatorRuntime: {
    provider: 'codex-cli',
    cliVersion: 'codex-cli 0.139.0',
    requestedModelIdentifier: 'gpt-5.4-mini',
    reportedModelIdentifier: null,
    observedAt: '2026-10-24T10:00:00.000Z',
  },
  promptHashes: { system: '1'.repeat(64), task: '2'.repeat(64) },
  toolHashes: { interpreter: '3'.repeat(64) },
  dependencyHashes: { runtime: '4'.repeat(64) },
  orderSeed: 20261020,
  orderSeedCommitment: '5'.repeat(64),
  inputSeedCommitments: Array(16).fill('6'.repeat(64)),
  heldOutSeedCommitments: Array(16).fill('7'.repeat(64)),
  perturbationSeedCommitments: Array(32).fill('8'.repeat(64)),
  mapSchemaHash: '9'.repeat(64),
  commonBackgroundHash: 'f'.repeat(64),
  accessControlConfiguration: {
    controlCanaryDenied: true,
    futureCanaryDenied: true,
    canaryPromptLeakageCheckPassed: true,
    heldOutPromptLeakageCheckPassed: true,
    probeLogArtifact: 'synthetic://algzoo-access-probe-log-v1',
    probeLogSha256: '0'.repeat(64),
  },
};

/**
 * Assert both cross-arm and future-target canaries stay out of unauthorized requests.
 * @param {Record<string, any>} result Paired-runner result.
 * @param {Array<Record<string, any>>} investigatorCalls Captured adapter requests.
 * @returns {void} No value.
 */
function assertSyntheticCanaryIsolation(result, investigatorCalls) {
  const controlRequest = investigatorCalls.find(
    call => call.request.session.arm === 'control'
  ).request;
  const treatmentRequest = investigatorCalls.find(
    call => call.request.session.arm === 'treatment'
  ).request;
  expect(JSON.stringify(controlRequest)).not.toContain(
    'synthetic-treatment-only-canary-secret'
  );
  expect(JSON.stringify(treatmentRequest)).toContain(
    'synthetic-treatment-only-canary-secret'
  );
  expect(
    investigatorCalls.every(
      call =>
        !JSON.stringify(call.request).includes('synthetic-future-canary-secret')
    )
  ).toBe(true);
  expect(controlRequest.mapEntries).toEqual([]);
  expect(treatmentRequest.mapEntries.map(entry => entry.id)).toEqual([
    'earlier-map-entry',
    'treatment-only-canary',
  ]);
  const controlLog = result.sessionRecords.find(
    record => record.arm === 'control'
  ).retrievalAccessLog;
  const treatmentLog = result.sessionRecords.find(
    record => record.arm === 'treatment'
  ).retrievalAccessLog;
  expect(controlLog).toContainEqual({
    entryId: 'treatment-only-canary',
    outcome: 'denied',
    reason: 'control-isolated',
  });
  expect(treatmentLog).toContainEqual({
    entryId: 'treatment-only-canary',
    outcome: 'returned',
  });
  expect(controlLog).toContainEqual({
    entryId: 'future-treatment-canary',
    outcome: 'denied',
    reason: 'control-isolated',
  });
  expect(treatmentLog).toContainEqual({
    entryId: 'future-treatment-canary',
    outcome: 'denied',
    reason: 'not-prior',
  });
  expect(JSON.stringify(result.sessionRecords)).not.toContain(
    'synthetic-future-canary-secret'
  );
}

/**
 * Build deterministic synthetic measurements matching the frozen 32-variant design.
 * @param {number} [mechanisticEstimateOffset] Offset from reference accuracy.
 * @returns {Record<string, any>} Complete synthetic accuracy evaluation input.
 */
function syntheticWholeModelEvaluation(mechanisticEstimateOffset = -0.01) {
  const heldOutSplitId = 'algzoo-held-out-synthetic-v1';
  const variants = [];
  for (const noiseScale of [0.01, 0.05, 0.1, 0.2]) {
    for (let replicate = 0; replicate < 8; replicate += 1) {
      const referenceAccuracy = 0.96 - noiseScale * 0.5 - replicate * 0.001;
      variants.push({
        variantId: `noise-${noiseScale}-replicate-${replicate}`,
        heldOutSplitId,
        noiseScale,
        referenceAccuracy,
        mechanisticEstimate: referenceAccuracy + mechanisticEstimateOffset,
        samplingEstimate: referenceAccuracy - 0.05,
        mechanisticCompute: 100000,
        samplingCompute: 100000,
      });
    }
  }
  return {
    heldOutSplitId,
    sampleCountPerVariant: 100000,
    samplingBaseline: {
      method: {
        repository: 'https://github.com/example/monte-carlo-baseline',
        revision: 'a'.repeat(40),
        path: 'baseline/accuracy.js',
      },
      seedCommitment: 'b'.repeat(64),
    },
    variants,
  };
}

/**
 * Create controllable per-session deadlines for harness tests.
 * @returns {{deadlines: Array<Record<string, any>>, createDeadline: (limit: number) => Record<string, any>}} Deadline factory and its test handles.
 */
function createTestDeadlineFactory() {
  const deadlines = [];
  return {
    deadlines,
    createDeadline(limit) {
      const controller = new AbortController();
      let resolveExpired;
      let elapsed = 0;
      let cancelCount = 0;
      const deadline = {
        signal: controller.signal,
        expired: new Promise(resolve => {
          resolveExpired = resolve;
        }),
        elapsedMillis: () => elapsed,
        abort: () => controller.abort(),
        cancel: () => {
          cancelCount += 1;
        },
        setElapsed(value) {
          elapsed = value;
        },
        get cancelCount() {
          return cancelCount;
        },
        expire(value = limit) {
          elapsed = value;
          controller.abort();
          resolveExpired();
        },
      };
      deadlines.push(deadline);
      return deadline;
    },
  };
}

describe('AlgZoo shared-map pilot harness', () => {
  it('creates a deterministic census permutation and paired session order', () => {
    const first = createAlgZooPilotSchedule(721);
    const second = createAlgZooPilotSchedule(721);

    expect(first).toEqual(second);
    expect(first.targetOrder).toHaveLength(16);
    expect([...first.targetOrder].sort((left, right) => left - right)).toEqual(
      Array.from({ length: 16 }, (_, index) => index)
    );
    expect(first.pairs.map(pair => pair.sessionOrder)).toEqual(
      second.pairs.map(pair => pair.sessionOrder)
    );
    expect(first.pairs.every(pair => pair.sessionOrder.length === 2)).toBe(
      true
    );
    expect(first.protocolVersion).toBe(preregisteredProtocolVersion);
    expect(() => createAlgZooPilotSchedule(-1)).toThrow(RangeError);
  });

  it('replays committed standard-normal sequences and held-out sets', () => {
    expect(createAlgZooNormalSequence(91)).toEqual(
      createAlgZooNormalSequence(91)
    );
    expect(createAlgZooNormalSequence(91)).toHaveLength(10);
    expect(createAlgZooNormalSequence(91, 1)).toHaveLength(1);
    const heldOut = createAlgZooHeldOutSequences(91, 4);
    expect(heldOut).toEqual(createAlgZooHeldOutSequences(91, 4));
    expect(heldOut).toHaveLength(4);
    expect(heldOut.every(sequence => sequence.length === 10)).toBe(true);
    expect(createAlgZooHeldOutSequences(91)).toHaveLength(1024);
    expect(() => createAlgZooNormalSequence(-1)).toThrow(RangeError);
    expect(() => createAlgZooHeldOutSequences(1, -1)).toThrow(RangeError);
  });

  it('builds a reproducible prelaunch manifest and rejects incomplete pins', () => {
    const first = createAlgZooPilotPlan(configuration, fixture);
    const reorderedConfiguration = {
      ...Object.fromEntries(Object.entries(configuration).reverse()),
      promptHashes: { task: '2'.repeat(64), system: '1'.repeat(64) },
    };
    const second = createAlgZooPilotPlan(reorderedConfiguration, fixture);

    expect(first.valid).toBe(true);
    expect(first.json).toBe(second.json);
    expect(first.manifest.status).toBe('prelaunch-not-launched');
    expect(first.manifest.protocolVersion).toBe(preregisteredProtocolVersion);
    expect(first.schedule.protocolVersion).toBe(preregisteredProtocolVersion);
    expect(first.manifest.launchReady).toBe(true);
    expect(first.manifest.schemaVersion).toBe(2);
    expect(first.manifest.evaluator).toEqual({
      type: 'deterministic-local',
      implementationSha256: configuration.targetEvaluatorSha256,
    });
    expect(first.manifest).not.toHaveProperty('evaluator.model');
    expect(first.manifest).not.toHaveProperty('evaluator.tokenizerHash');
    expect(first.manifest).not.toHaveProperty('tokenizerHash');
    expect(
      first.schedule.pairs[0].sessions.control.investigatorRuntimeConfiguration
    ).toEqual(
      first.schedule.pairs[0].sessions.treatment
        .investigatorRuntimeConfiguration
    );
    expect(first.schedule.pairs).toHaveLength(16);
    expect(first.schedule.pairs[0].sessions.control.budget).toEqual({
      investigatorTokens: 20000,
      elapsedMillis: 1800000,
      toolCalls: 100,
      targetForwardPasses: 10000,
    });

    const invalid = createAlgZooPilotPlan(
      { ...configuration, fixtureSha256: 'not-a-sha256' },
      fixture
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContainEqual({ code: 'invalid-manifest-hash' });

    const invalidProtocolHash = createAlgZooPilotPlan(
      { ...configuration, protocolSha256: 'not-a-sha256' },
      fixture
    );
    expect(invalidProtocolHash.valid).toBe(false);
    expect(invalidProtocolHash.errors).toContainEqual({
      code: 'invalid-manifest-hash',
    });

    expect(createAlgZooPilotPlan({}, fixture).valid).toBe(false);
    for (const orderSeed of [-1, 0x100000000, 1.5]) {
      expect(
        createAlgZooPilotPlan({ ...configuration, orderSeed }, fixture).errors
      ).toContainEqual({ code: 'invalid-order-seed' });
    }
    for (const changes of [
      { inputSeedCommitments: [] },
      { heldOutSeedCommitments: [] },
      { perturbationSeedCommitments: [] },
    ]) {
      expect(
        createAlgZooPilotPlan({ ...configuration, ...changes }, fixture).errors
      ).toContainEqual({ code: 'invalid-seed-commitment-count' });
    }
    expect(
      createAlgZooPilotPlan(
        { ...configuration, gitCommit: 'not-a-commit' },
        fixture
      ).errors
    ).toContainEqual({ code: 'invalid-manifest-hash' });
    expect(
      createAlgZooPilotPlan(
        { ...configuration, fixturePath: 'wrong.json' },
        fixture
      ).errors
    ).toContainEqual({ code: 'fixture-path-does-not-match-preregistration' });
    const invalidRuntimeConfigurations = [
      null,
      { ...configuration.investigatorRuntime, provider: 'api' },
      { ...configuration.investigatorRuntime, cliVersion: '' },
      { ...configuration.investigatorRuntime, cliVersion: 7 },
      { ...configuration.investigatorRuntime, requestedModelIdentifier: '' },
      { ...configuration.investigatorRuntime, requestedModelIdentifier: 7 },
      { ...configuration.investigatorRuntime, observedAt: 'unknown' },
      { ...configuration.investigatorRuntime, observedAt: null },
      {
        ...configuration.investigatorRuntime,
        reportedModelIdentifier: 'gpt-5.4-mini',
      },
      {
        ...configuration.investigatorRuntime,
        reportedModelIdentifier: undefined,
      },
    ];
    for (const changes of [
      { inputSeedCommitments: [] },
      { promptHashes: {} },
    ]) {
      expect(
        createAlgZooPilotPlan({ ...configuration, ...changes }, fixture).valid
      ).toBe(false);
    }
    for (const investigatorRuntime of invalidRuntimeConfigurations) {
      expect(
        createAlgZooPilotPlan(
          { ...configuration, investigatorRuntime },
          fixture
        ).errors
      ).toContainEqual({ code: 'invalid-investigator-runtime' });
    }
    for (const [root, key, value] of [
      ['source', 'revision', 'wrong-revision'],
      ['source', 'checkpointSha256', 'wrong-checkpoint'],
      ['model', 'id', 'wrong-model'],
      ['model', 'architecture', 'wrong-architecture'],
      ['model', 'activation', 'tanh'],
      ['model', 'hiddenSize', 15],
      ['model', 'sequenceLength', 9],
      ['model', 'outputSize', 9],
      ['model', 'bias', true],
    ]) {
      const changedFixture = {
        ...fixture,
        [root]: { ...fixture[root], [key]: value },
      };
      expect(
        createAlgZooPilotPlan(configuration, changedFixture).errors
      ).toContainEqual({ code: 'fixture-does-not-match-preregistration' });
    }
    const invalidParameterSets = [
      null,
      { ...fixture.parameters, extra: { shape: [1], values: [1] } },
      { ...fixture.parameters, inputToHidden: null },
      {
        ...fixture.parameters,
        inputToHidden: {
          shape: [],
          values: fixture.parameters.inputToHidden.values,
        },
      },
      {
        ...fixture.parameters,
        inputToHidden: {
          shape: [15, 1],
          values: fixture.parameters.inputToHidden.values,
        },
      },
      {
        ...fixture.parameters,
        inputToHidden: { shape: [16, 1] },
      },
      {
        ...fixture.parameters,
        inputToHidden: { shape: [16, 1], values: [] },
      },
      {
        ...fixture.parameters,
        inputToHidden: {
          shape: [16, 1],
          values: fixture.parameters.inputToHidden.values.map(() => Infinity),
        },
      },
    ];
    for (const parameters of invalidParameterSets) {
      expect(
        createAlgZooPilotPlan(configuration, { ...fixture, parameters }).errors
      ).toContainEqual({ code: 'fixture-does-not-match-preregistration' });
    }

    const mappedSnapshotPlan = createAlgZooPilotPlan(
      { ...configuration, treatmentSnapshotHashes: Array(16).fill(sha256) },
      fixture
    );
    expect(
      mappedSnapshotPlan.schedule.pairs[0].sessions.treatment.mapSnapshotHash
    ).toBe(sha256);
  });

  it('keeps launch readiness false until every access probe has hashed evidence', () => {
    const incompleteEvidence = [
      { controlCanaryDenied: false },
      { futureCanaryDenied: false },
      { canaryPromptLeakageCheckPassed: false },
      { heldOutPromptLeakageCheckPassed: false },
      { probeLogArtifact: '' },
      { probeLogArtifact: null },
      { probeLogSha256: 'not-a-sha256' },
    ];

    for (const change of incompleteEvidence) {
      const accessControlConfiguration = {
        ...configuration.accessControlConfiguration,
        ...change,
      };
      const plan = createAlgZooPilotPlan(
        { ...configuration, accessControlConfiguration },
        fixture
      );

      expect(plan.valid).toBe(true);
      expect(plan.manifest.status).toBe('prelaunch-not-launched');
      expect(plan.manifest.launchReady).toBe(false);
    }

    const malformedEvidencePlan = createAlgZooPilotPlan(
      { ...configuration, accessControlConfiguration: ['not-a-record'] },
      fixture
    );
    expect(malformedEvidencePlan.valid).toBe(true);
    expect(malformedEvidencePlan.manifest.launchReady).toBe(false);

    const readyPlan = createAlgZooPilotPlan(configuration, fixture);
    expect(readyPlan.manifest.launchReady).toBe(true);
  });

  it('isolates control and returns only completed earlier treatment findings', () => {
    const mapEntries = [
      {
        id: 'prior-treatment',
        arm: 'treatment',
        pairOrder: 0,
        completed: true,
        targetUnit: 3,
        claim: 'Earlier claim',
        evidence: ['trace'],
        status: 'validated',
        provenance: { source: 'pilot' },
        lineage: ['root'],
        heldOutSequences: ['must stay private'],
      },
      {
        id: 'future-treatment',
        arm: 'treatment',
        pairOrder: 3,
        completed: true,
        claim: 'Future claim',
      },
      {
        id: 'control-finding',
        arm: 'control',
        pairOrder: 0,
        completed: true,
        claim: 'Control claim',
      },
      {
        id: 'unfinished-treatment',
        arm: 'treatment',
        pairOrder: 0,
        completed: false,
        claim: 'Unfinished claim',
      },
      {
        arm: 'treatment',
        completed: true,
        claim: 'Malformed ordering claim',
      },
      {
        id: 'same-order-b',
        arm: 'treatment',
        pairOrder: 1,
        completed: true,
        claim: 'Second same-order claim',
      },
      {
        id: 'same-order-a',
        arm: 'treatment',
        pairOrder: 1,
        completed: true,
        claim: 'First same-order claim',
      },
    ];
    const control = getAlgZooPilotMapContext(
      { arm: 'control', pairOrder: 2 },
      mapEntries
    );
    const treatment = getAlgZooPilotMapContext(
      { arm: 'treatment', pairOrder: 2 },
      mapEntries
    );

    expect(control.entries).toEqual([]);
    expect(control.accessLog.every(item => item.outcome === 'denied')).toBe(
      true
    );
    expect(treatment.entries).toHaveLength(3);
    expect(treatment.entries[0]).not.toHaveProperty('heldOutSequences');
    expect(treatment.entries[0].id).toBe('prior-treatment');
    expect(treatment.entries.slice(1).map(entry => entry.id)).toEqual([
      'same-order-a',
      'same-order-b',
    ]);
    expect(treatment.accessLog).toContainEqual({
      entryId: 'future-treatment',
      outcome: 'denied',
      reason: 'not-prior',
    });
    expect(() => getAlgZooPilotMapContext(null, mapEntries)).toThrow(TypeError);
    expect(() => getAlgZooPilotMapContext({ arm: 'control' }, null)).toThrow(
      TypeError
    );
  });
});

describe('AlgZoo pilot runner', () => {
  it('keeps held-out values out of investigators and strips arm metadata before scoring', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = plan.schedule.pairs[1];
    const heldOut = [{ secret: 'held-out-only' }];
    const calls = [];
    const scoreResults = [
      { normalizedRmse: 0.08, perStepMaximum: 0.2 },
      { normalizedRmse: 0.14, perStepMaximum: 0.31 },
    ];
    const deadlineFactory = createTestDeadlineFactory();
    const runner = createTestAlgZooPilotRunner({
      createDeadline: deadlineFactory.createDeadline,
      hashMapSnapshot: async entries => `hash-${entries.length}`,
      runInvestigator: async request => {
        calls.push({ type: 'investigator', request });
        if (request.session.arm === 'treatment') {
          request.budget.reserve({ investigatorTokens: 20001 });
        }
        const reservation = request.budget.reserve({ investigatorTokens: 12 });
        reservation.complete({ investigatorTokens: 12 });
        return {
          submissionId: `private-${request.session.arm}`,
          submission: {
            hypothesis: 'A reproducible hypothesis',
            restrictedRule: { operation: 'relu' },
            predictions: [{ input: 'x', output: 'y' }],
            causalEvidence: 'not tested',
            causalInterventionResult: {
              schemaVersion: 1,
              status: 'not-tested',
            },
            backgroundClaimIds: ['map-entry-private'],
            evidence: [{ observation: 'controlled' }],
          },
          cost: { investigatorTokens: 12 },
          investigatorRuntime: {
            provider: 'codex-cli',
            cliVersion: 'codex-cli test-version',
            requestedModelIdentifier: 'test-model',
            reportedModelIdentifier: null,
            modelIdentifierStatus: 'not-reported-by-cli-jsonl',
            startedAt: '2026-10-24T10:00:00.000Z',
            completedAt: '2026-10-24T10:00:01.000Z',
            inputTokens: 8,
            outputTokens: 4,
            toolCalls: 0,
          },
        };
      },
      scoreBlindedSubmissions: async request => {
        calls.push({ type: 'scorer', request });
        return scoreResults;
      },
    });
    const earlierMap = [
      {
        id: 'earlier-map-entry',
        arm: 'treatment',
        pairOrder: 0,
        completed: true,
        targetUnit: 4,
        claim: 'prior',
        evidence: ['evidence'],
        status: 'uncertain',
      },
      {
        id: 'treatment-only-canary',
        arm: 'treatment',
        pairOrder: 0,
        completed: true,
        targetUnit: 6,
        claim: 'synthetic-treatment-only-canary-secret',
        evidence: ['synthetic-prior-evidence'],
        status: 'validated',
      },
      {
        id: 'future-treatment-canary',
        arm: 'treatment',
        pairOrder: 15,
        completed: true,
        targetUnit: 12,
        claim: 'synthetic-future-canary-secret',
        evidence: ['synthetic-private-evidence'],
        status: 'validated',
      },
    ];

    const result = await runner.runTargetPair(pair, earlierMap, heldOut);
    const investigatorCalls = calls.filter(
      call => call.type === 'investigator'
    );
    const scorerCall = calls.at(-1);

    expect(investigatorCalls).toHaveLength(2);
    expect(calls.map(call => call.type)).toEqual([
      'investigator',
      'investigator',
      'scorer',
    ]);
    expect(
      investigatorCalls.every(
        call => !JSON.stringify(call.request).includes('held-out-only')
      )
    ).toBe(true);
    expect(scorerCall.request.heldOutEvaluationData).toBe(heldOut);
    expect(scorerCall.request.submissions).toHaveLength(2);
    expect(result.blindedScores).toBe(scoreResults);
    for (const submission of scorerCall.request.submissions) {
      expect(submission).not.toHaveProperty('arm');
      expect(submission).not.toHaveProperty('pairOrder');
      expect(submission).not.toHaveProperty('submissionId');
      expect(submission).not.toHaveProperty('backgroundClaimIds');
      expect(submission).not.toHaveProperty('mapSnapshotHash');
    }
    expect(result.sessionRecords).toHaveLength(2);
    expect(result.sessionRecords[0].investigatorRuntime).toEqual(
      expect.objectContaining({
        provider: 'codex-cli',
        cliVersion: 'codex-cli test-version',
        requestedModelIdentifier: 'test-model',
        inputTokens: 8,
        outputTokens: 4,
      })
    );
    assertSyntheticCanaryIsolation(result, investigatorCalls);
    expect(
      result.sessionRecords.map(record => record.submission.causalEvidence)
    ).toEqual(['not tested', 'not tested']);
    expect(
      result.sessionRecords.find(record => record.arm === 'control').submission
        .hypothesis
    ).toBe('A reproducible hypothesis');
    expect(
      result.sessionRecords.every(
        record => !('blindedScores' in record.submission)
      )
    ).toBe(true);
    expect(result.sessionRecords.every(record => record.mapSnapshotHash)).toBe(
      true
    );
    expect(
      result.sessionRecords.find(record => record.arm === 'treatment')
    ).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'investigatorTokens',
      cost: { investigatorTokens: 0 },
    });
    expect(
      result.sessionRecords.find(record => record.arm === 'control').cost
    ).toMatchObject({
      investigatorTokens: 12,
      elapsedMillis: 0,
      toolCalls: 0,
      targetForwardPasses: 0,
      monetaryCostUsd: null,
    });
    expect(
      result.sessionRecords.find(record => record.arm === 'control')
        .exceededBudgetLimits
    ).toEqual([]);
    expect(() => createAlgZooPilotRunner({})).toThrow(TypeError);
    expect(() =>
      createTestAlgZooPilotRunner({
        createDeadline: createTestDeadlineFactory().createDeadline,
        hashMapSnapshot: async () => 'missing-audit-map-hash',
        runInvestigator: async () => ({}),
        scoreBlindedSubmissions: async () => [],
        appendAuditRecord: undefined,
      })
    ).toThrow(/audit writer/);

    const noCostRunner = createTestAlgZooPilotRunner({
      createDeadline: createTestDeadlineFactory().createDeadline,
      hashMapSnapshot: async () => 'empty-map-hash',
      runInvestigator: async request => {
        request.budget.reserve({ investigatorTokens: 2 }).cancel();
        request.budget.reserve().complete();
        return {
          submission: {
            causalInterventionResult: {
              schemaVersion: 1,
              status: 'not-tested',
            },
          },
        };
      },
      scoreBlindedSubmissions: async () => [],
    });
    const noCostResult = await noCostRunner.runTargetPair(
      plan.schedule.pairs[0],
      [],
      []
    );
    expect(noCostResult.sessionRecords[0].cost).toMatchObject({
      investigatorTokens: 0,
      elapsedMillis: 0,
      toolCalls: 0,
      targetForwardPasses: 0,
      monetaryCostUsd: null,
    });
  });

  it.each([
    {
      outcome: 'submitted',
      expectedStatus: 'submitted',
      terminalEvent: 'session-finished',
    },
    {
      outcome: 'failed',
      expectedStatus: 'failed',
      terminalEvent: 'run-failed',
    },
    {
      outcome: 'budget-stopped',
      expectedStatus: 'budget-stopped',
      terminalEvent: 'budget-stopped',
    },
    {
      outcome: 'missing-submission',
      expectedStatus: 'invalid-submission',
      terminalEvent: 'run-failed',
    },
  ])(
    'records $outcome as a terminal audit event after its start',
    async ({ outcome, expectedStatus, terminalEvent }) => {
      const plan = createAlgZooPilotPlan(configuration, fixture);
      const pair = {
        ...plan.schedule.pairs[0],
        sessionOrder: ['control', 'treatment'],
      };
      const heldOut = [{ secret: 'held-out audit sentinel' }];
      const activity = [];
      const runner = createTestAlgZooPilotRunner({
        appendAuditRecord: async (eventType, payload) =>
          activity.push({ type: 'audit', eventType, payload }),
        createDeadline: createTestDeadlineFactory().createDeadline,
        hashMapSnapshot: async () => 'lifecycle-map-hash',
        runInvestigator: async request => {
          activity.push({
            type: 'investigator',
            sessionId: request.session.sessionId,
          });
          if (request.session.arm === 'treatment') {
            if (outcome === 'failed') throw new Error('synthetic failure');
            if (outcome === 'budget-stopped')
              request.budget.reserve({ investigatorTokens: 20001 });
          }
          const reservation = request.budget.reserve({ investigatorTokens: 1 });
          reservation.complete({ investigatorTokens: 1 });
          if (
            request.session.arm === 'treatment' &&
            outcome === 'missing-submission'
          ) {
            return { cost: { investigatorTokens: 1 } };
          }
          return {
            cost: { investigatorTokens: 1 },
            submission: {
              result: 'synthetic',
              causalInterventionResult: {
                schemaVersion: 1,
                status: 'not-tested',
              },
            },
            ...(request.session.arm === 'control'
              ? { investigatorRuntime: { provider: 'synthetic' } }
              : {}),
          };
        },
        scoreBlindedSubmissions: async request => {
          activity.push({
            type: 'scorer',
            heldOutEvaluationData: request.heldOutEvaluationData,
          });
          return [
            {
              targetUnit: pair.unitIndex,
              predictionStatus: 'scored',
              arm: 'treatment',
              predictionMetrics: {
                normalizedRmse: 0.08,
                heldOutSecret: 'held-out audit sentinel',
                perStepNormalizedRmse: [0.1, { heldOutSecret: 'not-a-metric' }],
                candidateMse: Number.NaN,
              },
            },
            {
              targetUnit: pair.unitIndex,
              predictionStatus: 'invalid',
              evaluatorInput: 'held-out audit sentinel',
              errors: [
                { code: 'invalid-rule', detail: 'held-out audit sentinel' },
              ],
            },
          ];
        },
      });

      const result = await runner.runTargetPair(pair, [], heldOut);
      const auditEvents = activity.filter(event => event.type === 'audit');

      expect(activity.map(event => event.type)).toEqual([
        'audit',
        'investigator',
        'audit',
        'audit',
        'investigator',
        'audit',
        'scorer',
        'audit',
      ]);
      expect(auditEvents.map(event => event.eventType)).toEqual([
        'session-started',
        'session-finished',
        'session-started',
        terminalEvent,
        'pair-scored',
      ]);
      expect(auditEvents[3].payload).toMatchObject({
        status: expectedStatus,
        cost: result.sessionRecords[1].cost,
      });
      if (outcome === 'missing-submission')
        expect(auditEvents[3].payload).not.toHaveProperty('submission');
      else
        expect(auditEvents[3].payload.submission).toEqual(
          result.sessionRecords[1].submission
        );
      expect(JSON.stringify(auditEvents)).not.toContain(
        'held-out audit sentinel'
      );
      expect(auditEvents[4].payload).toEqual({
        pairId: pair.pairId,
        pairOrder: pair.pairOrder,
        unitIndex: pair.unitIndex,
        submissionCount: 2,
        scores: [
          {
            submissionIndex: 0,
            targetUnit: pair.unitIndex,
            predictionStatus: 'scored',
            predictionMetrics: { normalizedRmse: 0.08 },
          },
          {
            submissionIndex: 1,
            targetUnit: pair.unitIndex,
            predictionStatus: 'invalid',
            errors: [{ code: 'invalid-rule' }],
          },
        ],
      });
    }
  );

  it('does not invoke an investigator when the start record cannot be persisted', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const investigator = jest.fn(async () => ({}));
    const runner = createTestAlgZooPilotRunner({
      appendAuditRecord: async eventType => {
        if (eventType === 'session-started')
          throw new Error('audit sink unavailable');
      },
      createDeadline: createTestDeadlineFactory().createDeadline,
      hashMapSnapshot: async () => 'unpersisted-start-map-hash',
      runInvestigator: investigator,
      scoreBlindedSubmissions: async () => [],
    });

    await expect(
      runner.runTargetPair(plan.schedule.pairs[0], [], [])
    ).rejects.toThrow('audit sink unavailable');
    expect(investigator).not.toHaveBeenCalled();
  });

  it('records a redacted failure when blinded scoring throws', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const auditEvents = [];
    const runner = createTestAlgZooPilotRunner({
      appendAuditRecord: async (eventType, payload) =>
        auditEvents.push({ eventType, payload }),
      createDeadline: createTestDeadlineFactory().createDeadline,
      hashMapSnapshot: async () => 'scoring-failure-map-hash',
      runInvestigator: async request => {
        request.budget.reserve({ investigatorTokens: 1 }).complete({
          investigatorTokens: 1,
        });
        return {
          submission: {
            causalInterventionResult: {
              schemaVersion: 1,
              status: 'not-tested',
            },
          },
          cost: { investigatorTokens: 1 },
        };
      },
      scoreBlindedSubmissions: async () => {
        throw new Error('held-out-only scorer detail');
      },
    });

    await expect(
      runner.runTargetPair(plan.schedule.pairs[0], [], [])
    ).rejects.toThrow('Blinded pair scoring failed.');
    expect(auditEvents.at(-1)).toEqual({
      eventType: 'pair-scoring-failed',
      payload: expect.objectContaining({
        failureCode: 'scorer-error',
        submissionCount: 2,
      }),
    });
    expect(JSON.stringify(auditEvents)).not.toContain(
      'held-out-only scorer detail'
    );
  });
});

describe('AlgZoo typed causal result enforcement', () => {
  it('keeps explanations without a typed causal record out of scoring', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const runner = createTestAlgZooPilotRunner({
      createDeadline: createTestDeadlineFactory().createDeadline,
      hashMapSnapshot: async () => 'missing-causal-map-hash',
      runInvestigator: async request => {
        const reservation = request.budget.reserve({ investigatorTokens: 4 });
        reservation.complete({ investigatorTokens: 4 });
        return {
          submission: {
            hypothesis: 'An explanation without its causal label',
            restrictedRule: { op: 'constant', value: 0 },
            causalInterventionResult:
              request.session.arm === 'control'
                ? undefined
                : { schemaVersion: 1, status: 'tested' },
          },
          cost: { investigatorTokens: 4 },
        };
      },
      scoreBlindedSubmissions: async ({ submissions }) =>
        submissions.map(submission => ({
          attemptStatus: submission.attemptStatus,
          failureCode: submission.failureCode,
        })),
    });

    const result = await runner.runTargetPair(
      {
        ...plan.schedule.pairs[0],
        sessionOrder: ['control', 'treatment'],
      },
      [],
      []
    );

    expect(result.sessionRecords).toMatchObject([
      {
        attemptStatus: 'invalid-submission',
        failureCode: 'invalid-causal-intervention-result',
        cost: { investigatorTokens: 4 },
      },
      {
        attemptStatus: 'invalid-submission',
        failureCode: 'invalid-causal-intervention-result',
        cost: { investigatorTokens: 4 },
      },
    ]);
    expect(result.blindedScores).toEqual([
      {
        attemptStatus: 'invalid-submission',
        failureCode: 'invalid-causal-intervention-result',
      },
      {
        attemptStatus: 'invalid-submission',
        failureCode: 'invalid-causal-intervention-result',
      },
    ]);
  });

  it('accepts a complete tested causal record', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const runner = createTestAlgZooPilotRunner({
      createDeadline: createTestDeadlineFactory().createDeadline,
      hashMapSnapshot: async () => 'tested-causal-map-hash',
      runInvestigator: async request => {
        const reservation = request.budget.reserve({ investigatorTokens: 4 });
        reservation.complete({ investigatorTokens: 4 });
        return {
          submission: {
            causalInterventionResult: {
              schemaVersion: 1,
              status: 'tested',
              targetMechanismId: 'mechanism-1',
              operation: 'set-activation-zero',
              timeStepIndex: 0,
              inputSequenceSha256: 'a'.repeat(64),
              predictedOutputIndex: 1,
              baselineOutputIndex: 1,
              intervenedOutputIndex: 0,
              causalScore: 1,
              artifactSha256: 'b'.repeat(64),
            },
          },
          cost: { investigatorTokens: 4 },
        };
      },
      scoreBlindedSubmissions: async () => [],
    });

    const result = await runner.runTargetPair(
      { ...plan.schedule.pairs[0], sessionOrder: ['control'] },
      [],
      []
    );

    expect(result.sessionRecords[0].attemptStatus).toBe('submitted');
  });
});

describe('AlgZoo pilot session budget enforcement', () => {
  it('bounds both arms independently and retains earlier submissions', async () => {
    for (const field of [
      'investigatorTokens',
      'toolCalls',
      'targetForwardPasses',
    ]) {
      const plan = createAlgZooPilotPlan(configuration, fixture);
      const pair = {
        ...plan.schedule.pairs[0],
        sessionOrder: ['control', 'treatment'],
      };
      const deadlineFactory = createTestDeadlineFactory();
      const runner = createTestAlgZooPilotRunner({
        createDeadline: deadlineFactory.createDeadline,
        hashMapSnapshot: async () => 'independent-arm-budget-hash',
        runInvestigator: async request => {
          const limit = request.session.budget[field];
          request.budget
            .reserve({ [field]: limit })
            .complete({ [field]: limit });
          if (request.session.arm === 'treatment') {
            request.budget.reserve({ [field]: 1 });
          }
          return {
            submission: {
              result: request.session.arm,
              causalInterventionResult: {
                schemaVersion: 1,
                status: 'not-tested',
              },
            },
          };
        },
        scoreBlindedSubmissions: async ({ submissions }) => {
          expect(submissions).toHaveLength(2);
          return [];
        },
      });

      const result = await runner.runTargetPair(pair, [], []);

      expect(result.sessionRecords.map(record => record.arm)).toEqual([
        'control',
        'treatment',
      ]);
      expect(result.sessionRecords).toMatchObject([
        {
          attemptStatus: 'submitted',
          cost: { [field]: pair.sessions.control.budget[field] },
        },
        {
          attemptStatus: 'budget-stopped',
          failureCode: field,
          cost: { [field]: pair.sessions.treatment.budget[field] },
        },
      ]);
      expect(result.blindedSubmissions.map(item => item.attemptStatus)).toEqual(
        ['submitted', 'budget-stopped']
      );
      expect(
        result.blindedSubmissions.every(item => !Object.hasOwn(item, 'arm'))
      ).toBe(true);
      expect(deadlineFactory.deadlines).toHaveLength(2);
      expect(
        deadlineFactory.deadlines.every(deadline => deadline.cancelCount === 1)
      ).toBe(true);
    }
  });

  it('refuses further investigator work at each exact session usage limit', async () => {
    for (const field of [
      'investigatorTokens',
      'toolCalls',
      'targetForwardPasses',
    ]) {
      const plan = createAlgZooPilotPlan(configuration, fixture);
      const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
      const deadlineFactory = createTestDeadlineFactory();
      let unbudgetedWorkStarted = false;
      const runner = createTestAlgZooPilotRunner({
        createDeadline: deadlineFactory.createDeadline,
        hashMapSnapshot: async () => 'budget-map-hash',
        runInvestigator: async request => {
          const limit = request.session.budget[field];
          const reservation = request.budget.reserve({ [field]: limit });
          reservation.complete({ [field]: limit });
          request.budget.reserve({ [field]: 1 });
          unbudgetedWorkStarted = true;
          return { submission: {} };
        },
        scoreBlindedSubmissions: async () => [],
      });
      const result = await runner.runTargetPair(pair, [], []);

      expect(unbudgetedWorkStarted).toBe(false);
      expect(result.sessionRecords[0]).toMatchObject({
        attemptStatus: 'budget-stopped',
        failureCode: field,
        cost: { [field]: pair.sessions.control.budget[field] },
      });
      expect(deadlineFactory.deadlines[0].signal.aborted).toBe(true);
      expect(deadlineFactory.deadlines[0].cancelCount).toBe(1);
      expect(result.blindedSubmissions[0].attemptStatus).toBe('budget-stopped');
    }
  });

  it('records provider-reported usage that exceeds a reserved global limit', async () => {
    for (const field of [
      'investigatorTokens',
      'toolCalls',
      'targetForwardPasses',
    ]) {
      const plan = createAlgZooPilotPlan(configuration, fixture);
      const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
      const deadlineFactory = createTestDeadlineFactory();
      const runner = createTestAlgZooPilotRunner({
        createDeadline: deadlineFactory.createDeadline,
        hashMapSnapshot: async () => 'provider-overrun-hash',
        runInvestigator: async request => {
          const limit = request.session.budget[field];
          const reservation = request.budget.reserve({ [field]: limit });
          reservation.complete({ [field]: limit + 1 });
          return { submission: {} };
        },
        scoreBlindedSubmissions: async () => [],
      });
      const result = await runner.runTargetPair(pair, [], []);

      expect(result.sessionRecords[0]).toMatchObject({
        attemptStatus: 'budget-stopped',
        failureCode: field,
        exceededBudgetLimits: [field],
        cost: { [field]: pair.sessions.control.budget[field] + 1 },
      });
    }
  });

  it('aborts and retains a failed attempt when the elapsed deadline expires', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
    const deadlineFactory = createTestDeadlineFactory();
    const runner = createTestAlgZooPilotRunner({
      createDeadline: deadlineFactory.createDeadline,
      hashMapSnapshot: async () => 'deadline-map-hash',
      runInvestigator: async request => {
        deadlineFactory.deadlines.at(-1).expire();
        expect(request.signal.aborted).toBe(true);
        expect(() => request.budget.reserve({})).toThrow();
        return new Promise(() => {});
      },
      scoreBlindedSubmissions: async () => [],
    });

    const result = await runner.runTargetPair(pair, [], []);

    expect(result.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'elapsedMillis',
      costMeasurementStatus: 'partial',
      cost: { elapsedMillis: pair.sessions.control.budget.elapsedMillis },
    });
    expect(result.blindedSubmissions[0].attemptStatus).toBe('budget-stopped');
  });

  it('rejects invalid deadline adapters and records elapsed overruns', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
    const invalidRunner = createTestAlgZooPilotRunner({
      createDeadline: () => null,
      hashMapSnapshot: async () => 'invalid-deadline-hash',
      runInvestigator: async () => ({ submission: {} }),
      scoreBlindedSubmissions: async () => [],
    });
    await expect(invalidRunner.runTargetPair(pair, [], [])).rejects.toThrow(
      'invalid deadline'
    );

    const deadlineFactory = createTestDeadlineFactory();
    const runner = createTestAlgZooPilotRunner({
      createDeadline: deadlineFactory.createDeadline,
      hashMapSnapshot: async () => 'elapsed-overrun-hash',
      runInvestigator: async () => {
        deadlineFactory.deadlines
          .at(-1)
          .expire(pair.sessions.control.budget.elapsedMillis + 1);
        return new Promise(() => {});
      },
      scoreBlindedSubmissions: async () => [],
    });
    const result = await runner.runTargetPair(pair, [], []);

    expect(result.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'elapsedMillis',
      cost: { elapsedMillis: pair.sessions.control.budget.elapsedMillis + 1 },
      exceededBudgetLimits: ['elapsedMillis'],
    });
  });

  it('rejects invalid reservations, usage, and unmetered adapter cost', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
    const run = async execute => {
      const deadlineFactory = createTestDeadlineFactory();
      const runner = createTestAlgZooPilotRunner({
        createDeadline: deadlineFactory.createDeadline,
        hashMapSnapshot: async () => 'invalid-usage-hash',
        runInvestigator: execute,
        scoreBlindedSubmissions: async () => [],
      });
      return runner.runTargetPair(pair, [], []);
    };

    const invalidReservation = await run(async request => {
      request.budget.reserve({ investigatorTokens: -1 });
      return { submission: {} };
    });
    expect(invalidReservation.sessionRecords[0]).toMatchObject({
      attemptStatus: 'failed',
      failureCode: 'investigator-error',
      costMeasurementStatus: 'partial',
    });
    const invalidUsage = await run(async request => {
      request.budget.reserve({ toolCalls: 1 }).complete({ toolCalls: -1 });
      return { submission: {} };
    });
    expect(invalidUsage.sessionRecords[0]).toMatchObject({
      attemptStatus: 'failed',
      failureCode: 'investigator-error',
      costMeasurementStatus: 'partial',
    });

    const unmetered = await run(async () => ({
      submission: {},
      cost: { investigatorTokens: 1 },
    }));
    expect(unmetered.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'unmetered-investigatorTokens',
      cost: { investigatorTokens: 0 },
    });

    const nonfiniteDeadlineFactory = createTestDeadlineFactory();
    const nonfiniteDeadlineRunner = createTestAlgZooPilotRunner({
      createDeadline: nonfiniteDeadlineFactory.createDeadline,
      hashMapSnapshot: async () => 'nonfinite-deadline-hash',
      runInvestigator: async request => {
        nonfiniteDeadlineFactory.deadlines[0].setElapsed(Number.NaN);
        request.budget.reserve({});
        return { submission: {} };
      },
      scoreBlindedSubmissions: async () => [],
    });
    const nonfiniteDeadline = await nonfiniteDeadlineRunner.runTargetPair(
      pair,
      [],
      []
    );
    expect(nonfiniteDeadline.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'elapsedMillis',
      cost: { elapsedMillis: 0 },
    });
  });

  it('retains unsettled and over-reservation attempts with measured usage', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = { ...plan.schedule.pairs[0], sessionOrder: ['control'] };
    const run = async execute => {
      const deadlineFactory = createTestDeadlineFactory();
      const runner = createTestAlgZooPilotRunner({
        createDeadline: deadlineFactory.createDeadline,
        hashMapSnapshot: async () => 'reservation-outcome-hash',
        runInvestigator: execute,
        scoreBlindedSubmissions: async () => [],
      });
      return runner.runTargetPair(pair, [], []);
    };

    const unsettled = await run(async request => {
      request.budget.reserve({ toolCalls: 1 });
      return { submission: {} };
    });
    expect(unsettled.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'unsettled-reservation',
    });

    const overReservation = await run(async request => {
      const reservation = request.budget.reserve({ investigatorTokens: 10 });
      reservation.complete({ investigatorTokens: 11 });
      return { submission: {} };
    });
    expect(overReservation.sessionRecords[0]).toMatchObject({
      attemptStatus: 'budget-stopped',
      failureCode: 'investigatorTokens',
      cost: { investigatorTokens: 11 },
    });

    const duplicateSettlement = await run(async request => {
      const reservation = request.budget.reserve({ toolCalls: 1 });
      reservation.complete({ toolCalls: 1 });
      reservation.cancel();
      return { submission: {} };
    });
    expect(duplicateSettlement.sessionRecords[0]).toMatchObject({
      attemptStatus: 'failed',
      failureCode: 'investigator-error',
      costMeasurementStatus: 'partial',
      cost: { toolCalls: 1 },
    });
  });

  it('records provider errors with partial cost and continues to the paired arm', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = {
      ...plan.schedule.pairs[0],
      sessionOrder: ['control', 'treatment'],
    };
    const deadlineFactory = createTestDeadlineFactory();
    const runner = createTestAlgZooPilotRunner({
      createDeadline: deadlineFactory.createDeadline,
      hashMapSnapshot: async () => 'provider-failure-map-hash',
      runInvestigator: async request => {
        const reservation = request.budget.reserve({ investigatorTokens: 12 });
        reservation.complete({ investigatorTokens: 12 });
        if (request.session.arm === 'control') {
          throw new Error('provider unavailable');
        }
        return {
          submission: {
            hypothesis: 'paired attempt completed',
            causalInterventionResult: {
              schemaVersion: 1,
              status: 'not-tested',
            },
          },
          cost: { investigatorTokens: 12 },
        };
      },
      scoreBlindedSubmissions: async ({ submissions }) => {
        expect(submissions).toHaveLength(2);
        return [];
      },
    });

    const result = await runner.runTargetPair(pair, [], []);

    expect(result.sessionRecords).toMatchObject([
      {
        arm: 'control',
        attemptStatus: 'failed',
        failureCode: 'investigator-error',
        costMeasurementStatus: 'partial',
        cost: { investigatorTokens: 12 },
      },
      {
        arm: 'treatment',
        attemptStatus: 'submitted',
        costMeasurementStatus: 'complete',
        cost: { investigatorTokens: 12 },
      },
    ]);
    expect(result.blindedSubmissions.map(item => item.attemptStatus)).toEqual([
      'failed',
      'submitted',
    ]);
    expect(deadlineFactory.deadlines[0].signal.aborted).toBe(true);
    expect(deadlineFactory.deadlines[0].cancelCount).toBe(1);
    expect(deadlineFactory.deadlines[1].signal.aborted).toBe(false);
    expect(deadlineFactory.deadlines[1].cancelCount).toBe(1);
  });
});

describe('AlgZoo whole-model accuracy comparison', () => {
  it('validates equal compute for whole-model estimator comparisons', () => {
    expect(compareAlgZooWholeModelAccuracy(null)).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-accuracy-variants' }],
    });
    expect(compareAlgZooWholeModelAccuracy([])).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-accuracy-variants' }],
    });
    const result = compareAlgZooWholeModelAccuracy([
      {
        referenceAccuracy: 0.9,
        mechanisticEstimate: 0.8,
        samplingEstimate: 0.7,
        mechanisticCompute: 100,
        samplingCompute: 100,
      },
    ]);
    expect(result.valid).toBe(true);
    expect(result.variantCount).toBe(1);
    expect(result.mechanisticMse).toBeCloseTo(0.01);
    expect(result.samplingMse).toBeCloseTo(0.04);
    expect(
      compareAlgZooWholeModelAccuracy([
        {
          referenceAccuracy: 0.9,
          mechanisticEstimate: 0.8,
          samplingEstimate: 0.7,
          mechanisticCompute: 100,
          samplingCompute: 99,
        },
      ])
    ).toMatchObject({ valid: false });
  });
});

describe('AlgZoo held-out whole-model accuracy report', () => {
  it('produces a versioned matched-compute report for every held-out perturbation scale', () => {
    const evaluation = syntheticWholeModelEvaluation();
    evaluation.variants.reverse();
    const report = evaluateAlgZooWholeModelAccuracyV1(evaluation);

    expect(report.valid).toBe(true);
    if (!report.valid) return;
    expect(report.report).toMatchObject({
      schemaVersion: 1,
      protocolVersion: '1.0.0',
      heldOutSplitId: evaluation.heldOutSplitId,
      sampleCountPerVariant: 100000,
      variantCount: 32,
      materialVariationMet: true,
      samplingBaseline: {
        seedCommitment: 'b'.repeat(64),
      },
    });
    expect(report.report.variants).toHaveLength(32);
    expect(report.report.byNoiseScale).toEqual(
      [0.01, 0.05, 0.1, 0.2].map(noiseScale =>
        expect.objectContaining({ noiseScale, variantCount: 8 })
      )
    );
    expect(report.report.overall.mechanisticMse).toBeCloseTo(0.0001);
    expect(report.report.overall.samplingMse).toBeCloseTo(0.0025);
    expect(report.report.variants[0].variantId).toBe('noise-0.01-replicate-0');
    expect(evaluation.variants[0].variantId).toBe('noise-0.2-replicate-7');
  });

  it('retains a poor estimate and reports when material accuracy variation is absent', () => {
    const evaluation = syntheticWholeModelEvaluation(-0.4);
    evaluation.variants.forEach(variant => {
      variant.referenceAccuracy = 0.9;
      variant.mechanisticEstimate = 0.2;
      variant.samplingEstimate = 0.88;
    });
    const report = evaluateAlgZooWholeModelAccuracyV1(evaluation);

    expect(report.valid).toBe(true);
    if (!report.valid) return;
    expect(report.report.variants).toHaveLength(32);
    expect(report.report.overall.mechanisticMse).toBeCloseTo(0.49);
    expect(report.report.overall.samplingMse).toBeCloseTo(0.0004);
    expect(report.report.materialVariationMet).toBe(false);
    expect(report.report.referenceAccuracyRange.spread).toBe(0);
  });

  it('rejects malformed inputs, sample counts, incomplete variants, and baseline provenance', () => {
    expect(evaluateAlgZooWholeModelAccuracyV1(null)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-evaluation' }],
    });
    expect(evaluateAlgZooWholeModelAccuracyV1('invalid')).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-evaluation' }],
    });
    expect(evaluateAlgZooWholeModelAccuracyV1([])).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-evaluation' }],
    });

    const wrongSampleCount = syntheticWholeModelEvaluation();
    wrongSampleCount.sampleCountPerVariant = 99999;
    expect(evaluateAlgZooWholeModelAccuracyV1(wrongSampleCount)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-held-out-sample-count' }],
    });

    const incomplete = syntheticWholeModelEvaluation();
    incomplete.variants.pop();
    expect(evaluateAlgZooWholeModelAccuracyV1(incomplete)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-variant-count' }],
    });

    const missingBaseline = syntheticWholeModelEvaluation();
    missingBaseline.samplingBaseline = null;
    expect(evaluateAlgZooWholeModelAccuracyV1(missingBaseline)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-sampling-baseline' }],
    });

    const invalidBaselineRevision = syntheticWholeModelEvaluation();
    invalidBaselineRevision.samplingBaseline.method.revision = 'revision';
    expect(
      evaluateAlgZooWholeModelAccuracyV1(invalidBaselineRevision)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-sampling-baseline' }],
    });

    const missingBaselineRevision = syntheticWholeModelEvaluation();
    missingBaselineRevision.samplingBaseline.method.revision = undefined;
    expect(
      evaluateAlgZooWholeModelAccuracyV1(missingBaselineRevision)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-sampling-baseline' }],
    });

    const invalidBaselineSeed = syntheticWholeModelEvaluation();
    invalidBaselineSeed.samplingBaseline.seedCommitment = 'not-a-hash';
    expect(
      evaluateAlgZooWholeModelAccuracyV1(invalidBaselineSeed)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-sampling-baseline' }],
    });

    const missingBaselineSeed = syntheticWholeModelEvaluation();
    missingBaselineSeed.samplingBaseline.seedCommitment = undefined;
    expect(
      evaluateAlgZooWholeModelAccuracyV1(missingBaselineSeed)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-sampling-baseline' }],
    });
  });

  it('rejects duplicate identifiers, unbalanced perturbation scales, changed splits, invalid accuracy, and unmatched compute', () => {
    const duplicateId = syntheticWholeModelEvaluation();
    duplicateId.variants[1].variantId = duplicateId.variants[0].variantId;
    expect(evaluateAlgZooWholeModelAccuracyV1(duplicateId)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-variant-ids' }],
    });

    const emptyVariantId = syntheticWholeModelEvaluation();
    emptyVariantId.variants[0].variantId = ' ';
    expect(evaluateAlgZooWholeModelAccuracyV1(emptyVariantId)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-accuracy-variant-ids' }],
    });

    const missingScale = syntheticWholeModelEvaluation();
    missingScale.variants[0].noiseScale = 0.05;
    expect(evaluateAlgZooWholeModelAccuracyV1(missingScale)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-perturbation-scale-coverage' }],
    });

    const changedSplit = syntheticWholeModelEvaluation();
    changedSplit.variants[0].heldOutSplitId = 'different-held-out-split';
    expect(evaluateAlgZooWholeModelAccuracyV1(changedSplit)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-or-unmatched-accuracy-variant', index: 0 }],
    });

    const invalidAccuracy = syntheticWholeModelEvaluation();
    invalidAccuracy.variants[0].referenceAccuracy = 1.1;
    expect(evaluateAlgZooWholeModelAccuracyV1(invalidAccuracy)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-or-unmatched-accuracy-variant', index: 0 }],
    });

    const unmatchedCompute = syntheticWholeModelEvaluation();
    unmatchedCompute.variants[0].samplingCompute -= 1;
    expect(evaluateAlgZooWholeModelAccuracyV1(unmatchedCompute)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-or-unmatched-accuracy-variant', index: 0 }],
    });
  });
});

describe('AlgZoo blinded scoring payload', () => {
  it('removes identifying keys from the scorer payload', () => {
    expect(
      createAlgZooBlindedSubmission({
        unitIndex: 4,
        arm: 'treatment',
        pairOrder: 12,
        submissionId: 'private-id',
        submission: {
          hypothesis: 'H',
          backgroundClaimIds: ['map-id'],
          causalInterventionResult: { status: 'not-tested' },
        },
      })
    ).toEqual({
      targetUnit: 4,
      hypothesis: 'H',
      restrictedRule: undefined,
      predictions: undefined,
      causalEvidence: undefined,
      causalInterventionResult: { status: 'not-tested' },
      evidence: undefined,
    });
    expect(createAlgZooBlindedSubmission({ unitIndex: 2 })).toEqual({
      targetUnit: 2,
      hypothesis: undefined,
      restrictedRule: undefined,
      predictions: undefined,
      causalEvidence: undefined,
      causalInterventionResult: undefined,
      evidence: undefined,
    });
  });
});
