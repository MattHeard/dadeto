import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  appendExperimentDesignV1,
  appendExperimentSubmissionV1,
  createActivationObservationV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  discoverResearchCandidatesV1,
  exportInterpretabilityResearchBundleV3,
  exportInterpretabilityResearchBundleV7,
  getEvidenceGraphContextV1,
  getEvidenceGraphContextSnapshotV1,
  importInterpretabilityResearchBundleV2,
  importInterpretabilityResearchBundleV7,
  proposeAlgZooEvidenceSensitiveExperimentDesignV1,
} from '../../../src/core/interpretability/interpretability.js';
import { calculateAlgZooM16x10Activation } from '../../../src/core/interpretability/algZooReplay.js';
import { createAlgZooNormalSequence } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
import {
  parseAtlasResearchJourneyArgs,
  runAtlasResearchJourneyCli as runAtlasResearchJourneyCore,
  runAtlasResearchJourneyV1,
} from '../../../src/core/local/interpretability/atlasResearchJourney.js';
import { runAtlasResearchJourneyCli } from '../../../src/local/interpretability/atlasResearchJourney.js';
import { createAtomicAtlasResearchStorage } from '../../../src/local/interpretability/atlasResearchStorage.js';
import { createTestZod } from './testZod.js';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../fixtures/interpretability/alg-zoo-m16-10.json',
      import.meta.url
    ),
    'utf8'
  )
);
const model = {
  modelId: fixture.model.id,
  repository: fixture.source.repository,
  revision: fixture.source.revision,
  architecture: fixture.model.architecture,
};
const schemaFactory = createTestZod;
const evidenceSchemas = createInterpretabilitySchemasV1(schemaFactory());
const identitySchemas = createInterpretabilitySchemasV2(schemaFactory());
const bundleSchemas = {
  evidenceGraphSchemasV1: evidenceSchemas,
  identityGraphSchemasV2: identitySchemas,
};
const FIRST_INPUT_SEED = 17;
const SECOND_INPUT_SEED = 2;
const firstInput = createAlgZooNormalSequence(FIRST_INPUT_SEED);
const secondInput = createAlgZooNormalSequence(SECOND_INPUT_SEED);
const firstInputSequenceId = createInputSequenceId(firstInput);
const secondInputSequenceId = createInputSequenceId(secondInput);
const createdAt = '2026-10-20T14:00:00Z';

/**
 * Identify a deterministic JSON-encoded input sequence by its exact bytes.
 * @param {Array<number>} sequence Input values.
 * @returns {string} SHA-256 input-sequence identity.
 */
function createInputSequenceId(sequence) {
  const digest = createHash('sha256')
    .update(JSON.stringify(sequence))
    .digest('hex');
  return `sha256:${digest}`;
}

/**
 * Resolve the deterministic candidate and complete context for one bundle.
 * @param {Record<string, any>} bundle Portable evidence and identity bundle.
 * @returns {Promise<{candidate: Record<string, any>, context: Record<string, any>}>} Resolved design inputs.
 */
async function resolveAlgZooDesignInput(bundle) {
  const discovery = discoverResearchCandidatesV1(bundle);
  expect(discovery.valid).toBe(true);
  if (!discovery.valid)
    throw new Error('seeded candidate should be discoverable');
  const candidate = discovery.candidates.find(
    item => item.legacyMechanismId === 'legacy-algzoo-neuron-0-step-9'
  );
  expect(candidate).toBeDefined();
  if (!candidate) throw new Error('seeded candidate is missing');
  const context = await getEvidenceGraphContextSnapshotV1(
    bundle.evidenceGraph,
    {
      mechanismId: candidate.legacyMechanismId,
      maxDepth: 4,
      pageSize: 100,
      maxItems: 100,
    },
    canonical => createHash('sha256').update(canonical).digest('hex')
  );
  expect(context.valid).toBe(true);
  if (!context.valid) throw new Error('seeded context should be complete');
  return { candidate, context };
}

/**
 * Run the deterministic discovery → complete-context → design path for one bundle.
 * @param {Record<string, any>} bundle Portable evidence and identity bundle.
 * @param {string} designId Stable proposal identity.
 * @returns {Promise<Record<string, any>>} Evidence-sensitive untested proposal.
 */
async function draftAlgZooDesign(bundle, designId) {
  const { candidate, context } = await resolveAlgZooDesignInput(bundle);
  return proposeAlgZooEvidenceSensitiveExperimentDesignV1(candidate, context, {
    id: designId,
    authorId: 'atlas-fixture-agent',
    agentId: 'atlas-researcher',
    createdAt: '2026-10-25T04:00:00Z',
  });
}

/**
 * Require the decisive negative record to change the proposed follow-up test.
 * @param {Record<string, any>} observationOnlyBundle Bundle with the initial observation.
 * @param {Record<string, any>} conflictingBundle Bundle with positive and negative evidence.
 * @returns {Promise<void>} Resolves when the paired design is evidence-sensitive and appendable.
 */
async function expectEvidenceSensitiveDesigns(
  observationOnlyBundle,
  conflictingBundle
) {
  const observationOnly = await draftAlgZooDesign(
    observationOnlyBundle,
    'design-positive-only'
  );
  const conflictAware = await draftAlgZooDesign(
    conflictingBundle,
    'design-positive-and-negative'
  );
  expect(observationOnly.valid).toBe(true);
  expect(conflictAware.valid).toBe(true);
  if (!observationOnly.valid || !conflictAware.valid) return;
  expect(observationOnly.design.executionStatus).toBe('untested');
  expect(conflictAware.design.executionStatus).toBe('untested');
  expect(observationOnly.design.test.inputSelection).not.toBe(
    conflictAware.design.test.inputSelection
  );
  expect(observationOnly.design.test.measurements).not.toEqual(
    conflictAware.design.test.measurements
  );
  expect(conflictAware.design.test.inputSelection).toContain(
    'counterexample seed 2'
  );
  expect(conflictAware.design.reproducibility.budget).toMatchObject({
    maxInputs: 16,
    maxComputeUnits: 16,
  });
  expect(conflictAware.design.test.expectedOutcomes[0].observation).toBe(
    'Held-out activations include values above 2 and at-or-below 2, reproducing the sequence-dependent threshold crossing.'
  );
  expect(conflictAware.design.citations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        targetType: 'evidence',
        targetId: 'evidence-investigator-a',
        relation: 'tests',
      }),
      expect.objectContaining({
        targetType: 'evidence',
        targetId: 'evidence-investigator-b',
        relation: 'challenges',
      }),
    ])
  );
  const appended = appendExperimentDesignV1(
    conflictingBundle,
    conflictAware.design,
    bundleSchemas
  );
  expect(appended.valid).toBe(true);
  if (!appended.valid) return;
  expect(appended.bundle.experimentDesigns).toContainEqual(
    conflictAware.design
  );
  expect(appended.bundle.evidenceGraph).toEqual(
    conflictingBundle.evidenceGraph
  );
  const portable = exportInterpretabilityResearchBundleV7(
    appended.bundle,
    bundleSchemas
  );
  expect(portable.valid).toBe(true);
  if (!portable.valid) return;
  const restored = importInterpretabilityResearchBundleV7(
    portable.json,
    bundleSchemas
  );
  expect(restored.valid).toBe(true);
  if (!restored.valid) return;
  expect(restored.bundle.experimentDesigns).toEqual([conflictAware.design]);
}

/**
 * Preserve predictable refusals for malformed, incomplete, or mismatched input.
 * @param {Record<string, any>} bundle Portable seeded AlgZoo bundle.
 * @returns {Promise<void>} Resolves after each refusal code is asserted.
 */
async function expectProposalValidationRefusals(bundle) {
  const { candidate, context } = await resolveAlgZooDesignInput(bundle);
  const proposal = {
    id: 'validation-proposal',
    authorId: 'atlas-fixture-agent',
    createdAt: '2026-10-25T04:00:00Z',
  };
  const expectRefusal = (nextCandidate, nextContext, nextProposal, code) => {
    expect(
      proposeAlgZooEvidenceSensitiveExperimentDesignV1(
        nextCandidate,
        nextContext,
        nextProposal
      )
    ).toMatchObject({ valid: false, errors: [{ code }] });
  };
  const invalidContexts = [
    { ...context, valid: false },
    { ...context, items: null },
    { ...context, totalItems: context.totalItems + 1 },
    { ...context, mechanism: null },
    { ...context, contextStatus: 'capped' },
    { ...context, nextCursor: 'next-page' },
    { ...context, continuationCursor: 'next-page' },
    { ...context, snapshotId: null },
    { ...context, snapshotId: 'atlas:context:v1:incomplete' },
  ];
  invalidContexts.forEach(invalidContext =>
    expectRefusal(candidate, invalidContext, proposal, 'invalid-design-input')
  );
  expectRefusal(null, context, proposal, 'invalid-design-input');
  expectRefusal(candidate, context, null, 'invalid-design-input');
  [
    { ...proposal, id: 1 },
    { ...proposal, id: ' ' },
    { ...proposal, authorId: null },
    { ...proposal, authorId: ' ' },
    { ...proposal, createdAt: 1 },
    { ...proposal, createdAt: 'not-a-date' },
  ].forEach(invalidProposal =>
    expectRefusal(candidate, context, invalidProposal, 'invalid-design-input')
  );

  [
    { ...candidate, identityStatus: 'unresolved' },
    { ...candidate, canonicalMechanismId: null },
    { ...candidate, canonicalMechanismId: ' ' },
    { ...candidate, legacyMechanismId: 'different-mechanism' },
    { ...candidate, model: null },
    {
      ...candidate,
      model: { ...candidate.model, checkpoint: { sha256: 'different' } },
    },
  ].forEach(invalidCandidate =>
    expectRefusal(
      invalidCandidate,
      context,
      proposal,
      'unresolved-candidate-identity'
    )
  );

  [
    { ...context.mechanism, kind: 'feed-forward' },
    {
      ...context.mechanism,
      model: { ...context.mechanism.model, modelId: 'other' },
    },
    { ...context.mechanism, sourceId: 'other-source' },
    { ...context.mechanism, activationHook: 'other.hook' },
    { ...context.mechanism, neuronIndex: 1 },
    { ...context.mechanism, timeStep: 8 },
  ].forEach(mechanism => {
    const domainCandidate =
      JSON.stringify(candidate.model) === JSON.stringify(mechanism.model)
        ? candidate
        : { ...candidate, model: mechanism.model };
    expectRefusal(
      domainCandidate,
      { ...context, mechanism },
      proposal,
      'unsupported-design-domain'
    );
  });

  const recordItems = context.items.filter(item => item.itemType === 'record');
  const withRecords = records => ({
    ...context,
    items: [
      ...context.items.filter(item => item.itemType !== 'record'),
      ...records.map(record => ({
        id: record.id,
        itemType: 'record',
        record,
      })),
    ],
    totalItems:
      context.items.filter(item => item.itemType !== 'record').length +
      records.length,
  });
  const hypothesis = recordItems.find(
    item => item.record?.id === 'hypothesis-investigator-a'
  ).record;
  expectRefusal(
    candidate,
    withRecords(
      recordItems
        .map(item => item.record)
        .filter(record => record !== hypothesis)
    ),
    proposal,
    'insufficient-hypothesis-context'
  );
  expectRefusal(
    candidate,
    withRecords(
      recordItems.map(item =>
        item.record === hypothesis
          ? { ...hypothesis, claim: 'A threshold claim without a number.' }
          : item.record
      )
    ),
    proposal,
    'insufficient-hypothesis-context'
  );
  expectRefusal(
    candidate,
    withRecords(
      recordItems.map(item =>
        item.record === hypothesis
          ? { ...hypothesis, claim: `Activation exceeds ${'9'.repeat(400)}.` }
          : item.record
      )
    ),
    proposal,
    'insufficient-hypothesis-context'
  );
  expectRefusal(
    candidate,
    withRecords(
      recordItems.map(item =>
        item.record?.id === 'evidence-investigator-a'
          ? { ...item.record, kind: 'negative' }
          : item.record
      )
    ),
    proposal,
    'insufficient-observed-evidence'
  );

  const records = recordItems.map(item => item.record);
  const firstExperiment = records.find(
    record => record.id === 'experiment-investigator-a'
  );
  const observationOnlyWithZeroSeed = withRecords(
    records.map(record =>
      record === firstExperiment ? { ...firstExperiment, seed: 0 } : record
    )
  );
  const replication = proposeAlgZooEvidenceSensitiveExperimentDesignV1(
    candidate,
    observationOnlyWithZeroSeed,
    proposal
  );
  expect(replication.valid).toBe(true);
  if (replication.valid) {
    expect(replication.design.test.inputSelection).toContain('seed 1');
    expect(replication.design).not.toHaveProperty('agentId');
  }

  const duplicateHypothesis = {
    ...hypothesis,
    id: 'hypothesis-investigator-z',
  };
  const secondExperiment = {
    ...firstExperiment,
    id: 'experiment-investigator-b',
    seed: 2,
  };
  const attributedCounterexample = {
    schemaVersion: 1,
    id: 'evidence-investigator-b',
    kind: 'negative',
    summary: 'The related follow-up evidence challenges the prior threshold.',
    hypothesisIds: [hypothesis.id],
    experimentIds: [secondExperiment.id],
    validationState: 'unreviewed',
    artifactSha256: 'b'.repeat(64),
    authorId: 'investigator-b',
    createdAt,
  };
  const multiHypothesisAndCounterexample = withRecords([
    ...records,
    duplicateHypothesis,
    secondExperiment,
    attributedCounterexample,
  ]);
  const contrast = proposeAlgZooEvidenceSensitiveExperimentDesignV1(
    candidate,
    multiHypothesisAndCounterexample,
    { ...proposal, agentId: 'atlas-researcher' }
  );
  expect(contrast.valid).toBe(true);
  if (contrast.valid) {
    expect(contrast.design.citations).toContainEqual(
      expect.objectContaining({
        targetId: attributedCounterexample.id,
        relation: 'challenges',
      })
    );
    expect(contrast.design.agentId).toBe('atlas-researcher');
  }
}

/**
 * Build the first investigator's falsifiable hypothesis and replay records.
 * @param {number} activation Deterministic fixture activation.
 * @param {string} inputSequenceId SHA-256 identity for the exact input sequence.
 * @returns {Record<string, any>} Initial evidence graph.
 */
function createFirstInvestigation(activation, inputSequenceId) {
  const mechanism = {
    schemaVersion: 1,
    id: 'legacy-algzoo-neuron-0-step-9',
    model,
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    kind: 'recurrent-state',
    sourceId: 'alg-zoo-m16-10',
    neuronIndex: 0,
    timeStep: 9,
  };
  const hypothesis = {
    schemaVersion: 1,
    id: 'hypothesis-investigator-a',
    revision: 1,
    claim:
      'Neuron 0 at recurrent step 9 exceeds 2.0 for the pinned deterministic input.',
    status: 'proposed',
    mechanismIds: [mechanism.id],
    evidenceIds: ['evidence-investigator-a'],
    authorId: 'investigator-a',
    createdAt,
  };
  const experiment = {
    schemaVersion: 1,
    id: 'experiment-investigator-a',
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    procedure: {
      repository: 'https://github.com/MattHeard/dadeto',
      revision: '4a4263fdb8e8003bd83cdf61ff2afcf45e4364bd',
      path: 'src/core/interpretability/algZooReplay.js',
    },
    seed: FIRST_INPUT_SEED,
    inputSplitId: 'algzoo-m16-10-normal-sequence-v1',
    runtime: {
      implementation: 'float32-js-replay',
      fixtureRevision: fixture.source.revision,
      inputGenerator:
        'createAlgZooNormalSequence@3d3093e218ec878e6d4fdaaa29219e72870673d7',
    },
    predictions: [
      {
        target: 'neuron-0-at-step-9',
        expected: 'activation greater than 2.0',
      },
    ],
    observations: [
      {
        kind: 'observed',
        summary: `Replay activation was ${activation}.`,
      },
    ],
    authorId: 'investigator-a',
    createdAt,
  };
  const evidence = {
    schemaVersion: 1,
    id: 'evidence-investigator-a',
    kind: 'observation',
    summary: `Pinned replay measured activation ${activation}.`,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    experimentIds: [experiment.id],
    validationState: 'unreviewed',
    artifactSha256: inputSequenceId.slice('sha256:'.length),
    authorId: 'investigator-a',
    createdAt,
  };
  return {
    mechanisms: [mechanism],
    hypotheses: [hypothesis],
    experiments: [experiment],
    estimates: [],
    evidence: [evidence],
    edges: [
      {
        schemaVersion: 1,
        id: 'edge-mechanism-to-hypothesis',
        fromId: mechanism.id,
        toId: hypothesis.id,
        relation: 'connected-to',
        authorId: 'investigator-a',
        createdAt,
      },
      {
        schemaVersion: 1,
        id: 'edge-hypothesis-to-evidence',
        fromId: hypothesis.id,
        toId: evidence.id,
        relation: 'supports',
        authorId: 'investigator-a',
        createdAt,
      },
      {
        schemaVersion: 1,
        id: 'edge-experiment-to-hypothesis',
        fromId: experiment.id,
        toId: hypothesis.id,
        relation: 'depends-on',
        authorId: 'investigator-a',
        createdAt,
      },
      {
        schemaVersion: 1,
        id: 'edge-experiment-to-evidence',
        fromId: experiment.id,
        toId: evidence.id,
        relation: 'supports',
        authorId: 'investigator-a',
        createdAt,
      },
    ],
  };
}

/**
 * Build a portable identity graph for the first input-specific measurement.
 * @param {number} activation Pinned activation value.
 * @param {string} inputSequenceId SHA-256 identity for the exact input sequence.
 * @returns {Record<string, any>} V2 identity graph.
 */
function createFirstIdentityGraph(activation, inputSequenceId) {
  const component = createRecurrentNeuronComponentV2(model, 'alg-zoo-m16-10', {
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    neuronIndex: 0,
  });
  const position = createRecurrentActivationPositionV2({
    componentId: component.id,
    timeStepIndex: 9,
  });
  return {
    components: [component],
    activationPositions: [position],
    observations: [
      createActivationObservationV2(position.id, 'experiment-investigator-a', {
        inputSequenceId,
        runId: 'algzoo-replay-a',
        value: activation,
        numericPrecision: 'float32',
      }),
    ],
    structuralConnections: [],
    circuitSnapshots: [],
  };
}

/**
 * Create investigator B records from the retrieved hypothesis.
 * @param {Record<string, any>} priorHypothesis Retrieved V1 hypothesis.
 * @returns {Record<string, any>} Follow-up activation, experiment, and evidence.
 */
function createFollowUpRecords(priorHypothesis) {
  const secondActivation = calculateAlgZooM16x10Activation(
    secondInput,
    fixture,
    0,
    9
  );
  const secondExperiment = {
    schemaVersion: 1,
    id: 'experiment-investigator-b',
    status: 'completed',
    model,
    mechanismIds: ['legacy-algzoo-neuron-0-step-9'],
    hypothesisIds: [priorHypothesis.id],
    procedure: {
      repository: 'https://github.com/MattHeard/dadeto',
      revision: '4a4263fdb8e8003bd83cdf61ff2afcf45e4364bd',
      path: 'src/core/interpretability/algZooReplay.js',
    },
    seed: SECOND_INPUT_SEED,
    inputSplitId: 'algzoo-m16-10-normal-sequence-v1',
    runtime: {
      implementation: 'float32-js-replay',
      fixtureRevision: fixture.source.revision,
      inputGenerator:
        'createAlgZooNormalSequence@3d3093e218ec878e6d4fdaaa29219e72870673d7',
    },
    predictions: [
      {
        target: 'neuron-0-at-step-9-on-follow-up-sequence',
        expected: `Recheck the retrieved claim: ${priorHypothesis.record.claim}`,
      },
    ],
    observations: [
      {
        kind: 'negative',
        summary: `Follow-up replay activation ${secondActivation} did not support the retrieved threshold claim.`,
      },
    ],
    authorId: 'investigator-b',
    createdAt: '2026-10-20T14:05:00Z',
  };
  const secondEvidence = {
    schemaVersion: 1,
    id: 'evidence-investigator-b',
    kind: 'negative',
    summary: `Independent follow-up measured activation ${secondActivation}, below the retrieved claim's threshold.`,
    mechanismIds: ['legacy-algzoo-neuron-0-step-9'],
    hypothesisIds: [priorHypothesis.id],
    experimentIds: [secondExperiment.id],
    validationState: 'unreviewed',
    artifactSha256: secondInputSequenceId.slice('sha256:'.length),
    authorId: 'investigator-b',
    createdAt: '2026-10-20T14:05:00Z',
  };
  return {
    secondActivation,
    experiment: secondExperiment,
    evidence: secondEvidence,
  };
}

/**
 * Assert that both investigators' records survive the portable round trip.
 * @param {Record<string, any>} args Imported graph, source records, and replay values.
 * @returns {void} No value.
 */
function expectInvestigatorRoundTrip({
  firstGraph,
  secondBundle,
  firstGraphSnapshot,
  identityLink,
  priorEvidence,
  secondEvidence,
  firstActivation,
  secondActivation,
  firstInputSequenceId,
  secondInputSequenceId,
}) {
  const graph = secondBundle.evidenceGraph;
  expect(firstActivation).toBe(7.94233512878418);
  expect(firstActivation).toBeGreaterThan(2);
  expect(secondActivation).toBe(0);
  expect(secondActivation).toBeLessThan(2);
  expect(JSON.stringify(firstGraph)).toBe(firstGraphSnapshot);
  expect(graph.evidence.find(record => record.id === priorEvidence.id)).toEqual(
    priorEvidence
  );
  expect(graph.experiments.map(record => record.id)).toEqual([
    'experiment-investigator-a',
    'experiment-investigator-b',
  ]);
  expect(graph.evidence.map(record => record.id)).toEqual([
    'evidence-investigator-a',
    'evidence-investigator-b',
  ]);
  expect(graph.edges).toContainEqual(
    expect.objectContaining({
      id: 'edge-investigator-b-depends-on-a',
      fromId: 'experiment-investigator-b',
      toId: priorEvidence.id,
      relation: 'depends-on',
    })
  );
  expect(graph.edges).toContainEqual(
    expect.objectContaining({
      id: 'edge-investigator-b-contradicts-a',
      fromId: 'evidence-investigator-b',
      toId: 'hypothesis-investigator-a',
      relation: 'contradicts',
      authorId: 'investigator-b',
    })
  );
  expect(
    graph.experiments.find(record => record.id === 'experiment-investigator-b')
      ?.observations
  ).toContainEqual(
    expect.objectContaining({
      kind: 'negative',
      summary:
        'Follow-up replay activation 0 did not support the retrieved threshold claim.',
    })
  );
  expect(
    graph.evidence.find(record => record.id === 'evidence-investigator-b')
  ).toEqual(secondEvidence);
  expect(secondBundle.identityGraph.observations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        experimentId: 'experiment-investigator-a',
        inputSequenceId: firstInputSequenceId,
        value: firstActivation,
      }),
      expect.objectContaining({
        experimentId: 'experiment-investigator-b',
        activationPositionId: identityLink.activationPositionId,
        inputSequenceId: secondInputSequenceId,
        value: secondActivation,
      }),
    ])
  );
  expect(secondBundle.mechanismIdentityLinks).toContainEqual(identityLink);
  expect(graph.hypotheses[0].mechanismIds).toEqual([
    'legacy-algzoo-neuron-0-step-9',
  ]);
}

describe('offline AlgZoo evidence-reuse software fixture', () => {
  it('lets a second investigator retrieve, extend, and round-trip a replay record', async () => {
    const firstActivation = calculateAlgZooM16x10Activation(
      firstInput,
      fixture,
      0,
      9
    );
    expect(
      calculateAlgZooM16x10Activation([...firstInput], fixture, 0, 9)
    ).toBe(firstActivation);
    const firstBundle = {
      evidenceGraph: createFirstInvestigation(
        firstActivation,
        firstInputSequenceId
      ),
      identityGraph: createFirstIdentityGraph(
        firstActivation,
        firstInputSequenceId
      ),
    };
    const firstExport = exportInterpretabilityResearchBundleV3(
      firstBundle,
      bundleSchemas
    );
    expect(firstExport.valid).toBe(true);
    if (!firstExport.valid) return;

    const firstImport = importInterpretabilityResearchBundleV2(
      firstExport.json,
      bundleSchemas
    );
    expect(firstImport.valid).toBe(true);
    if (!firstImport.valid) return;

    const firstGraphSnapshot = JSON.stringify(firstImport.bundle.evidenceGraph);
    const context = getEvidenceGraphContextV1(
      firstImport.bundle.evidenceGraph,
      {
        mechanismId: 'legacy-algzoo-neuron-0-step-9',
        maxDepth: 2,
        pageSize: 10,
      }
    );
    expect(context.valid).toBe(true);
    if (!context.valid) return;
    expect(context.items.map(item => item.id)).toEqual(
      expect.arrayContaining([
        'hypothesis-investigator-a',
        'experiment-investigator-a',
        'evidence-investigator-a',
      ])
    );
    expect(context.items).toHaveLength(context.totalItems);
    const priorHypothesis = context.items.find(
      item => item.id === 'hypothesis-investigator-a'
    );
    const priorEvidence = context.items.find(
      item => item.id === 'evidence-investigator-a'
    );
    expect(priorHypothesis?.record.authorId).toBe('investigator-a');
    expect(priorEvidence?.record.authorId).toBe('investigator-a');
    if (!priorHypothesis || !priorEvidence) return;

    const identityLink = firstImport.bundle.mechanismIdentityLinks.find(
      link => link.legacyMechanismId === 'legacy-algzoo-neuron-0-step-9'
    );
    expect(identityLink).toBeDefined();
    if (!identityLink) return;
    expect(firstImport.bundle.identityGraph.activationPositions).toContainEqual(
      expect.objectContaining({
        id: identityLink.activationPositionId,
        componentId: identityLink.componentId,
        timeStepIndex: 9,
      })
    );

    const {
      secondActivation,
      experiment: secondExperiment,
      evidence: secondEvidence,
    } = createFollowUpRecords(priorHypothesis);
    const appended = appendExperimentSubmissionV1(
      firstImport.bundle.evidenceGraph,
      {
        experiment: secondExperiment,
        evidence: [secondEvidence],
        edges: [
          {
            schemaVersion: 1,
            id: 'edge-investigator-b-depends-on-a',
            fromId: secondExperiment.id,
            toId: priorEvidence.id,
            relation: 'depends-on',
            authorId: 'investigator-b',
            createdAt: '2026-10-20T14:05:00Z',
          },
          {
            schemaVersion: 1,
            id: 'edge-investigator-b-to-own-evidence',
            fromId: secondExperiment.id,
            toId: secondEvidence.id,
            relation: 'supports',
            authorId: 'investigator-b',
            createdAt: '2026-10-20T14:05:00Z',
          },
          {
            schemaVersion: 1,
            id: 'edge-investigator-b-contradicts-a',
            fromId: secondEvidence.id,
            toId: priorHypothesis.id,
            relation: 'contradicts',
            authorId: 'investigator-b',
            createdAt: '2026-10-20T14:05:00Z',
          },
        ],
      },
      evidenceSchemas
    );
    expect(appended.valid).toBe(true);
    if (!appended.valid) return;

    const secondObservation = createActivationObservationV2(
      identityLink.activationPositionId,
      secondExperiment.id,
      {
        inputSequenceId: secondInputSequenceId,
        runId: 'algzoo-replay-b',
        value: secondActivation,
        numericPrecision: 'float32',
      }
    );
    const secondBundle = {
      evidenceGraph: appended.graph,
      identityGraph: {
        ...firstImport.bundle.identityGraph,
        observations: [
          ...firstImport.bundle.identityGraph.observations,
          secondObservation,
        ],
      },
    };
    const secondExport = exportInterpretabilityResearchBundleV3(
      secondBundle,
      bundleSchemas
    );
    expect(secondExport.valid).toBe(true);
    if (!secondExport.valid) return;

    const secondImport = importInterpretabilityResearchBundleV2(
      secondExport.json,
      bundleSchemas
    );
    expect(secondImport.valid).toBe(true);
    if (!secondImport.valid) return;

    expectInvestigatorRoundTrip({
      firstGraph: firstImport.bundle.evidenceGraph,
      secondBundle: secondImport.bundle,
      firstGraphSnapshot,
      identityLink,
      priorEvidence: priorEvidence.record,
      secondEvidence,
      firstActivation,
      secondActivation,
      firstInputSequenceId,
      secondInputSequenceId,
    });

    await expectEvidenceSensitiveDesigns(
      firstImport.bundle,
      secondImport.bundle
    );
    await expectProposalValidationRefusals(firstImport.bundle);

    await expectConcurrentAtlasJourneys(secondExport.json, bundleSchemas);
    await expectAtlasJourneyCoreBranches(
      secondImport.bundle,
      secondExport.json,
      bundleSchemas
    );
  });
});

/**
 * Exercise bounded journey outcomes and CLI argument parsing with injected services.
 * @param {Record<string, any>} bundle Valid portable research bundle.
 * @param {string} bundleJson Valid portable research bundle JSON.
 * @param {object} schemas Injected test schemas.
 * @returns {Promise<void>} Resolves after all deterministic refusal paths.
 */
async function expectAtlasJourneyCoreBranches(bundle, bundleJson, schemas) {
  await expectAtlasJourneyArgumentBranches();
  await expectAtlasJourneyServiceBranches(bundle);
  await expectAtlasJourneyCliBranches(bundleJson, schemas);
  await expectAtlasJourneyStorageBranches(bundle, bundleJson, schemas);
}

/** Verify the CLI argument parser accepts documented options and rejects bad arguments. */
function expectAtlasJourneyArgumentBranches() {
  const parsed = parseAtlasResearchJourneyArgs([
    '--bundle',
    'research.json',
    '--author-id',
    'researcher',
    '--design-id',
    'design-explicit',
    '--agent-id',
    'agent-explicit',
    '--created-at',
    '2026-10-25T04:00:00Z',
  ]);
  expect(parsed).toMatchObject({
    valid: true,
    options: { ['design_id']: 'design-explicit' },
  });
  expect(parseAtlasResearchJourneyArgs(['--unknown', 'value'])).toMatchObject({
    valid: false,
    errors: [{ code: 'unknown-option' }],
  });
  expect(parseAtlasResearchJourneyArgs(['--bundle'])).toMatchObject({
    valid: false,
    errors: [{ code: 'option-value-required' }],
  });
  expect(
    parseAtlasResearchJourneyArgs(['--bundle', 'a', '--bundle', 'b'])
  ).toMatchObject({ valid: false, errors: [{ code: 'duplicate-option' }] });
  expect(parseAtlasResearchJourneyArgs(['--bundle', 'a'])).toMatchObject({
    valid: false,
    errors: [{ code: 'bundle-and-author-required' }],
  });
}

/**
 * Verify CLI defaults, invalid input, and effect-bound failures.
 * @param {string} bundleJson Valid portable research bundle JSON.
 * @param {object} schemas Injected test schemas.
 */
async function expectAtlasJourneyCliBranches(bundleJson, schemas) {
  const proposal = { createdAt: '2026-10-25T04:00:00Z' };
  const arguments_ = ['--bundle', 'research.json', '--author-id', 'researcher'];
  const cliMissingSchemas = await runAtlasResearchJourneyCli(arguments_);
  expect(cliMissingSchemas).toMatchObject({
    exitCode: 2,
    result: { errors: [{ code: 'schemas-required' }] },
  });
  expect(
    await runAtlasResearchJourneyCli(['--unknown', 'value'], { schemas })
  ).toMatchObject({
    exitCode: 2,
    result: { errors: [{ code: 'unknown-option' }] },
  });
  expect(
    await runAtlasResearchJourneyCore(['--unknown', 'value'])
  ).toMatchObject({
    exitCode: 2,
    result: { errors: [{ code: 'unknown-option' }] },
  });
  const cliJourney = await runAtlasResearchJourneyCli(arguments_, {
    schemas,
    createStorage: () => ({
      loadBundle: async () => bundleJson,
      submitExperimentDesign: async () => ({ valid: true }),
    }),
    bindEffect: operation => operation({}),
    hashCanonicalSnapshot: value =>
      createHash('sha256').update(value).digest('hex'),
    nowIso: () => proposal.createdAt,
    randomId: () => 'default-random-design',
    readFileImpl: async () => bundleJson,
  });
  expect(cliJourney).toMatchObject({
    exitCode: 0,
    result: { valid: true, design: { id: 'default-random-design' } },
  });
  const cliInvalidBundle = await runAtlasResearchJourneyCli(arguments_, {
    schemas,
    createStorage: () => ({ loadBundle: async () => '{}' }),
    bindEffect: operation => operation({}),
  });
  expect(cliInvalidBundle.exitCode).toBe(1);
  const cliThrows = await runAtlasResearchJourneyCli(arguments_, {
    schemas,
    createStorage: () => ({ loadBundle: async () => '{}' }),
    bindEffect: async () => {
      throw new Error('effect binding failed');
    },
  });
  expect(cliThrows).toMatchObject({
    exitCode: 1,
    result: { errors: [{ code: 'atlas-journey-failed' }] },
  });
}

/**
 * Exercise the journey's successful, refused, capped, and inconsistent states.
 * @param {Record<string, any>} bundle Valid portable research bundle.
 */
async function expectAtlasJourneyServiceBranches(bundle) {
  const resolved = await resolveAlgZooDesignInput(bundle);
  const allowEffects = {};
  const proposal = {
    id: 'coverage-design',
    authorId: 'coverage-agent',
    createdAt: '2026-10-25T04:00:00Z',
  };
  const run = service =>
    runAtlasResearchJourneyV1(bundle, { allowEffects, service, proposal });
  const complete = resolved.context;
  const readable = {
    readContextSnapshot: async () => complete,
    submitExperimentDesign: async () => ({ valid: true }),
  };
  expect((await run(readable)).valid).toBe(true);
  expect(
    await run({
      readContextSnapshot: async () => ({
        ...complete,
        items: complete.items.slice(0, 1),
      }),
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({
    valid: false,
    errors: [{ code: 'no-evidence-sensitive-design' }],
  });
  expect(
    await run({
      readContextSnapshot: async () => ({
        valid: false,
        errors: [{ code: 'fixture-context-refused' }],
      }),
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'fixture-context-refused' }] });
  expect(
    await run({
      readContextSnapshot: async () => ({ valid: false, errors: [{}] }),
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-unavailable' }] });
  expect(
    await run({
      readContextSnapshot: async () => {
        throw new Error('read unavailable');
      },
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-read-failed' }] });
  expect(
    await run({
      readContextSnapshot: async () => ({
        ...complete,
        continuationCursor: 'more-context',
      }),
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-exceeds-journey-bound' }] });
  const firstPage = {
    ...complete,
    items: complete.items.slice(0, 1),
    nextCursor: 'next',
  };
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { ...complete, snapshotId: 'changed-snapshot' }
          : firstPage,
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-snapshot-incomplete' }] });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { ...complete, mechanism: { id: 'wrong-mechanism' } }
          : firstPage,
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-snapshot-incomplete' }] });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { ...complete, continuationCursor: 'capped' }
          : firstPage,
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-snapshot-incomplete' }] });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) => {
        if (!query.cursor) return firstPage;
        throw new Error('later page unavailable');
      },
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'context-read-failed' }] });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { valid: false, errors: [{ code: 'later-page-refused' }] }
          : firstPage,
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ attempts: [{ code: 'later-page-refused' }] });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { ...complete, items: complete.items.slice(1) }
          : firstPage,
      submitExperimentDesign: async () => ({ valid: true }),
    })
  ).toMatchObject({ valid: true });
  expect(
    await run({
      readContextSnapshot: async (_effects, query) =>
        query.cursor
          ? { ...complete, items: complete.items.slice(1) }
          : firstPage,
      submitExperimentDesign: async (_effects, design) => ({
        valid: design.id !== proposal.id,
        errors: [{ code: 'invalid-submission' }],
      }),
    })
  ).toMatchObject({ valid: false, errors: [{ code: 'invalid-submission' }] });
  expect(
    await run({
      readContextSnapshot: async () => complete,
      submitExperimentDesign: async () => {
        throw new Error('write unavailable');
      },
    })
  ).toMatchObject({ errors: [{ code: 'design-submission-failed' }] });
  expect(
    await runAtlasResearchJourneyV1(bundle, {
      allowEffects,
      service: readable,
      proposal: { ...proposal, id: '' },
    })
  ).toMatchObject({ attempts: [{ code: 'invalid-design-input' }] });
  expect(
    await runAtlasResearchJourneyV1(bundle, {
      allowEffects,
      service: {
        ...readable,
        proposeDesign: () => ({ valid: false, errors: [] }),
      },
      proposal,
    })
  ).toMatchObject({ attempts: [{ code: 'design-refused' }] });

  const noCandidate = {
    ...bundle,
    evidenceGraph: {
      ...bundle.evidenceGraph,
      mechanisms: [],
      hypotheses: [],
      experiments: [],
      evidence: [],
      edges: [],
    },
  };
  expect(
    await runAtlasResearchJourneyV1(noCandidate, {
      allowEffects,
      service: readable,
      proposal,
    })
  ).toMatchObject({ errors: [{ code: 'no-eligible-research-candidates' }] });

  const invalidDiscovery = await runAtlasResearchJourneyV1(null, {
    allowEffects,
    service: readable,
    proposal,
  });
  expect(invalidDiscovery.valid).toBe(false);

  const unresolvedIdentity = {
    ...bundle,
    identityGraph: {
      ...bundle.identityGraph,
      components: [],
      activationPositions: [],
      observations: [],
      structuralConnections: [],
      circuitSnapshots: [],
    },
    mechanismIdentityLinks: [],
  };
  const unresolved = await runAtlasResearchJourneyV1(unresolvedIdentity, {
    allowEffects,
    service: readable,
    proposal,
  });
  expect(unresolved.attempts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'unresolved-candidate-identity' }),
    ])
  );

  const incompletePages = {
    readContextSnapshot: async (_effects, query) =>
      query.cursor
        ? { ...complete, items: [], nextCursor: query.cursor }
        : { ...complete, items: [], totalItems: 0, nextCursor: 'page-1' },
    submitExperimentDesign: async () => ({ valid: true }),
  };
  expect(await run(incompletePages)).toMatchObject({
    attempts: [{ code: 'context-page-limit-exceeded' }],
  });
}

/**
 * Exercise atomic storage's validation, conflict, locking, and export paths.
 * @param {Record<string, any>} bundle Valid portable research bundle.
 * @param {string} bundleJson Valid portable research bundle JSON.
 * @param {object} schemas Injected test schemas.
 */
async function expectAtlasJourneyStorageBranches(bundle, bundleJson, schemas) {
  const scratchRoot = path.join(process.cwd(), '.tmp');
  await mkdir(scratchRoot, { recursive: true });
  const scratchDirectory = await mkdtemp(
    path.join(scratchRoot, 'atlas-storage-branches-')
  );
  try {
    const bundlePath = path.join(scratchDirectory, 'bundle.json');
    await writeFile(bundlePath, bundleJson, 'utf8');
    const storage = createAtomicAtlasResearchStorage({ bundlePath, schemas });
    await expect(storage.saveBundle({}, bundleJson)).rejects.toMatchObject({
      code: 'bundle-read-required',
    });

    const conflictToken = {};
    await storage.loadBundle(conflictToken);
    await writeFile(bundlePath, `${bundleJson}\n`, 'utf8');
    await expect(
      storage.saveBundle(conflictToken, bundleJson)
    ).rejects.toMatchObject({ code: 'bundle-write-conflict' });

    const invalidToken = {};
    await storage.loadBundle(invalidToken);
    await expect(
      storage.saveBundle(invalidToken, '{invalid json')
    ).rejects.toMatchObject({ code: 'invalid-research-bundle' });

    const validSaveToken = {};
    await storage.loadBundle(validSaveToken);
    await storage.saveBundle(validSaveToken, bundleJson);
    expect(await readFile(bundlePath, 'utf8')).toBe(bundleJson);

    const invalidCurrentPath = path.join(
      scratchDirectory,
      'invalid-current.json'
    );
    await writeFile(invalidCurrentPath, '{invalid json', 'utf8');
    const invalidCurrent = createAtomicAtlasResearchStorage({
      bundlePath: invalidCurrentPath,
      schemas,
    });
    expect(
      await invalidCurrent.submitExperimentDesign({}, { id: 'design' })
    ).toMatchObject({ valid: false });

    expect(await storage.submitExperimentDesign({}, {})).toMatchObject({
      valid: false,
    });
    const validDesign = await draftAlgZooDesign(bundle, 'storage-design');
    expect(validDesign.valid).toBe(true);
    if (!validDesign.valid) return;
    expect(
      (await storage.submitExperimentDesign({}, validDesign.design)).valid
    ).toBe(true);

    const exportFailurePath = path.join(
      scratchDirectory,
      'export-failure.json'
    );
    await writeFile(exportFailurePath, bundleJson, 'utf8');
    const exportFailureStorage = createAtomicAtlasResearchStorage({
      bundlePath: exportFailurePath,
      schemas,
      logic: {
        exportBundleV7: () => ({
          valid: false,
          errors: [{ code: 'fixture-export-refused' }],
        }),
      },
    });
    expect(
      await exportFailureStorage.submitExperimentDesign({}, validDesign.design)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'fixture-export-refused' }],
    });
    expect(await readFile(exportFailurePath, 'utf8')).toBe(bundleJson);

    const timeoutStorage = createAtomicAtlasResearchStorage({
      bundlePath,
      schemas,
      mkdirImpl: async (target, options) => {
        if (String(target).endsWith('.lock')) {
          throw Object.assign(new Error('lock exists'), { code: 'EEXIST' });
        }
        return mkdir(target, options);
      },
      nowImpl: (() => {
        let now = 0;
        return () => (now += 6000);
      })(),
      sleepImpl: async () => {},
    });
    await expect(
      timeoutStorage.submitExperimentDesign({}, validDesign.design)
    ).rejects.toMatchObject({ code: 'bundle-storage-lock-timeout' });

    const errorStorage = createAtomicAtlasResearchStorage({
      bundlePath,
      schemas,
      mkdirImpl: async (target, options) => {
        if (String(target).endsWith('.lock')) {
          throw Object.assign(new Error('permission denied'), {
            code: 'EACCES',
          });
        }
        return mkdir(target, options);
      },
    });
    await expect(
      errorStorage.submitExperimentDesign({}, validDesign.design)
    ).rejects.toMatchObject({ code: 'EACCES' });
  } finally {
    await rm(scratchDirectory, { recursive: true, force: true });
  }
}

/**
 * Persist two deterministic agent journeys concurrently and read back both.
 * @param {string} bundleJson Complete prior research bundle JSON.
 * @param {object} schemas Injected research schemas used at each CLI boundary.
 * @returns {Promise<void>} Resolves after both proposals are imported.
 */
async function expectConcurrentAtlasJourneys(bundleJson, schemas) {
  const scratchRoot = path.join(process.cwd(), '.tmp');
  await mkdir(scratchRoot, { recursive: true });
  const scratchDirectory = await mkdtemp(
    path.join(scratchRoot, 'atlas-research-journey-')
  );
  try {
    const bundlePath = path.join(scratchDirectory, 'research-bundle.json');
    await writeFile(bundlePath, bundleJson, 'utf8');
    const runJourney = (designId, authorId) =>
      runAtlasResearchJourneyCli(
        [
          '--bundle',
          bundlePath,
          '--author-id',
          authorId,
          '--design-id',
          designId,
          '--agent-id',
          `agent-${authorId}`,
          '--created-at',
          '2026-10-25T04:00:00.000Z',
        ],
        { schemas }
      );
    const [firstJourney, secondJourney] = await Promise.all([
      runJourney('journey-design-a', 'journey-agent-a'),
      runJourney('journey-design-b', 'journey-agent-b'),
    ]);
    expect(firstJourney.exitCode).toBe(0);
    expect(secondJourney.exitCode).toBe(0);
    expect(firstJourney.result).toMatchObject({
      valid: true,
      context: { snapshotId: expect.stringMatching(/^atlas:context:v1:/) },
      design: {
        status: 'proposed',
        executionStatus: 'untested',
        test: {
          inputSelection: expect.stringContaining('counterexample seed 2'),
        },
      },
    });
    expect(secondJourney.result.candidate).toEqual(
      firstJourney.result.candidate
    );
    const submitted = importInterpretabilityResearchBundleV7(
      await readFile(bundlePath, 'utf8'),
      schemas
    );
    expect(submitted.valid).toBe(true);
    if (submitted.valid) {
      expect(
        submitted.bundle.experimentDesigns.map(design => design.id)
      ).toEqual(
        expect.arrayContaining(['journey-design-a', 'journey-design-b'])
      );
    }
  } finally {
    await rm(scratchDirectory, { recursive: true, force: true });
  }
}
