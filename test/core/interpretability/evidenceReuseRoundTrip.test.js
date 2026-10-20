import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  appendExperimentSubmissionV1,
  createActivationObservationV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  exportInterpretabilityResearchBundleV3,
  getEvidenceGraphContextV1,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { calculateAlgZooM16x10Activation } from '../../../src/core/interpretability/algZooReplay.js';
import { createAlgZooNormalSequence } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
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
  it('lets a second investigator retrieve, extend, and round-trip a replay record', () => {
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
  });
});
