import { readFileSync } from 'node:fs';
import {
  compareAlgZooWholeModelAccuracy,
  createAlgZooBlindedSubmission,
  createAlgZooHeldOutSequences,
  createAlgZooNormalSequence,
  createAlgZooPilotPlan,
  createAlgZooPilotRunner,
  createAlgZooPilotSchedule,
  getAlgZooPilotMapContext,
} from '../../../src/core/interpretability/algZooPilotHarness/index.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const sha256 = 'a'.repeat(64);
const configuration = {
  gitCommit: 'b'.repeat(40),
  protocolSha256: sha256,
  fixturePath: 'test/fixtures/interpretability/alg-zoo-m16-10.json',
  fixtureSha256: 'c'.repeat(64),
  targetEvaluatorSha256: 'd'.repeat(64),
  investigatorModel: 'test-investigator@revision-1',
  evaluatorModel: 'test-evaluator@revision-1',
  tokenizerHash: 'e'.repeat(64),
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
    heldOutProbeArtifact: null,
  },
};

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
    expect(first.manifest.launchReady).toBe(true);
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
    for (const changes of [
      { investigatorModel: null },
      { investigatorModel: '' },
      { inputSeedCommitments: [] },
      { promptHashes: {} },
    ]) {
      expect(
        createAlgZooPilotPlan({ ...configuration, ...changes }, fixture).valid
      ).toBe(false);
    }
    for (const [root, key, value] of [
      ['source', 'revision', 'wrong-revision'],
      ['source', 'checkpointSha256', 'wrong-checkpoint'],
      ['model', 'id', 'wrong-model'],
      ['model', 'hiddenSize', 15],
      ['model', 'sequenceLength', 9],
    ]) {
      const changedFixture = {
        ...fixture,
        [root]: { ...fixture[root], [key]: value },
      };
      expect(
        createAlgZooPilotPlan(configuration, changedFixture).errors
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

  it('keeps held-out values out of investigators and strips arm metadata before scoring', async () => {
    const plan = createAlgZooPilotPlan(configuration, fixture);
    const pair = plan.schedule.pairs[1];
    const heldOut = [{ secret: 'held-out-only' }];
    const calls = [];
    const runner = createAlgZooPilotRunner({
      hashMapSnapshot: async entries => `hash-${entries.length}`,
      runInvestigator: async request => {
        calls.push({ type: 'investigator', request });
        return {
          submissionId: `private-${request.session.arm}`,
          submission: {
            hypothesis: 'A reproducible hypothesis',
            restrictedRule: { operation: 'relu' },
            predictions: [{ input: 'x', output: 'y' }],
            causalEvidence: 'not tested',
            backgroundClaimIds: ['map-entry-private'],
            evidence: [{ observation: 'controlled' }],
          },
          cost:
            request.session.arm === 'treatment'
              ? {
                  investigatorTokens: 20001,
                  elapsedMillis: 1800001,
                  toolCalls: 101,
                  targetForwardPasses: 10001,
                  monetaryCostUsd: 0.01,
                }
              : { investigatorTokens: 12 },
        };
      },
      scoreBlindedSubmissions: async request => {
        calls.push({ type: 'scorer', request });
        return [{ passed: true }, { passed: false }];
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
    expect(
      investigatorCalls.find(call => call.request.session.arm === 'control')
        .request.mapEntries
    ).toEqual([]);
    expect(scorerCall.request.heldOutEvaluationData).toBe(heldOut);
    expect(scorerCall.request.submissions).toHaveLength(2);
    for (const submission of scorerCall.request.submissions) {
      expect(submission).not.toHaveProperty('arm');
      expect(submission).not.toHaveProperty('pairOrder');
      expect(submission).not.toHaveProperty('submissionId');
      expect(submission).not.toHaveProperty('backgroundClaimIds');
      expect(submission).not.toHaveProperty('mapSnapshotHash');
    }
    expect(result.sessionRecords).toHaveLength(2);
    expect(result.sessionRecords.every(record => record.mapSnapshotHash)).toBe(
      true
    );
    expect(
      result.sessionRecords.some(
        record => record.exceededBudgetLimits.length === 4
      )
    ).toBe(true);
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

    const noCostRunner = createAlgZooPilotRunner({
      hashMapSnapshot: async () => 'empty-map-hash',
      runInvestigator: async () => ({ submission: {} }),
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

  it('removes identifying keys from the scorer payload', () => {
    expect(
      createAlgZooBlindedSubmission({
        unitIndex: 4,
        arm: 'treatment',
        pairOrder: 12,
        submissionId: 'private-id',
        submission: { hypothesis: 'H', backgroundClaimIds: ['map-id'] },
      })
    ).toEqual({
      targetUnit: 4,
      hypothesis: 'H',
      restrictedRule: undefined,
      predictions: undefined,
      causalEvidence: undefined,
      evidence: undefined,
    });
    expect(createAlgZooBlindedSubmission({ unitIndex: 2 })).toEqual({
      targetUnit: 2,
      hypothesis: undefined,
      restrictedRule: undefined,
      predictions: undefined,
      causalEvidence: undefined,
      evidence: undefined,
    });
  });
});
