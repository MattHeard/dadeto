import {
  createActivationObservationV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  exportInterpretabilityResearchBundleV3,
} from '../interpretability/interpretability.js';
import { calculateAlgZooM16x10Activation } from '../interpretability/algZooReplay.js';
import { createAlgZooNormalSequence } from '../interpretability/algZooPilotHarness/index.js';

const HIDDEN_SIZE = 16;
const SEQUENCE_LENGTH = 10;
const INPUT_SEED = 17;
const REPLAY_EXPERIMENT_ID = 'algzoo-m16-10-replay-seed-17-v1';
const REPLAY_RUN_ID = 'algzoo-m16-10-float32-js-replay-v1';
const CREATED_AT = '2026-10-20T00:00:00Z';
const SOURCE_AUTHOR_ID = 'source:arc-algzoo-report-2026-01-26';
const SOURCE_URL =
  'https://www.alignment.org/blog/algzoo-uninterpreted-models-with-fewer-than-1-500-parameters/';
const REPLAY_REVISION = '4a4263fdb8e8003bd83cdf61ff2afcf45e4364bd';

/**
 * @typedef {object} PinnedFixture
 * @property {{id: string, architecture: string}} model Stable source model metadata.
 * @property {{repository: string, revision: string, checkpointSha256: string}} source Pinned source revision and checkpoint.
 * @property {{inputToHidden: {values: number[]}, recurrent: {values: number[]}}} parameters Replay tensor values.
 */

/**
 * @typedef {{id: string, neuronIndex: number}} NeuronComponent
 */

/**
 * @typedef {{id: string, componentId: string, timeStepIndex: number}} ActivationPosition
 */

const SOURCE_HYPOTHESES = Object.freeze([
  {
    neuronIndex: 2,
    id: 'arc-algzoo-m16-10-neuron-2-running-max',
    formula: 'max(0, x_0, ..., x_(t-2))',
  },
  {
    neuronIndex: 4,
    id: 'arc-algzoo-m16-10-neuron-4-running-max-increment',
    formula: 'max(0, x_0, ..., x_(t-1)) - max(0, x_0, ..., x_(t-2))',
  },
  {
    neuronIndex: 6,
    id: 'arc-algzoo-m16-10-neuron-6-leave-one-out-max',
    formula: 'max(0, x_0, ..., x_(t-3), x_(t-1)) - x_(t-1)',
  },
  {
    neuronIndex: 7,
    id: 'arc-algzoo-m16-10-neuron-7-running-max-minus-current',
    formula: 'max(0, x_0, ..., x_(t-1)) - x_(t-1)',
  },
  {
    neuronIndex: 1,
    id: 'arc-algzoo-m16-10-neuron-1-leave-one-out-max',
    formula: 'max(0, x_0, ..., x_(t-4), x_(t-2), x_(t-1)) - x_(t-1)',
  },
]);

/**
 * Create an injected builder for the pinned ARC-published AlgZoo seed map.
 * @param {{readFixture: () => PinnedFixture, hashSha256: (value: string) => string}} adapters Local file and digest capabilities.
 * @returns {(options: {z: any}) => string} Portable V3 JSON builder.
 */
export function createAlgZooPublishedSeedMapCore({ readFixture, hashSha256 }) {
  return function createAlgZooPublishedSeedMapV3({ z }) {
    const fixture = readFixture();
    const model = createPinnedModel(fixture);
    const evidenceGraphSchemasV1 = createInterpretabilitySchemasV1(z);
    const identityGraphSchemasV2 = createInterpretabilitySchemasV2(
      z,
      hashSha256
    );
    const input = createAlgZooNormalSequence(INPUT_SEED, SEQUENCE_LENGTH);
    const inputSequenceId = `sha256:${hashSha256(JSON.stringify(input))}`;
    const identityGraph = createIdentityGraph(
      fixture,
      input,
      inputSequenceId,
      model
    );
    const mechanisms = createLegacyMechanisms(fixture, model);
    const hypotheses = createPublishedHypotheses(mechanisms);
    const experiment = createReplayExperiment(
      fixture,
      inputSequenceId,
      mechanisms,
      identityGraph.observations.length
    );
    const evidenceGraph = {
      mechanisms,
      hypotheses,
      experiments: [experiment],
      estimates: [],
      evidence: [],
      edges: [],
    };
    return exportSeedMap(
      { evidenceGraphSchemasV1, identityGraphSchemasV2 },
      evidenceGraph,
      identityGraph
    );
  };
}

/**
 * @param {PinnedFixture} fixture Pinned source fixture.
 * @returns {Record<string, any>} V1 model.
 */
function createPinnedModel(fixture) {
  return {
    modelId: fixture.model.id,
    repository: fixture.source.repository,
    revision: fixture.source.revision,
    architecture: fixture.model.architecture,
  };
}

/**
 * @param {PinnedFixture} fixture Pinned source fixture.
 * @param {number[]} input Deterministic input sequence.
 * @param {string} inputSequenceId Stable input identity.
 * @param {Record<string, any>} model Pinned replay model metadata.
 * @returns {Record<string, any>} V2 identity graph.
 */
function createIdentityGraph(fixture, input, inputSequenceId, model) {
  const components = createComponents(model, fixture.model.id);
  const activationPositions = createActivationPositions(components);
  const observations = createReplayObservations(
    { fixture, input, inputSequenceId },
    components,
    activationPositions
  );
  return {
    components,
    activationPositions,
    observations,
    structuralConnections: [],
    circuitSnapshots: [],
  };
}

/**
 * @param {Record<string, any>} model Pinned model metadata.
 * @param {string} sourceId Fixture model namespace.
 * @returns {Array<NeuronComponent>} Sixteen stable neuron components.
 */
function createComponents(model, sourceId) {
  return Array.from({ length: HIDDEN_SIZE }, (_, neuronIndex) => {
    const component = createRecurrentNeuronComponentV2(model, sourceId, {
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      neuronIndex,
    });
    return /** @type {NeuronComponent} */ (component);
  });
}

/**
 * @param {Array<Record<string, any>>} components Stable neuron components.
 * @returns {Array<ActivationPosition>} Ten positions per component.
 */
function createActivationPositions(components) {
  return components.flatMap(component =>
    Array.from({ length: SEQUENCE_LENGTH }, (_, timeStepIndex) => {
      const position = createRecurrentActivationPositionV2({
        componentId: component.id,
        timeStepIndex,
      });
      return /** @type {ActivationPosition} */ (position);
    })
  );
}

/**
 * @param {{fixture: PinnedFixture, input: number[], inputSequenceId: string}} replay Pinned replay input.
 * @param {Array<NeuronComponent>} components Stable neuron components.
 * @param {Array<ActivationPosition>} activationPositions Recurrent observation positions.
 * @returns {Array<Record<string, any>>} Input- and run-specific activations.
 */
export function createReplayObservations(
  replay,
  components,
  activationPositions
) {
  const componentsById = new Map(
    components.map(component => [component.id, component])
  );
  return activationPositions.map(position => {
    const component = componentsById.get(position.componentId);
    if (!component) {
      throw new Error(`Unknown AlgZoo component: ${position.componentId}`);
    }
    return createActivationObservationV2(position.id, REPLAY_EXPERIMENT_ID, {
      inputSequenceId: replay.inputSequenceId,
      runId: REPLAY_RUN_ID,
      value: calculateAlgZooM16x10Activation(
        replay.input,
        replay.fixture,
        component.neuronIndex,
        position.timeStepIndex
      ),
      numericPrecision: 'float32',
    });
  });
}

/**
 * @param {PinnedFixture} fixture Pinned source fixture.
 * @param {Record<string, any>} model Pinned model metadata.
 * @returns {Array<Record<string, any>>} Timestep-specific V1 compatibility identities.
 */
function createLegacyMechanisms(fixture, model) {
  return Array.from({ length: HIDDEN_SIZE }, (_, neuronIndex) =>
    Array.from({ length: SEQUENCE_LENGTH }, (_, timeStep) => ({
      schemaVersion: 1,
      id: legacyMechanismId(fixture.model.id, neuronIndex, timeStep),
      model,
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      kind: 'recurrent-state',
      sourceId: fixture.model.id,
      neuronIndex,
      timeStep,
    }))
  ).flat();
}

/**
 * @param {Array<Record<string, any>>} mechanisms Legacy timestep identities.
 * @returns {Array<Record<string, any>>} Five cited ARC hypotheses.
 */
function createPublishedHypotheses(mechanisms) {
  const mechanismIds = mechanisms.map(mechanism => mechanism.id);
  return SOURCE_HYPOTHESES.map(({ neuronIndex, id, formula }) => ({
    schemaVersion: 1,
    id,
    revision: 1,
    claim: createAttributedClaim(neuronIndex, formula),
    status: 'proposed',
    mechanismIds: mechanismIds.filter(id =>
      id.includes(`/neuron-${neuronIndex}/`)
    ),
    evidenceIds: [],
    authorId: SOURCE_AUTHOR_ID,
    createdAt: '2026-01-26T00:00:00Z',
  }));
}

/**
 * @param {number} neuronIndex - Source-described neuron.
 * @param {string} formula - Approximate function proposed by ARC.
 * @returns {string} Attributed, caveated claim.
 */
function createAttributedClaim(neuronIndex, formula) {
  return [
    `ARC-published approximate hypothesis: at recurrence step t, neuron ${neuronIndex} approximates ${formula}.`,
    'Assumptions: ARC rescales hidden units and identifies the relevant subcircuit through approximate weight sparsity and approximate isolation.',
    'Uncertainty: the source does not quantify approximation error and states that it becomes increasingly significant for more complex neurons. This claim is proposed background, not an independently validated interpretation.',
    `Source: ${SOURCE_URL} ("Hidden size 16, sequence length 10").`,
  ].join(' ');
}

/**
 * @param {PinnedFixture} fixture Pinned source fixture.
 * @param {string} inputSequenceId Stable replay input identity.
 * @param {Array<Record<string, any>>} mechanisms Legacy timestep identities.
 * @param {number} observationCount Number of recorded activations.
 * @returns {Record<string, any>} Completed local replay record.
 */
function createReplayExperiment(
  fixture,
  inputSequenceId,
  mechanisms,
  observationCount
) {
  const model = createPinnedModel(fixture);
  return {
    schemaVersion: 1,
    id: REPLAY_EXPERIMENT_ID,
    status: 'completed',
    model,
    mechanismIds: mechanisms.map(mechanism => mechanism.id),
    hypothesisIds: [],
    procedure: {
      repository: 'https://github.com/MattHeard/dadeto',
      revision: REPLAY_REVISION,
      path: 'src/core/interpretability/algZooReplay.js',
    },
    seed: INPUT_SEED,
    inputSplitId: 'algzoo-m16-10-single-input-seed-17',
    runtime: {
      implementation: 'float32-js-replay',
      fixtureRevision: fixture.source.revision,
      checkpointSha256: fixture.source.checkpointSha256,
      inputGenerator: 'createAlgZooNormalSequence',
      sequenceLength: SEQUENCE_LENGTH,
      inputSequenceId,
    },
    predictions: [
      {
        target: 'pinned-hidden-state-replay',
        expected: 'one deterministic float32 activation per neuron and step',
      },
    ],
    observations: [
      {
        kind: 'observed',
        summary: `Captured all ${observationCount} neuron-step activations for input ${inputSequenceId} in run ${REPLAY_RUN_ID}.`,
      },
    ],
    authorId: 'fixture:dadeto-algzoo-replay',
    createdAt: CREATED_AT,
  };
}

/**
 * @param {string} modelId Stable model identity.
 * @param {number} neuronIndex - Unit index.
 * @param {number} timeStep - Recurrent step.
 * @returns {string} Legacy ID.
 */
function legacyMechanismId(modelId, neuronIndex, timeStep) {
  return `${modelId}/neuron-${neuronIndex}/step-${timeStep}`;
}

/**
 * @param {{evidenceGraphSchemasV1: any, identityGraphSchemasV2: any}} schemas - V1 and V2 validators.
 * @param {Record<string, any>} evidenceGraph - V1 claims and experiment provenance.
 * @param {Record<string, any>} identityGraph - V2 components and observations.
 * @returns {string} Deterministic V3 JSON.
 */
function exportSeedMap(schemas, evidenceGraph, identityGraph) {
  const exported = exportInterpretabilityResearchBundleV3(
    { evidenceGraph, identityGraph },
    schemas
  );
  if (!exported.valid) {
    throw new Error(
      `Could not export AlgZoo seed map: ${JSON.stringify(exported.errors)}`
    );
  }
  return exported.json;
}
