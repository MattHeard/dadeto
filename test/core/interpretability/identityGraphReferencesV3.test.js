import { createHash } from 'node:crypto';
import {
  createActivationObservationV2,
  createCircuitStructuralSnapshotV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  createStructuralConnectionV2,
  exportInterpretabilityIdentityGraphV3,
  exportInterpretabilityResearchBundleV6,
  importInterpretabilityIdentityGraphV3,
  importInterpretabilityResearchBundleV2,
  summarizeIdentityReferencesV1,
  validateInterpretabilityIdentityGraphV2,
  validateInterpretabilityIdentityGraphV3,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const model = {
  modelId: 'atlas/reference-test',
  repository: 'https://example.com/reference-test',
  revision: 'a'.repeat(40),
  architecture: 'recurrent-test',
};
const schemasV1 = createInterpretabilitySchemasV1(createTestZod());
const schemasV2 = createInterpretabilitySchemasV2(createTestZod(), identity =>
  createHash('sha256').update(identity).digest('hex')
);

/**
 * Create a canonical recurrent component that is not included in the graph.
 * @param {number} neuronIndex Native neuron index.
 * @returns {Record<string, any>} Canonical component.
 */
function component(neuronIndex) {
  return createRecurrentNeuronComponentV2(model, 'reference-test', {
    layerIndex: 0,
    activationHook: 'rnn.hidden_state',
    neuronIndex,
  });
}

/**
 * Create one claim attached to the record that made an unresolved link.
 * @param {string} sourceRecordId Referring identity record.
 * @param {'component'|'activation-position'|'experiment'|'structural-connection'} entityType Referenced entity type.
 * @param {string} entityId Exact referenced identifier.
 * @param {string} claimId Stable claim identity.
 * @returns {Record<string, any>} Attributable identity claim.
 */
function claim(sourceRecordId, entityType, entityId, claimId) {
  return {
    schemaVersion: 1,
    claimId,
    entityType,
    entityId,
    authorId: 'researcher-a',
    source: 'portable-import',
    sourceRecordId,
    recordedAt: '2026-10-23T12:00:00Z',
  };
}

/**
 * Build a graph whose component, position, experiment, connection, and circuit
 * links are unresolved but each is backed by a source-bound claim.
 * @returns {Promise<Record<string, any>>} Portable unresolved identity graph.
 */
async function createUnresolvedGraph() {
  const unknownPositionComponent = component(2);
  const position = createRecurrentActivationPositionV2({
    componentId: unknownPositionComponent.id,
    timeStepIndex: 9,
  });
  const missingPositionId = 'atlas:v2:position:unindexed-position';
  const observation = createActivationObservationV2(
    missingPositionId,
    'experiment-unindexed',
    {
      inputSequenceId: 'input-sequence-a',
      runId: 'run-a',
      value: 0.5,
      numericPrecision: 'float32',
    }
  );
  const source = component(3);
  const target = component(4);
  const connection = createStructuralConnectionV2(model, source, target, {
    sourcePort: 'hidden-state',
    targetPort: 'hidden-state',
    kind: 'recurrent',
    recurrentLag: 1,
    tensorCoordinate: [0, 3],
  });
  const snapshotComponent = component(5);
  const snapshotConnection = createStructuralConnectionV2(
    model,
    component(6),
    component(7),
    {
      sourcePort: 'hidden-state',
      targetPort: 'hidden-state',
      kind: 'recurrent',
      recurrentLag: 1,
      tensorCoordinate: [0, 6],
    }
  );
  const snapshot = await createCircuitStructuralSnapshotV2(
    'atlas:circuit:reference-test',
    model,
    {
      completeness: 'unknown',
      componentIds: [snapshotComponent.id],
      connectionIds: [snapshotConnection.id],
      boundaryComponentIds: [snapshotComponent.id],
    },
    identity => createHash('sha256').update(identity).digest('hex')
  );
  const identityReferences = [
    claim(position.id, 'component', unknownPositionComponent.id, 'claim-1'),
    claim(observation.id, 'activation-position', missingPositionId, 'claim-2'),
    claim(observation.id, 'experiment', observation.experimentId, 'claim-3'),
    claim(connection.id, 'component', source.id, 'claim-4'),
    claim(connection.id, 'component', target.id, 'claim-5'),
    claim(snapshot.id, 'component', snapshotComponent.id, 'claim-6'),
    claim(
      snapshot.id,
      'structural-connection',
      snapshotConnection.id,
      'claim-7'
    ),
  ];
  return {
    components: [],
    activationPositions: [position],
    observations: [observation],
    structuralConnections: [connection],
    circuitSnapshots: [snapshot],
    identityReferences,
  };
}

describe('portable V3 identity graph references', () => {
  it('reports stable failures for invalid V3 graph envelopes and schemas', () => {
    expect(
      validateInterpretabilityIdentityGraphV3({}, undefined)
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'missing-schema-validator' }],
    });
    expect(exportInterpretabilityIdentityGraphV3({}, undefined)).toMatchObject({
      valid: false,
    });
    expect(
      importInterpretabilityIdentityGraphV3(
        null,
        schemasV2.identityGraphSchemaV3
      )
    ).toMatchObject({ errors: [{ code: 'invalid-json' }] });
    expect(
      importInterpretabilityIdentityGraphV3(
        '{',
        schemasV2.identityGraphSchemaV3
      )
    ).toMatchObject({ errors: [{ code: 'invalid-json' }] });
    expect(
      importInterpretabilityIdentityGraphV3(
        '[]',
        schemasV2.identityGraphSchemaV3
      )
    ).toMatchObject({ errors: [{ code: 'invalid-document' }] });
    expect(
      importInterpretabilityIdentityGraphV3(
        JSON.stringify({ schemaVersion: 2 }),
        schemasV2.identityGraphSchemaV3
      )
    ).toMatchObject({ errors: [{ code: 'unsupported-version' }] });
  });

  it('accepts only unresolved links backed by attributable, typed claims', async () => {
    const graph = await createUnresolvedGraph();

    expect(
      validateInterpretabilityIdentityGraphV2(
        graph,
        schemasV2.identityGraphSchemaV2
      ).valid
    ).toBe(false);
    expect(
      validateInterpretabilityIdentityGraphV3(
        graph,
        schemasV2.identityGraphSchemaV3
      ).valid
    ).toBe(true);

    const missingClaim = {
      ...graph,
      identityReferences: graph.identityReferences.slice(1),
    };
    const wrongSource = {
      ...graph,
      identityReferences: graph.identityReferences.map(reference =>
        reference.claimId === 'claim-1'
          ? { ...reference, sourceRecordId: 'another-record' }
          : reference
      ),
    };
    const wrongType = {
      ...graph,
      identityReferences: graph.identityReferences.map(reference =>
        reference.claimId === 'claim-2'
          ? { ...reference, entityType: 'component' }
          : reference
      ),
    };
    for (const invalid of [missingClaim, wrongSource, wrongType]) {
      expect(
        validateInterpretabilityIdentityGraphV3(
          invalid,
          schemasV2.identityGraphSchemaV3
        ).valid
      ).toBe(false);
    }
  });

  it('round-trips unresolved links deterministically and keeps claims attributable', async () => {
    const graph = await createUnresolvedGraph();
    const first = exportInterpretabilityIdentityGraphV3(
      graph,
      schemasV2.identityGraphSchemaV3
    );
    const reordered = Object.fromEntries(
      Object.entries(graph).map(([key, values]) => [key, [...values].reverse()])
    );
    const second = exportInterpretabilityIdentityGraphV3(
      reordered,
      schemasV2.identityGraphSchemaV3
    );

    expect(first.valid).toBe(true);
    expect(second).toEqual(first);
    if (!first.valid) return;
    const imported = importInterpretabilityIdentityGraphV3(
      first.json,
      schemasV2.identityGraphSchemaV3
    );
    expect(imported).toMatchObject({
      valid: true,
      graph: {
        identityReferences: graph.identityReferences,
        activationPositions: graph.activationPositions,
        observations: graph.observations,
      },
    });
  });

  it('resolves later definitions and reports conflicting definitions without editing prior claims', async () => {
    const graph = await createUnresolvedGraph();
    const oldClaims = structuredClone(graph.identityReferences);
    const componentClaim = graph.identityReferences[0];
    const importedComponent = component(2);
    const resolvedGraph = {
      ...graph,
      components: [importedComponent],
      identityReferences: graph.identityReferences.filter(
        reference => reference.claimId !== componentClaim.claimId
      ),
    };
    expect(
      validateInterpretabilityIdentityGraphV3(
        resolvedGraph,
        schemasV2.identityGraphSchemaV3
      ).valid
    ).toBe(true);
    const prefix = 'atlas:v2:component:';
    const identityDescriptor = decodeURIComponent(
      componentClaim.entityId.slice(prefix.length)
    );
    const laterClaims = [
      ...graph.identityReferences,
      {
        ...componentClaim,
        claimId: 'claim-compatible-resolution',
        authorId: 'researcher-b',
        sourceRecordId: 'indexed-component-record',
        identityDescriptor,
      },
      {
        ...claim(
          'observation-conflict',
          'experiment',
          'experiment-conflict',
          'claim-conflict-a'
        ),
        identityDescriptor: 'compatible-definition',
      },
      {
        ...claim(
          'observation-conflict',
          'experiment',
          'experiment-conflict',
          'claim-conflict-b'
        ),
        identityDescriptor: 'incompatible-definition',
      },
    ];
    const summary = summarizeIdentityReferencesV1(
      laterClaims,
      schemasV2.identityReferenceSchemaV1
    );

    expect(summary.valid).toBe(true);
    if (!summary.valid) return;
    expect(
      summary.entities.find(
        entity => entity.entityId === componentClaim.entityId
      ).state
    ).toBe('resolved');
    expect(
      summary.entities.find(entity => entity.entityId === 'experiment-conflict')
    ).toMatchObject({
      state: 'conflict',
      conflictingIdentities: [
        'compatible-definition',
        'incompatible-definition',
      ],
    });
    expect(graph.identityReferences).toEqual(oldClaims);
  });

  it('stores V6 graph links in a portable bundle while preserving V2-V5 imports', async () => {
    const graph = await createUnresolvedGraph();
    const bundle = {
      evidenceGraph: {
        mechanisms: [],
        hypotheses: [],
        experiments: [],
        estimates: [],
        evidence: [],
        edges: [],
      },
      identityGraph: Object.fromEntries(
        Object.entries(graph).filter(([key]) => key !== 'identityReferences')
      ),
      accuracyEvaluations: [],
      identityReferences: graph.identityReferences,
    };
    const exported = exportInterpretabilityResearchBundleV6(bundle, {
      evidenceGraphSchemasV1: schemasV1,
      identityGraphSchemasV2: schemasV2,
    });

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const envelope = JSON.parse(exported.json);
    expect(envelope.schemaVersion).toBe(6);
    expect(envelope.identityGraph.schemaVersion).toBe(3);
    expect(envelope.identityGraph.identityReferences).toEqual(
      graph.identityReferences
    );
    expect(envelope).not.toHaveProperty('identityReferences');
    const imported = importInterpretabilityResearchBundleV2(exported.json, {
      evidenceGraphSchemasV1: schemasV1,
      identityGraphSchemasV2: schemasV2,
    });
    expect(imported).toMatchObject({
      valid: true,
      bundle: {
        identityGraph: bundle.identityGraph,
        identityReferences: graph.identityReferences,
        evidenceGraph: bundle.evidenceGraph,
      },
    });

    const missingExperimentClaim = {
      ...envelope,
      identityGraph: {
        ...envelope.identityGraph,
        identityReferences: envelope.identityGraph.identityReferences.filter(
          reference => reference.claimId !== 'claim-3'
        ),
      },
    };
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(missingExperimentClaim),
        { evidenceGraphSchemasV1: schemasV1, identityGraphSchemasV2: schemasV2 }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-observation-experiment-references' }],
    });
  });
});
