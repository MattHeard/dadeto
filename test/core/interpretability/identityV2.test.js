import { createHash } from 'node:crypto';
import {
  createActivationObservationV2,
  createCircuitStructuralSnapshotV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  createStructuralConnectionV2,
  migrateRecurrentStateMechanismV1ToV2,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const zod = createTestZod();
const schemasV1 = createInterpretabilitySchemasV1(zod);
const schemasV2 = createInterpretabilitySchemasV2(zod);
const model = {
  modelId: 'alg-zoo/m16-10',
  repository: 'https://github.com/alignment-research-center/alg-zoo',
  revision: 'a'.repeat(40),
  architecture: 'recurrent-relu',
};

/**
 * @param {number} [neuronIndex] Neuron index for the fixture.
 * @returns {Record<string, any>} Recurrent component fixture.
 */
function component(neuronIndex = 2) {
  return createRecurrentNeuronComponentV2(model, 'm16-10-second-argmax', {
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    neuronIndex,
  });
}

describe('version 2 recurrent identities', () => {
  it('keeps a recurrent neuron stable while assigning distinct step positions', () => {
    const neuron = component();
    const stepZero = createRecurrentActivationPositionV2({
      componentId: neuron.id,
      timeStepIndex: 0,
    });
    const stepNine = createRecurrentActivationPositionV2({
      componentId: neuron.id,
      timeStepIndex: 9,
    });

    expect(schemasV2.recurrentNeuronComponentSchemaV2.parse(neuron)).toEqual(
      neuron
    );
    expect(
      schemasV2.recurrentNeuronComponentSchemaV2.safeParse({
        ...neuron,
        callerSelectedId: true,
      }).success
    ).toBe(false);
    expect(
      schemasV2.recurrentNeuronComponentSchemaV2.safeParse({
        ...neuron,
        id: `${neuron.id}:caller-selected`,
      }).success
    ).toBe(false);
    expect(
      schemasV2.recurrentNeuronComponentSchemaV2.safeParse({
        ...neuron,
        coordinateId: `${neuron.coordinateId}:caller-selected`,
      }).success
    ).toBe(false);
    expect(
      schemasV2.recurrentActivationPositionSchemaV2.parse(stepZero)
    ).toEqual(stepZero);
    expect(
      schemasV2.recurrentActivationPositionSchemaV2.parse(stepNine)
    ).toEqual(stepNine);
    expect(stepZero.componentId).toBe(stepNine.componentId);
    expect(stepZero.id).not.toBe(stepNine.id);
    expect(
      schemasV2.recurrentActivationPositionSchemaV2.safeParse({
        ...stepNine,
        id: `${stepNine.id}:caller-selected`,
      }).success
    ).toBe(false);
  });

  it('derives observation IDs from position, experiment, input, and run identity', () => {
    const neuron = component();
    const position = createRecurrentActivationPositionV2({
      componentId: neuron.id,
      timeStepIndex: 9,
    });
    const experimentId = 'experiment-1';
    const measurement = {
      inputSequenceId: 'sequence-a',
      runId: 'run-1',
      value: 0.375,
      numericPrecision: 'float32',
    };
    const first = createActivationObservationV2(
      position.id,
      experimentId,
      measurement
    );
    const repeated = createActivationObservationV2(position.id, experimentId, {
      ...measurement,
    });
    const otherInput = createActivationObservationV2(
      position.id,
      experimentId,
      { ...measurement, inputSequenceId: 'sequence-b' }
    );
    const otherRun = createActivationObservationV2(position.id, experimentId, {
      ...measurement,
      runId: 'run-2',
    });

    expect(schemasV2.activationObservationSchemaV2.parse(first)).toEqual(first);
    expect(
      schemasV2.activationObservationSchemaV2.safeParse({
        ...first,
        id: `${first.id}:caller-selected`,
      }).success
    ).toBe(false);
    expect(repeated.id).toBe(first.id);
    expect(otherInput.id).not.toBe(first.id);
    expect(otherRun.id).not.toBe(first.id);
  });

  it('separates checkpoint connection IDs from stable connection coordinates', () => {
    const source = component(2);
    const target = component(3);
    const coordinates = {
      sourcePort: 'hidden-state',
      targetPort: 'hidden-state',
      kind: 'recurrent',
      recurrentLag: 1,
      tensorCoordinate: [0, 2],
    };
    const connection = createStructuralConnectionV2(
      model,
      source,
      target,
      coordinates
    );
    const repeat = createStructuralConnectionV2(model, source, target, {
      ...coordinates,
    });
    const reversed = createStructuralConnectionV2(
      model,
      target,
      source,
      coordinates
    );
    const otherCoordinate = createStructuralConnectionV2(
      model,
      source,
      target,
      { ...coordinates, tensorCoordinate: [0, 3] }
    );
    const nextCheckpoint = { ...model, revision: 'b'.repeat(40) };
    const nextCheckpointSource = componentAtCheckpoint(nextCheckpoint, 2);
    const nextCheckpointTarget = componentAtCheckpoint(nextCheckpoint, 3);
    const nextCheckpointConnection = createStructuralConnectionV2(
      nextCheckpoint,
      nextCheckpointSource,
      nextCheckpointTarget,
      coordinates
    );
    const simpleConnection = createStructuralConnectionV2(
      model,
      source,
      target,
      { sourcePort: 'output', targetPort: 'input', kind: 'dense' }
    );

    expect(schemasV2.structuralConnectionSchemaV2.parse(connection)).toEqual(
      connection
    );
    expect(
      schemasV2.structuralConnectionSchemaV2.safeParse({
        ...connection,
        id: `${connection.id}:caller-selected`,
      }).success
    ).toBe(false);
    expect(
      schemasV2.structuralConnectionSchemaV2.safeParse({
        ...connection,
        coordinateId: `${connection.coordinateId}:caller-selected`,
      }).success
    ).toBe(false);
    expect(repeat.id).toBe(connection.id);
    expect(reversed.id).not.toBe(connection.id);
    expect(otherCoordinate.id).not.toBe(connection.id);
    expect(nextCheckpointConnection.id).not.toBe(connection.id);
    expect(nextCheckpointConnection.coordinateId).toBe(connection.coordinateId);
    expect(
      schemasV2.structuralConnectionSchemaV2.safeParse(simpleConnection).success
    ).toBe(true);
    expect(
      schemasV2.structuralConnectionSchemaV2.safeParse({
        ...connection,
        evidenceRelation: 'supports',
      }).success
    ).toBe(false);
  });

  it('canonicalizes circuit snapshots and hashes their checkpoint-scoped topology', async () => {
    const firstComponent = component(2);
    const secondComponent = component(3);
    const connection = createStructuralConnectionV2(
      model,
      firstComponent,
      secondComponent,
      {
        sourcePort: 'hidden-state',
        targetPort: 'hidden-state',
        kind: 'recurrent',
        recurrentLag: 1,
      }
    );
    const nextCheckpoint = { ...model, revision: 'b'.repeat(40) };
    const nextCheckpointSource = componentAtCheckpoint(nextCheckpoint, 2);
    const nextCheckpointTarget = componentAtCheckpoint(nextCheckpoint, 3);
    const nextCheckpointConnection = createStructuralConnectionV2(
      nextCheckpoint,
      nextCheckpointSource,
      nextCheckpointTarget,
      {
        sourcePort: 'hidden-state',
        targetPort: 'hidden-state',
        kind: 'recurrent',
        recurrentLag: 1,
      }
    );
    const structure = {
      completeness: 'unknown',
      componentIds: [firstComponent.id, secondComponent.id],
      connectionIds: [connection.id],
      boundaryComponentIds: [firstComponent.id],
    };
    const digest = identity =>
      createHash('sha256').update(identity, 'utf8').digest('hex');
    const snapshot = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:alg-zoo-example',
      model,
      structure,
      digest
    );
    const reorderedSnapshot = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:alg-zoo-example',
      model,
      {
        ...structure,
        componentIds: [...structure.componentIds].reverse(),
        connectionIds: [...structure.connectionIds].reverse(),
        boundaryComponentIds: [...structure.boundaryComponentIds].reverse(),
      },
      digest
    );
    const changedTopology = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:alg-zoo-example',
      model,
      { ...structure, connectionIds: [] },
      digest
    );
    const changedCheckpoint = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:alg-zoo-example',
      nextCheckpoint,
      {
        ...structure,
        componentIds: [nextCheckpointSource.id, nextCheckpointTarget.id],
        connectionIds: [nextCheckpointConnection.id],
        boundaryComponentIds: [nextCheckpointSource.id],
      },
      digest
    );
    const completeSnapshot = await createCircuitStructuralSnapshotV2(
      'atlas:circuit:alg-zoo-example',
      model,
      { ...structure, completeness: 'complete' },
      digest
    );

    expect(schemasV2.circuitStructuralSnapshotSchemaV2.parse(snapshot)).toEqual(
      snapshot
    );
    expect(
      schemasV2.circuitStructuralSnapshotSchemaV2.safeParse({
        ...snapshot,
        id: `atlas:v2:circuit-snapshot:${'0'.repeat(64)}`,
      }).success
    ).toBe(false);
    expect(reorderedSnapshot.id).toBe(snapshot.id);
    expect(changedTopology.id).not.toBe(snapshot.id);
    expect(changedCheckpoint.id).not.toBe(snapshot.id);
    expect(completeSnapshot.id).not.toBe(snapshot.id);
    expect(snapshot.completeness).toBe('unknown');
    expect(snapshot.componentIds).toEqual([...structure.componentIds].sort());
  });

  it('migrates one V1 recurrent state without inventing an observation', () => {
    const legacy = {
      schemaVersion: 1,
      id: 'alg-zoo/m16-10/layer-0/time-9/neuron-2',
      kind: 'recurrent-state',
      model,
      sourceId: 'm16-10-second-argmax',
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      neuronIndex: 2,
      timeStep: 9,
    };
    const schemas = { ...schemasV1, ...schemasV2 };
    const migrated = migrateRecurrentStateMechanismV1ToV2(legacy, schemas);

    expect(schemasV1.mechanismSchemaV1.parse(legacy)).toEqual(legacy);
    expect(migrated.valid).toBe(true);
    if (migrated.valid) {
      expect(migrated.component).toEqual(component());
      expect(migrated.position.timeStepIndex).toBe(9);
      expect(migrated.observations).toEqual([]);
    }

    const earlierStep = migrateRecurrentStateMechanismV1ToV2(
      { ...legacy, timeStep: 0 },
      schemas
    );
    expect(earlierStep.valid).toBe(true);
    if (earlierStep.valid && migrated.valid) {
      expect(earlierStep.component.id).toBe(migrated.component.id);
      expect(earlierStep.position.id).not.toBe(migrated.position.id);
    }
  });

  it('rejects invalid legacy records, other mechanism kinds, and invalid migration output', () => {
    const schemas = { ...schemasV1, ...schemasV2 };
    expect(migrateRecurrentStateMechanismV1ToV2({}, undefined)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-v1-mechanism' }],
    });
    expect(migrateRecurrentStateMechanismV1ToV2({}, schemas)).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-v1-mechanism' }],
    });
    expect(
      migrateRecurrentStateMechanismV1ToV2(
        {
          schemaVersion: 1,
          id: 'native-0',
          kind: 'native-neuron',
          model,
          sourceId: 'mlp',
          layerIndex: 0,
          activationHook: 'mlp.output',
          neuronIndex: 0,
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'unsupported-v1-mechanism-kind' }],
    });
    expect(
      migrateRecurrentStateMechanismV1ToV2(
        {
          schemaVersion: 1,
          id: 'legacy-rnn',
          kind: 'recurrent-state',
          model,
          sourceId: 'm16-10-second-argmax',
          layerIndex: 0,
          activationHook: 'rnn.hidden_state',
          neuronIndex: 2,
          timeStep: 0,
        },
        {
          ...schemas,
          recurrentActivationPositionSchemaV2: {
            safeParse: () => ({ success: false }),
          },
        }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-v2-migration' }],
    });
    expect(
      migrateRecurrentStateMechanismV1ToV2(
        {
          schemaVersion: 1,
          id: 'legacy-rnn',
          kind: 'recurrent-state',
          model,
          sourceId: 'm16-10-second-argmax',
          layerIndex: 0,
          activationHook: 'rnn.hidden_state',
          neuronIndex: 2,
          timeStep: 0,
        },
        {
          ...schemas,
          recurrentNeuronComponentSchemaV2: {
            safeParse: () => ({ success: false }),
          },
        }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-v2-migration' }],
    });
  });
});

/**
 * @param {Record<string, any>} checkpoint Pinned model checkpoint.
 * @param {number} neuronIndex Recurrent neuron index.
 * @returns {Record<string, any>} Recurrent component for that checkpoint.
 */
function componentAtCheckpoint(checkpoint, neuronIndex) {
  return createRecurrentNeuronComponentV2(checkpoint, 'm16-10-second-argmax', {
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    neuronIndex,
  });
}
