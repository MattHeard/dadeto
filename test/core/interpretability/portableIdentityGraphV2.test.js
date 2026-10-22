import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createActivationObservationV2,
  createCircuitStructuralSnapshotV2,
  createInterpretabilitySchemasV2,
  createNativeNeuronComponentV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  createStructuralConnectionV2,
  createTokenActivationPositionV2,
  exportInterpretabilityIdentityGraphV2,
  importInterpretabilityIdentityGraphV2,
  validateInterpretabilityIdentityGraphV2,
} from '../../../src/core/interpretability/interpretability.js';
import { calculateAlgZooM16x10Activation } from '../../../src/core/interpretability/algZooReplay.js';
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
const pythiaActivationArtifact = JSON.parse(
  readFileSync(
    new URL(
      '../../../notes/agents/pythia-14m-native-activation.json',
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
const input = [0.11, -0.23, 0.71, 0.18, 0.44, -0.52, 0.92, 0.31, 0.63, -0.07];
const hashCanonicalIdentity = identity =>
  createHash('sha256').update(identity, 'utf8').digest('hex');
const schemas = createInterpretabilitySchemasV2(
  createTestZod(),
  hashCanonicalIdentity
);
const identityGraphSchemaV2 = schemas.identityGraphSchemaV2;

/**
 * Assert the pinned Pythia artifact covers one contiguous native-neuron slice.
 * @param {Record<string, any>} artifact Recorded replay artifact.
 * @returns {number[]} Sorted native-neuron indices.
 */
function assertPythiaNativeNeuronIndexRange(artifact) {
  const components = artifact.activation.components;
  const neuronIndices = components
    .map(componentRecord => componentRecord.neuronIndex)
    .sort((left, right) => left - right);
  const identityConfigs = new Set(
    components.map(componentRecord =>
      JSON.stringify({
        modelId: componentRecord.model.modelId,
        revision: componentRecord.model.revision,
        layerIndex: componentRecord.layerIndex,
        activationHook: componentRecord.activationHook,
      })
    )
  );

  expect(neuronIndices).toEqual(
    Array.from({ length: 512 }, (_, index) => index)
  );
  expect(identityConfigs.size).toBe(1);
  expect(components[0]).toMatchObject({
    model: {
      modelId: 'EleutherAI/pythia-14m',
      revision: '94f7c35d5e9f2e9bac8ca839329f505b4d007d5d',
    },
    layerIndex: 0,
    activationHook:
      'gpt_neox.layers.0.mlp.dense_h_to_4h.output+configured-gelu',
  });
  expect(artifact.repeatability).toEqual({
    exactMatch: true,
    maximumAbsoluteDifference: 0,
  });
  return neuronIndices;
}

/**
 * Create one canonical AlgZoo recurrent-neuron record.
 * @param {number} neuronIndex Hidden neuron index.
 * @param {Record<string, any>} [componentModel] Pinned checkpoint metadata.
 * @returns {Record<string, any>} V2 component.
 */
function component(neuronIndex, componentModel = model) {
  return createRecurrentNeuronComponentV2(
    componentModel,
    'm16-10-second-argmax',
    {
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      neuronIndex,
    }
  );
}

/**
 * Create a representative graph containing every V2 identity record type.
 * @returns {Promise<Record<string, any>>} Valid graph.
 */
async function completeGraph() {
  const first = component(0);
  const second = component(1);
  const position = createRecurrentActivationPositionV2({
    componentId: first.id,
    timeStepIndex: 9,
  });
  const observation = createActivationObservationV2(
    position.id,
    'experiment-algzoo-1',
    {
      inputSequenceId: 'input-sequence-1',
      runId: 'run-1',
      value: calculateAlgZooM16x10Activation(input, fixture, 0, 9),
      numericPrecision: 'float32',
    }
  );
  const connection = createStructuralConnectionV2(model, first, second, {
    sourcePort: 'hidden-state',
    targetPort: 'hidden-state',
    kind: 'recurrent',
    recurrentLag: 1,
    tensorCoordinate: [0, 1],
  });
  const snapshot = await createCircuitStructuralSnapshotV2(
    'atlas:circuit:algzoo-pilot',
    model,
    {
      completeness: 'unknown',
      componentIds: [first.id, second.id],
      connectionIds: [connection.id],
      boundaryComponentIds: [first.id],
    },
    hashCanonicalIdentity
  );
  return {
    components: [first, second],
    activationPositions: [position],
    observations: [observation],
    structuralConnections: [connection],
    circuitSnapshots: [snapshot],
  };
}

describe('portable V2 interpretability identity graph', () => {
  it('round-trips the Pythia native-neuron token activation artifact', () => {
    const sourceNeuronIndices = assertPythiaNativeNeuronIndexRange(
      pythiaActivationArtifact
    );
    const sourceComponents = pythiaActivationArtifact.activation.components;
    const componentsBySourceId = new Map(
      sourceComponents.map(sourceComponent => [
        sourceComponent.id,
        createNativeNeuronComponentV2(
          sourceComponent.model,
          sourceComponent.sourceId,
          {
            layerIndex: sourceComponent.layerIndex,
            activationHook: sourceComponent.activationHook,
            neuronIndex: sourceComponent.neuronIndex,
          }
        ),
      ])
    );
    const sourcePositions = pythiaActivationArtifact.activation.positions;
    const positionsBySourceId = new Map(
      sourcePositions.map(sourcePosition => {
        const componentRecord = componentsBySourceId.get(
          sourcePosition.componentId
        );
        return [
          sourcePosition.id,
          createTokenActivationPositionV2({
            componentId: componentRecord.id,
            tokenPositionIndex: sourcePosition.tokenPositionIndex,
          }),
        ];
      })
    );
    const observations = pythiaActivationArtifact.activation.observations.map(
      sourceObservation => {
        const position = positionsBySourceId.get(
          sourceObservation.activationPositionId
        );
        return createActivationObservationV2(
          position.id,
          sourceObservation.experimentId,
          {
            inputSequenceId: sourceObservation.inputSequenceId,
            runId: sourceObservation.runId,
            value: sourceObservation.value,
            numericPrecision: sourceObservation.numericPrecision,
            tokenId: sourceObservation.tokenId,
          }
        );
      }
    );
    const graph = {
      components: [...componentsBySourceId.values()],
      activationPositions: [...positionsBySourceId.values()],
      observations,
      structuralConnections: [],
      circuitSnapshots: [],
    };
    const validated = validateInterpretabilityIdentityGraphV2(
      graph,
      identityGraphSchemaV2
    );
    const exported = exportInterpretabilityIdentityGraphV2(
      graph,
      identityGraphSchemaV2
    );
    const imported = importInterpretabilityIdentityGraphV2(
      exported.json,
      identityGraphSchemaV2
    );

    expect(pythiaActivationArtifact.model.revision).toBe(
      '94f7c35d5e9f2e9bac8ca839329f505b4d007d5d'
    );
    expect(validated.valid).toBe(true);
    expect(exported.valid).toBe(true);
    expect(imported.valid).toBe(true);
    expect(imported.graph.components).toHaveLength(512);
    expect(imported.graph.activationPositions).toHaveLength(512);
    expect(imported.graph.observations).toHaveLength(1024);
    expect(new Set(imported.graph.components.map(entry => entry.id)).size).toBe(
      512
    );
    expect(
      imported.graph.components
        .map(component => component.neuronIndex)
        .sort((left, right) => left - right)
    ).toEqual(sourceNeuronIndices);
    expect(
      new Set(imported.graph.activationPositions.map(entry => entry.id)).size
    ).toBe(512);
    expect(
      new Set(imported.graph.observations.map(entry => entry.id)).size
    ).toBe(1024);
    expect(
      imported.graph.observations.every(observation =>
        imported.graph.activationPositions.some(
          position => position.id === observation.activationPositionId
        )
      )
    ).toBe(true);
    expect(imported.graph.observations[0]).toHaveProperty('tokenId');
    expect(imported.graph).toEqual(validated.graph);
  });

  it('round-trips all 16 AlgZoo components and 160 activation positions and observations', async () => {
    const components = Array.from({ length: 16 }, (_, neuronIndex) =>
      component(neuronIndex)
    );
    const activationPositions = components.flatMap(neuron =>
      Array.from({ length: 10 }, (_, timeStepIndex) =>
        createRecurrentActivationPositionV2({
          componentId: neuron.id,
          timeStepIndex,
        })
      )
    );
    const observations = activationPositions.map(position => {
      const neuronIndex = components.find(
        entry => entry.id === position.componentId
      ).neuronIndex;
      return createActivationObservationV2(
        position.id,
        'experiment-algzoo-replay-1',
        {
          inputSequenceId: 'gaussian-sequence-1',
          runId: 'replay-run-1',
          value: calculateAlgZooM16x10Activation(
            input,
            fixture,
            neuronIndex,
            position.timeStepIndex
          ),
          numericPrecision: 'float32',
        }
      );
    });
    const graph = {
      components,
      activationPositions,
      observations,
      structuralConnections: [],
      circuitSnapshots: [],
    };

    const exported = await exportInterpretabilityIdentityGraphV2(
      graph,
      identityGraphSchemaV2
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const imported = await importInterpretabilityIdentityGraphV2(
      exported.json,
      identityGraphSchemaV2
    );

    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.graph.components).toHaveLength(16);
    expect(imported.graph.activationPositions).toHaveLength(160);
    expect(imported.graph.observations).toHaveLength(160);
    expect(
      new Set(imported.graph.components.map(entry => entry.neuronIndex)).size
    ).toBe(16);
    expect(
      new Set(imported.graph.activationPositions.map(entry => entry.id)).size
    ).toBe(160);
    expect(
      imported.graph.observations.every(observation =>
        imported.graph.activationPositions.some(
          position => position.id === observation.activationPositionId
        )
      )
    ).toBe(true);
    expect(imported.graph.observations[0].numericPrecision).toBe('float32');
    expect(imported.graph.observations[0].value).toEqual(expect.any(Number));
  });

  it('sorts every collection for deterministic export and reconstructs connection and circuit references', async () => {
    const graph = await completeGraph();
    const first = await exportInterpretabilityIdentityGraphV2(
      graph,
      identityGraphSchemaV2
    );
    const reversed = Object.fromEntries(
      Object.entries(graph).map(([key, values]) => [key, [...values].reverse()])
    );
    const second = await exportInterpretabilityIdentityGraphV2(
      reversed,
      identityGraphSchemaV2
    );

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(second.json).toBe(first.json);
    const imported = await importInterpretabilityIdentityGraphV2(
      first.json,
      identityGraphSchemaV2
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect({ ...imported.graph, schemaVersion: 2 }).toEqual(
      JSON.parse(first.json)
    );
  });

  it('rejects malformed envelopes and noncanonical identity records with stable errors', async () => {
    expect(
      await importInterpretabilityIdentityGraphV2(null, identityGraphSchemaV2)
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2('{', identityGraphSchemaV2)
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2('[]', identityGraphSchemaV2)
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2(
        '{"schemaVersion":1}',
        identityGraphSchemaV2
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2(
        JSON.stringify({ schemaVersion: 2, extra: [] }),
        identityGraphSchemaV2
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2(
        JSON.stringify({ schemaVersion: 2 }),
        identityGraphSchemaV2
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    expect(
      await importInterpretabilityIdentityGraphV2(
        JSON.stringify({ schemaVersion: 2 }),
        undefined
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'missing-schema-validator' }],
    });

    const invalidExport = await exportInterpretabilityIdentityGraphV2(
      { components: 'invalid' },
      identityGraphSchemaV2
    );
    expect(invalidExport).toEqual({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });

    expect(
      await validateInterpretabilityIdentityGraphV2(
        { components: [component(0)] },
        undefined
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-schema-validator' }],
    });
    expect(
      await validateInterpretabilityIdentityGraphV2(
        { components: 'invalid' },
        identityGraphSchemaV2
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    expect(
      await validateInterpretabilityIdentityGraphV2(
        { components: [{ ...component(0), id: 'atlas:v2:component:forged' }] },
        identityGraphSchemaV2
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
  });

  it('rejects duplicate IDs and every unresolved identity reference', async () => {
    const graph = await completeGraph();
    const missingPosition = createRecurrentActivationPositionV2({
      componentId: 'atlas:v2:component:missing',
      timeStepIndex: 0,
    });
    const missingObservation = createActivationObservationV2(
      'atlas:v2:position:missing',
      'experiment-algzoo-1',
      {
        inputSequenceId: 'input-sequence-1',
        runId: 'run-1',
        value: 0.5,
        numericPrecision: 'float32',
      }
    );
    const invalidGraph = {
      ...graph,
      components: [...graph.components, graph.components[0]],
      activationPositions: [...graph.activationPositions, missingPosition],
      observations: [...graph.observations, missingObservation],
    };
    const result = await validateInterpretabilityIdentityGraphV2(
      invalidGraph,
      identityGraphSchemaV2
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([{ code: 'invalid-identity-graph' }]);
  });

  it('rejects connections that point to mismatched component coordinates or checkpoints', async () => {
    const graph = await completeGraph();
    const [first, second] = graph.components;
    const wrongCoordinateSource = {
      ...first,
      coordinateId: 'atlas:v2:component-coordinate:wrong',
    };
    const wrongCoordinate = createStructuralConnectionV2(
      model,
      wrongCoordinateSource,
      second,
      {
        sourcePort: 'hidden-state',
        targetPort: 'hidden-state',
        kind: 'recurrent',
        recurrentLag: 1,
      }
    );
    const otherCheckpoint = { ...model, revision: 'b'.repeat(40) };
    const wrongModel = createStructuralConnectionV2(
      otherCheckpoint,
      first,
      second,
      {
        sourcePort: 'hidden-state',
        targetPort: 'hidden-state',
        kind: 'recurrent',
        recurrentLag: 1,
      }
    );
    const base = { ...graph, circuitSnapshots: [] };
    const coordinateResult = await validateInterpretabilityIdentityGraphV2(
      { ...base, structuralConnections: [wrongCoordinate] },
      identityGraphSchemaV2
    );
    const modelResult = await validateInterpretabilityIdentityGraphV2(
      { ...base, structuralConnections: [wrongModel] },
      identityGraphSchemaV2
    );
    const missingEndpointResult = await validateInterpretabilityIdentityGraphV2(
      {
        ...base,
        components: [],
        activationPositions: [],
        observations: [],
        structuralConnections: [wrongModel],
      },
      identityGraphSchemaV2
    );

    expect(coordinateResult.errors).toEqual([
      { code: 'invalid-identity-graph' },
    ]);
    expect(modelResult.errors).toEqual([{ code: 'invalid-identity-graph' }]);
    expect(missingEndpointResult.errors).toEqual([
      { code: 'invalid-identity-graph' },
    ]);
  });

  it('verifies circuit membership, model pins, and the injected canonical digest', async () => {
    const graph = await completeGraph();
    const snapshot = graph.circuitSnapshots[0];
    const otherCheckpoint = { ...model, revision: 'c'.repeat(40) };
    const mismatchedModel = await createCircuitStructuralSnapshotV2(
      snapshot.circuitId,
      otherCheckpoint,
      {
        completeness: snapshot.completeness,
        componentIds: snapshot.componentIds,
        connectionIds: snapshot.connectionIds,
        boundaryComponentIds: snapshot.boundaryComponentIds,
      },
      hashCanonicalIdentity
    );
    const missingMember = await createCircuitStructuralSnapshotV2(
      snapshot.circuitId,
      model,
      {
        completeness: snapshot.completeness,
        componentIds: ['atlas:v2:component:missing'],
        connectionIds: ['atlas:v2:connection:missing'],
        boundaryComponentIds: ['atlas:v2:component:missing'],
      },
      hashCanonicalIdentity
    );
    const missingResult = await validateInterpretabilityIdentityGraphV2(
      { ...graph, circuitSnapshots: [missingMember] },
      identityGraphSchemaV2
    );
    const modelResult = await validateInterpretabilityIdentityGraphV2(
      { ...graph, circuitSnapshots: [mismatchedModel] },
      identityGraphSchemaV2
    );
    const changedMembership = await validateInterpretabilityIdentityGraphV2(
      {
        ...graph,
        circuitSnapshots: [
          { ...snapshot, componentIds: [graph.components[1].id] },
        ],
      },
      identityGraphSchemaV2
    );
    const schemaWithoutDigest =
      createInterpretabilitySchemasV2(createTestZod()).identityGraphSchemaV2;
    const missingHasher = await validateInterpretabilityIdentityGraphV2(
      graph,
      schemaWithoutDigest
    );
    const failedHasher = await validateInterpretabilityIdentityGraphV2(
      graph,
      createInterpretabilitySchemasV2(createTestZod(), () => {
        throw new Error('digest unavailable');
      }).identityGraphSchemaV2
    );

    expect(missingResult.errors).toEqual([{ code: 'invalid-identity-graph' }]);
    expect(modelResult.errors).toEqual([{ code: 'invalid-identity-graph' }]);
    expect(changedMembership.errors).toEqual([
      { code: 'invalid-identity-graph' },
    ]);
    expect(missingHasher.errors).toEqual([{ code: 'invalid-identity-graph' }]);
    expect(failedHasher.errors).toEqual([{ code: 'invalid-identity-graph' }]);
  });
});
