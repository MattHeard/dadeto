import { readFileSync } from 'node:fs';
import {
  createActivationObservationV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createNativeNeuronComponentV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  createTokenActivationPositionV2,
  exportInterpretabilityResearchBundleV2,
  exportInterpretabilityResearchBundleV3,
  exportInterpretabilityResearchBundleV4,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

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
  modelId: 'arc/alg-zoo-m16-10',
  repository: 'https://huggingface.co/example/alg-zoo-m16-10',
  revision: 'a'.repeat(40),
  architecture: 'RecurrentNeuralNetwork',
};

// SHA-256 values were computed from the public ARC GCS objects named by
// alg-zoo commit 4433f505a90e85a37d35d34f80f6cccf4a37cef4. The run ID below
// is Atlas-local, derived from the official model configuration and seed.
const algZooSeedTwoM1610Checkpoints = [
  {
    trainingSequences: 0,
    sha256: '5ca02c3ce8cbf5d9c357179f2e24a03337c6569817213842f3e1b94d1873221d',
  },
  {
    trainingSequences: 1048576,
    sha256: 'cfc372378699b7457e3e70711bb2cf8d87d1d9d926d040bc66e236963d79712b',
  },
  {
    trainingSequences: 2097152,
    sha256: '064a2ed33419a6e295b0d93724fee0b7c978b4f9a50d25d614d1744247963d87',
  },
  {
    trainingSequences: 4194304,
    sha256: '2ed74de9a327619c4a0b6b57d795407f3e56673d0c07f4961810acffab117253',
  },
  {
    trainingSequences: 8388608,
    sha256: 'f25629cb7de1c9cc512b239e7116f2cec21dca6406596bf44c0cd65d5575513a',
  },
  {
    trainingSequences: 16777216,
    sha256: 'db8872b44314b3dfd2081c89ab23e28177ed0b2a85d2e43858798f976cec86b9',
  },
  {
    trainingSequences: 33554432,
    sha256: '19b3d268dc56e31f56fecd3164ee22e1b14a81e2806a3bc7b5a4840d27236c23',
  },
  {
    trainingSequences: 67108864,
    sha256: 'c5e4749ddcd7df90e7b376ef8259715fc17eb18efe26a493eea379ac9be8dd56',
  },
  {
    trainingSequences: 134217728,
    sha256: '89a5e71e34141a167323b0a494e72d2200d44c8b218cc9dbcd50c9ef0f0322bf',
  },
  {
    trainingSequences: 268435456,
    sha256: '1762c69c2de3574f52c296daecd5c097f69614e8a6104bab6647522702c107c7',
  },
  {
    trainingSequences: 536870912,
    sha256: 'da4254d0f603332e1034e8a4d59d4ef3b9eda1f4279d06d4ccf6403eac1d5603',
  },
  {
    trainingSequences: 1073741824,
    sha256: '2da5093777d7943ed27e3df62c321eedb498e9d69a67a200b20a77361d0f997f',
  },
];
const z = createTestZod();
const evidenceSchemas = createInterpretabilitySchemasV1(z);
const identitySchemas = createInterpretabilitySchemasV2(z);
const schemas = {
  evidenceGraphSchemasV1: evidenceSchemas,
  identityGraphSchemasV2: identitySchemas,
};

const legacyMechanismFixtures = [
  { id: 'legacy-neuron-0', neuronIndex: 0, timeStep: 9 },
  { id: 'legacy-neuron-1', neuronIndex: 1, timeStep: 9 },
  { id: 'legacy-neuron-0-step-0', neuronIndex: 0, timeStep: 0 },
];

/**
 * Create V1 evidence records that refer to one another through typed IDs.
 * @returns {Record<string, any>} Versioned V1 graph.
 */
function createEvidenceGraph() {
  const mechanisms = legacyMechanismFixtures.map(
    ({ id, neuronIndex, timeStep }) => ({
      schemaVersion: 1,
      id,
      model,
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      kind: 'recurrent-state',
      sourceId: 'alg-zoo-m16-10',
      neuronIndex,
      timeStep,
    })
  );
  const hypotheses = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `hypothesis-${index}`,
    revision: 1,
    claim: `Neuron ${index} contributes to the output.`,
    status: 'proposed',
    mechanismIds: [mechanism.id],
    evidenceIds: [`evidence-${index}`],
    authorId: 'researcher-a',
    createdAt: '2026-10-20T10:00:00Z',
  }));
  const experiments = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `experiment-${index}`,
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypotheses[index].id],
    procedure: {
      repository: 'https://github.com/example/alg-zoo-test',
      revision: 'b'.repeat(40),
      path: 'experiments/replay.py',
    },
    seed: 17 + index,
    inputSplitId: 'held-out-gaussian-v1',
    runtime: { python: '3.12' },
    predictions: [{ target: 'activation', expected: 'lower' }],
    observations: [
      { kind: 'negative', summary: 'Intervention did not match prediction.' },
    ],
    authorId: 'researcher-a',
    createdAt: '2026-10-20T10:01:00Z',
  }));
  const evidence = mechanisms.map((mechanism, index) => ({
    schemaVersion: 1,
    id: `evidence-${index}`,
    kind: 'negative',
    summary: 'The held-out intervention did not reproduce the prediction.',
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypotheses[index].id],
    experimentIds: [experiments[index].id],
    validationState: 'unreviewed',
    authorId: 'researcher-b',
    createdAt: '2026-10-20T10:02:00Z',
  }));
  const edges = evidence.map((record, index) => ({
    schemaVersion: 1,
    id: `edge-${index}`,
    fromId: experiments[index].id,
    toId: record.id,
    relation: 'contradicts',
    authorId: 'researcher-b',
    createdAt: '2026-10-20T10:03:00Z',
  }));
  return {
    mechanisms,
    hypotheses,
    experiments,
    estimates: [],
    evidence,
    edges,
  };
}

/**
 * Create V2 identity records that refer to the same experiments.
 * @returns {Record<string, any>} V2 identity graph.
 */
function createIdentityGraph() {
  const components = [0, 1].map(neuronIndex =>
    createRecurrentNeuronComponentV2(model, 'alg-zoo-m16-10', {
      layerIndex: 0,
      activationHook: 'rnn.hidden_state',
      neuronIndex,
    })
  );
  const activationPositions = legacyMechanismFixtures.map(
    ({ neuronIndex, timeStep }) => {
      const component = components.find(
        entry => entry.neuronIndex === neuronIndex
      );
      return createRecurrentActivationPositionV2({
        componentId: component.id,
        timeStepIndex: timeStep,
      });
    }
  );
  const observations = activationPositions.map((position, index) =>
    createActivationObservationV2(position.id, `experiment-${index}`, {
      inputSequenceId: 'gaussian-sequence-1',
      runId: `replay-${index}`,
      value: 0.25 + index,
      numericPrecision: 'float32',
    })
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
 * Add one Pythia native mechanism and its V2 component/position to a bundle.
 * @returns {{bundle: Record<string, any>, mechanism: Record<string, any>, component: Record<string, any>}} Pythia bundle records.
 */
function createPythiaNativeMechanismBundle() {
  const sourceComponent = pythiaActivationArtifact.activation.components[3];
  const sourcePosition = pythiaActivationArtifact.activation.positions.find(
    position => position.componentId === sourceComponent.id
  );
  const mechanism = {
    schemaVersion: 1,
    id: sourceComponent.id,
    model: sourceComponent.model,
    layerIndex: sourceComponent.layerIndex,
    activationHook: sourceComponent.activationHook,
    kind: 'native-neuron',
    sourceId: sourceComponent.sourceId,
    neuronIndex: sourceComponent.neuronIndex,
  };
  const component = createNativeNeuronComponentV2(
    sourceComponent.model,
    sourceComponent.sourceId,
    {
      layerIndex: sourceComponent.layerIndex,
      activationHook: sourceComponent.activationHook,
      neuronIndex: sourceComponent.neuronIndex,
    }
  );
  const evidenceGraph = createEvidenceGraph();
  evidenceGraph.mechanisms.push(mechanism);
  const identityGraph = createIdentityGraph();
  identityGraph.components.push(component);
  identityGraph.activationPositions.push(
    createTokenActivationPositionV2({
      componentId: component.id,
      tokenPositionIndex: sourcePosition.tokenPositionIndex,
    })
  );
  return { bundle: { evidenceGraph, identityGraph }, mechanism, component };
}

describe('portable research bundle V2', () => {
  it('rejects activation observations that do not reference a bundle experiment', () => {
    const evidenceGraph = createEvidenceGraph();
    const identityGraph = createIdentityGraph();
    const originalObservation = identityGraph.observations[0];
    const unresolvedObservation = createActivationObservationV2(
      originalObservation.activationPositionId,
      'missing-experiment',
      {
        inputSequenceId: originalObservation.inputSequenceId,
        runId: originalObservation.runId,
        value: originalObservation.value,
        numericPrecision: originalObservation.numericPrecision,
      }
    );
    const validBundle = { evidenceGraph, identityGraph };
    const bundleWithoutObservations = {
      evidenceGraph,
      identityGraph: { ...identityGraph, observations: [] },
    };
    const invalidBundle = {
      evidenceGraph,
      identityGraph: {
        ...identityGraph,
        observations: [
          unresolvedObservation,
          ...identityGraph.observations.slice(1),
        ],
      },
    };
    const expectedReferenceError = {
      valid: false,
      errors: [
        {
          code: 'invalid-observation-experiment-references',
          details: [
            {
              code: 'unresolved-observation-experiment',
              observationId: unresolvedObservation.id,
              experimentId: 'missing-experiment',
            },
          ],
        },
      ],
    };

    for (const exporter of [
      exportInterpretabilityResearchBundleV2,
      exportInterpretabilityResearchBundleV3,
      exportInterpretabilityResearchBundleV4,
    ]) {
      const validExport = exporter(
        { ...validBundle, accuracyEvaluations: [] },
        schemas
      );
      expect(validExport.valid).toBe(true);
      const emptyObservationExport = exporter(
        { ...bundleWithoutObservations, accuracyEvaluations: [] },
        schemas
      );
      expect(emptyObservationExport.valid).toBe(true);
      if (emptyObservationExport.valid) {
        expect(
          importInterpretabilityResearchBundleV2(
            emptyObservationExport.json,
            schemas
          ).valid
        ).toBe(true);
      }
      expect(
        exporter({ ...invalidBundle, accuracyEvaluations: [] }, schemas)
      ).toEqual(expectedReferenceError);
      if (!validExport.valid) continue;

      const envelope = JSON.parse(validExport.json);
      envelope.identityGraph.observations[0] = unresolvedObservation;
      expect(
        importInterpretabilityResearchBundleV2(
          JSON.stringify(envelope),
          schemas
        )
      ).toEqual(expectedReferenceError);
    }
  });

  it('round-trips V1 evidence and V2 identities in deterministic order', () => {
    const bundle = {
      evidenceGraph: createEvidenceGraph(),
      identityGraph: createIdentityGraph(),
    };
    const original = JSON.parse(JSON.stringify(bundle));
    const exported = exportInterpretabilityResearchBundleV3(bundle, schemas);
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;

    const envelope = JSON.parse(exported.json);
    expect(envelope.schemaVersion).toBe(3);
    expect(envelope.evidenceGraph.schemaVersion).toBe(1);
    expect(envelope.identityGraph.schemaVersion).toBe(2);
    expect(envelope.mechanismIdentityLinks).toHaveLength(3);
    const neuronZeroLinks = envelope.mechanismIdentityLinks.filter(link =>
      link.legacyMechanismId.startsWith('legacy-neuron-0')
    );
    expect(neuronZeroLinks).toHaveLength(2);
    expect(new Set(neuronZeroLinks.map(link => link.componentId)).size).toBe(1);
    expect(
      new Set(neuronZeroLinks.map(link => link.activationPositionId)).size
    ).toBe(2);

    const reordered = {
      evidenceGraph: Object.fromEntries(
        Object.entries(bundle.evidenceGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
      identityGraph: Object.fromEntries(
        Object.entries(bundle.identityGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
    };
    expect(exportInterpretabilityResearchBundleV3(reordered, schemas)).toEqual(
      exported
    );

    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    const unorderedEnvelope = JSON.parse(exported.json);
    unorderedEnvelope.evidenceGraph.mechanisms.reverse();
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(unorderedEnvelope),
        schemas
      ).valid
    ).toBe(true);
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(
      imported.bundle.evidenceGraph.mechanisms.map(record => record.id)
    ).toEqual(['legacy-neuron-0', 'legacy-neuron-0-step-0', 'legacy-neuron-1']);
    expect(imported.bundle.evidenceGraph.hypotheses).toHaveLength(3);
    expect(imported.bundle.evidenceGraph.experiments).toHaveLength(3);
    expect(imported.bundle.evidenceGraph.evidence[0].kind).toBe('negative');
    expect(imported.bundle.evidenceGraph.edges[0].relation).toBe('contradicts');
    expect(imported.bundle.identityGraph.components).toHaveLength(2);
    expect(imported.bundle.identityGraph.activationPositions).toHaveLength(3);
    expect(imported.bundle.identityGraph.observations).toHaveLength(3);
    expect(imported.bundle.mechanismIdentityLinks).toEqual(
      envelope.mechanismIdentityLinks
    );
    expect(imported.bundle.evidenceGraph.hypotheses[0].mechanismIds).toEqual([
      'legacy-neuron-0',
    ]);
    expect(bundle).toEqual(original);
  });

  it('imports legacy V2 bundle envelopes without lineage links', () => {
    const exported = exportInterpretabilityResearchBundleV2(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      {
        evidenceGraphSchemasV1: evidenceSchemas,
        identityGraphSchemaV2: identitySchemas.identityGraphSchemaV2,
      }
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const envelope = JSON.parse(exported.json);
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.mechanismIdentityLinks).toBeUndefined();
    expect(
      importInterpretabilityResearchBundleV2(JSON.stringify(envelope), schemas)
    ).toMatchObject({
      valid: true,
      bundle: { mechanismIdentityLinks: [] },
    });
  });

  it('rejects missing, duplicate, stale, or incorrect V3 mechanism links', () => {
    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const validEnvelope = JSON.parse(exported.json);
    const invalidLinks = [
      [],
      [
        ...validEnvelope.mechanismIdentityLinks,
        validEnvelope.mechanismIdentityLinks[0],
      ],
      [null, ...validEnvelope.mechanismIdentityLinks.slice(1)],
      validEnvelope.mechanismIdentityLinks.map((link, index) =>
        index === 0
          ? { ...link, componentId: 'atlas:v2:component:wrong' }
          : link
      ),
      validEnvelope.mechanismIdentityLinks.map((link, index) =>
        index === 0 ? { ...link, extra: true } : link
      ),
    ];
    for (const mechanismIdentityLinks of invalidLinks) {
      expect(
        importInterpretabilityResearchBundleV2(
          JSON.stringify({ ...validEnvelope, mechanismIdentityLinks }),
          schemas
        )
      ).toEqual({
        valid: false,
        errors: [{ code: 'invalid-mechanism-identity-links' }],
      });
    }
  });

  it('rejects export when a migrated component or position is missing', () => {
    const graphWithoutComponent = createIdentityGraph();
    const missingComponentId = graphWithoutComponent.components.find(
      component => component.neuronIndex === 1
    ).id;
    const removedPositionIds = graphWithoutComponent.activationPositions
      .filter(position => position.componentId === missingComponentId)
      .map(position => position.id);
    graphWithoutComponent.components = graphWithoutComponent.components.filter(
      component => component.id !== missingComponentId
    );
    graphWithoutComponent.activationPositions =
      graphWithoutComponent.activationPositions.filter(
        position => position.componentId !== missingComponentId
      );
    graphWithoutComponent.observations =
      graphWithoutComponent.observations.filter(
        observation =>
          !removedPositionIds.includes(observation.activationPositionId)
      );
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: graphWithoutComponent,
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [{ code: 'missing-lineage-component' }],
        },
      ],
    });

    const graphWithoutPosition = createIdentityGraph();
    const missingPositionId = graphWithoutPosition.activationPositions.find(
      position => position.timeStepIndex === 0
    ).id;
    graphWithoutPosition.activationPositions =
      graphWithoutPosition.activationPositions.filter(
        position => position.id !== missingPositionId
      );
    graphWithoutPosition.observations =
      graphWithoutPosition.observations.filter(
        observation => observation.activationPositionId !== missingPositionId
      );
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: graphWithoutPosition,
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [{ code: 'missing-lineage-position' }],
        },
      ],
    });
  });
});

describe('portable research bundle V3 lineage', () => {
  it('exports an empty identity lineage when the V1 graph has no recurrent states', () => {
    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: {
          mechanisms: [],
          hypotheses: [],
          experiments: [],
          estimates: [],
          evidence: [],
          edges: [],
        },
        identityGraph: {
          components: [],
          activationPositions: [],
          observations: [],
          structuralConnections: [],
          circuitSnapshots: [],
        },
      },
      schemas
    );
    expect(exported).toMatchObject({ valid: true });
    if (!exported.valid) return;
    expect(
      importInterpretabilityResearchBundleV2(exported.json, schemas)
    ).toMatchObject({
      valid: true,
      bundle: { mechanismIdentityLinks: [] },
    });
  });

  it('links a Pythia native mechanism to its V2 component without inventing a position link', () => {
    const { bundle, mechanism, component } =
      createPythiaNativeMechanismBundle();
    const exported = exportInterpretabilityResearchBundleV3(bundle, schemas);

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const envelope = JSON.parse(exported.json);
    const nativeLink = envelope.mechanismIdentityLinks.find(
      link => link.legacyMechanismId === mechanism.id
    );
    expect(nativeLink).toEqual({
      legacyMechanismId: mechanism.id,
      componentId: component.id,
    });
    expect(
      envelope.mechanismIdentityLinks.filter(link =>
        Object.hasOwn(link, 'activationPositionId')
      )
    ).toHaveLength(3);

    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported).toMatchObject({ valid: true });
    if (!imported.valid) return;
    expect(imported.bundle.mechanismIdentityLinks).toEqual(
      envelope.mechanismIdentityLinks
    );

    const reorderedBundle = {
      evidenceGraph: Object.fromEntries(
        Object.entries(bundle.evidenceGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
      identityGraph: Object.fromEntries(
        Object.entries(bundle.identityGraph).map(([key, records]) => [
          key,
          [...records].reverse(),
        ])
      ),
    };
    expect(
      exportInterpretabilityResearchBundleV3(reorderedBundle, schemas)
    ).toEqual(exported);
  });

  it('round-trips native coordinate lineage across checkpoints without merging models', () => {
    const source = pythiaActivationArtifact.activation.components[3];
    const checkpointModels = [
      source.model,
      { ...source.model, revision: 'b'.repeat(40) },
      {
        ...source.model,
        modelId: 'EleutherAI/pythia-14m-independent-model',
        repository:
          'https://huggingface.co/EleutherAI/pythia-14m-independent-model',
        revision: 'c'.repeat(40),
      },
    ];
    const mechanisms = checkpointModels.map((checkpointModel, index) => ({
      schemaVersion: 1,
      id: [
        'pythia-checkpoint-a-neuron-3',
        'pythia-checkpoint-b-neuron-3',
        'pythia-independent-model-neuron-3',
      ][index],
      model: checkpointModel,
      layerIndex: source.layerIndex,
      activationHook: source.activationHook,
      kind: 'native-neuron',
      sourceId: source.sourceId,
      neuronIndex: source.neuronIndex,
    }));
    const components = checkpointModels.map(checkpointModel =>
      createNativeNeuronComponentV2(checkpointModel, source.sourceId, {
        layerIndex: source.layerIndex,
        activationHook: source.activationHook,
        neuronIndex: source.neuronIndex,
      })
    );
    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: {
          mechanisms,
          hypotheses: [],
          experiments: [],
          estimates: [],
          evidence: [],
          edges: [],
        },
        identityGraph: {
          components,
          activationPositions: [],
          observations: [],
          structuralConnections: [],
          circuitSnapshots: [],
        },
      },
      schemas
    );

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;

    const componentByRevision = Object.fromEntries(
      imported.bundle.identityGraph.components.map(component => [
        component.model.revision,
        component,
      ])
    );
    const firstCheckpoint = componentByRevision[source.model.revision];
    const secondCheckpoint = componentByRevision['b'.repeat(40)];
    const independentModel = componentByRevision['c'.repeat(40)];
    expect(firstCheckpoint.model.revision).toBe(source.model.revision);
    expect(secondCheckpoint.model.revision).toBe('b'.repeat(40));
    expect(independentModel.model.revision).toBe('c'.repeat(40));
    expect(firstCheckpoint.coordinateId).toBe(secondCheckpoint.coordinateId);
    expect(firstCheckpoint.id).not.toBe(secondCheckpoint.id);
    expect(independentModel.coordinateId).not.toBe(
      firstCheckpoint.coordinateId
    );
    expect(imported.bundle.mechanismIdentityLinks).toEqual(
      mechanisms.map((mechanism, index) => ({
        legacyMechanismId: mechanism.id,
        componentId: components[index].id,
      }))
    );
    expect(
      imported.bundle.mechanismIdentityLinks.every(
        link => !Object.hasOwn(link, 'activationPositionId')
      )
    ).toBe(true);
  });

  it('round-trips checkpoint hashes and training progress across twelve snapshots', () => {
    const publishedModel = {
      ...model,
      modelId: 'arc/alg-zoo/2nd-argmax/m16-10/seed-2',
      repository: 'https://github.com/alignment-research-center/alg-zoo',
      revision: '4433f505a90e85a37d35d34f80f6cccf4a37cef4',
    };
    const trainingRunId = 'arc-algzoo-2nd-argmax-m16-10-seed-2';
    const checkpointModels = algZooSeedTwoM1610Checkpoints.map(
      ({ trainingSequences, sha256 }) => ({
        ...publishedModel,
        checkpoint: {
          sha256,
          trainingRunId,
          trainingProgress: {
            metric: 'training-sequences',
            value: trainingSequences,
          },
        },
      })
    );
    const independentModel = {
      ...publishedModel,
      checkpoint: {
        sha256: 'f'.repeat(64),
        trainingRunId: 'arc-algzoo-2nd-argmax-m16-10-independent-run',
        trainingProgress: {
          metric: 'training-sequences',
          value: algZooSeedTwoM1610Checkpoints.at(-1).trainingSequences,
        },
      },
    };
    const components = [...checkpointModels, independentModel].map(
      checkpointModel =>
        createRecurrentNeuronComponentV2(
          checkpointModel,
          'm16-10-second-argmax',
          {
            layerIndex: 0,
            activationHook: 'rnn.hidden_state',
            neuronIndex: 2,
          }
        )
    );
    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: {
          mechanisms: [],
          hypotheses: [],
          experiments: [],
          estimates: [],
          evidence: [],
          edges: [],
        },
        identityGraph: {
          components,
          activationPositions: [],
          observations: [],
          structuralConnections: [],
          circuitSnapshots: [],
        },
      },
      schemas
    );

    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;

    const roundTripped = imported.bundle.identityGraph.components;
    const sameTrainingRun = roundTripped.filter(
      component => component.model.checkpoint.trainingRunId === trainingRunId
    );
    const independent = roundTripped.find(
      component => component.model.checkpoint.trainingRunId !== trainingRunId
    );
    expect(sameTrainingRun).toHaveLength(12);
    expect(new Set(sameTrainingRun.map(component => component.id)).size).toBe(
      12
    );
    expect(
      new Set(sameTrainingRun.map(component => component.coordinateId)).size
    ).toBe(1);
    expect(
      sameTrainingRun
        .map(component => component.model.checkpoint)
        .sort(
          (left, right) =>
            left.trainingProgress.value - right.trainingProgress.value
        )
    ).toEqual(
      algZooSeedTwoM1610Checkpoints.map(({ trainingSequences, sha256 }) => ({
        sha256,
        trainingRunId,
        trainingProgress: {
          metric: 'training-sequences',
          value: trainingSequences,
        },
      }))
    );
    expect(independent.model.checkpoint.trainingRunId).toBe(
      'arc-algzoo-2nd-argmax-m16-10-independent-run'
    );
    expect(independent.coordinateId).not.toBe(sameTrainingRun[0].coordinateId);
    expect(independent.id).not.toBe(sameTrainingRun.at(-1).id);
  });

  it('rejects native lineage links whose canonical component is missing or altered', () => {
    const { bundle, mechanism, component } =
      createPythiaNativeMechanismBundle();
    const graphWithoutNativeComponent = {
      ...bundle.identityGraph,
      components: bundle.identityGraph.components.filter(
        entry => entry.id !== component.id
      ),
      activationPositions: bundle.identityGraph.activationPositions.filter(
        entry => entry.componentId !== component.id
      ),
    };
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: bundle.evidenceGraph,
          identityGraph: graphWithoutNativeComponent,
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [
            { code: 'missing-lineage-component', mechanismId: mechanism.id },
          ],
        },
      ],
    });

    const exported = exportInterpretabilityResearchBundleV3(bundle, schemas);
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const links = JSON.parse(exported.json).mechanismIdentityLinks;
    const nativeLink = links.find(
      link => link.legacyMechanismId === mechanism.id
    );
    const invalidLinks = [
      links.filter(link => link.legacyMechanismId !== mechanism.id),
      links.map(link =>
        link.legacyMechanismId === mechanism.id
          ? { ...link, activationPositionId: 'atlas:v2:position:invented' }
          : link
      ),
      [...links, nativeLink],
      links.map(link =>
        link.legacyMechanismId === mechanism.id
          ? { ...link, componentId: 'atlas:v2:component:incorrect' }
          : link
      ),
    ];
    for (const mechanismIdentityLinks of invalidLinks) {
      expect(
        importInterpretabilityResearchBundleV2(
          JSON.stringify({
            ...JSON.parse(exported.json),
            mechanismIdentityLinks,
          }),
          schemas
        )
      ).toMatchObject({
        valid: false,
        errors: [{ code: 'invalid-mechanism-identity-links' }],
      });
    }
  });

  it('rejects V3 imports when lineage schema adapters are missing', () => {
    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    expect(
      importInterpretabilityResearchBundleV2(exported.json, {
        ...schemas,
        identityGraphSchemasV2: {
          ...identitySchemas,
          recurrentNeuronComponentSchemaV2: undefined,
        },
      })
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [{ code: 'missing-lineage-schemas' }],
        },
      ],
    });
  });

  it('wraps migration failures when a legacy recurrent state cannot form V2 IDs', () => {
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: createIdentityGraph(),
        },
        {
          ...schemas,
          identityGraphSchemasV2: {
            ...identitySchemas,
            recurrentNeuronComponentSchemaV2: {
              safeParse: () => ({ success: false }),
            },
          },
        }
      )
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [
            {
              code: 'invalid-legacy-recurrent-state',
              details: [{ code: 'invalid-v2-migration' }],
            },
          ],
        },
      ],
    });
  });

  it('wraps a native migration failure after evidence graph validation', () => {
    let nativeMechanismParseCount = 0;
    const mechanismSchemaV1 = {
      safeParse: record => {
        if (record.kind === 'native-neuron') {
          nativeMechanismParseCount += 1;
          if (nativeMechanismParseCount === 2) return { success: false };
        }
        return evidenceSchemas.mechanismSchemaV1.safeParse(record);
      },
    };
    const { bundle } = createPythiaNativeMechanismBundle();

    expect(
      exportInterpretabilityResearchBundleV3(bundle, {
        ...schemas,
        evidenceGraphSchemasV1: {
          ...evidenceSchemas,
          mechanismSchemaV1,
        },
      })
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [
            {
              code: 'invalid-legacy-native-neuron',
              details: [{ code: 'invalid-v1-mechanism' }],
            },
          ],
        },
      ],
    });
  });
});

describe('portable research bundle validation', () => {
  it('returns stable failures for malformed envelopes and invalid subgraphs', () => {
    expect(importInterpretabilityResearchBundleV2(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV2('{', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV2('[]', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(
      importInterpretabilityResearchBundleV2('{"schemaVersion":6}', schemas)
    ).toEqual({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
    expect(
      importInterpretabilityResearchBundleV2('{"schemaVersion":2}', schemas)
    ).toEqual({
      valid: false,
      errors: [
        {
          code: 'invalid-evidence-graph',
          details: [{ code: 'invalid-json' }],
        },
      ],
    });

    const validBundle = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(validBundle.valid).toBe(true);
    if (!validBundle.valid) return;
    const unsupportedIdentityGraph = JSON.parse(validBundle.json);
    unsupportedIdentityGraph.identityGraph.schemaVersion = 1;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(unsupportedIdentityGraph),
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    const wrongIdentityVersion = JSON.parse(validBundle.json);
    wrongIdentityVersion.identityGraph.schemaVersion = 1;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(wrongIdentityVersion),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });

    const exported = exportInterpretabilityResearchBundleV3(
      {
        evidenceGraph: createEvidenceGraph(),
        identityGraph: createIdentityGraph(),
      },
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const invalidEvidence = JSON.parse(exported.json);
    invalidEvidence.evidenceGraph.evidence[0].kind = 'untyped';
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidEvidence),
        schemas
      ).errors
    ).toEqual([{ code: 'invalid-evidence-graph', details: expect.any(Array) }]);

    const invalidIdentity = JSON.parse(exported.json);
    invalidIdentity.identityGraph.extra = true;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidIdentity),
        schemas
      ).errors
    ).toEqual([{ code: 'invalid-identity-graph', details: expect.any(Array) }]);

    const unknownOuterField = { ...JSON.parse(exported.json), extra: true };
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(unknownOuterField),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
  });

  it('rejects invalid exports and missing schema adapters with stable errors', () => {
    expect(exportInterpretabilityResearchBundleV3(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      exportInterpretabilityResearchBundleV3(
        { evidenceGraph: null, identityGraph: createIdentityGraph() },
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: {
            hypotheses: [{ id: 'hypothesis', mechanismIds: ['absent'] }],
          },
          identityGraph: createIdentityGraph(),
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
    const malformedMechanismGraph = createEvidenceGraph();
    malformedMechanismGraph.mechanisms[0].timeStep = -1;
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: malformedMechanismGraph,
          identityGraph: createIdentityGraph(),
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: { ...createIdentityGraph(), unsupported: true },
        },
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-identity-graph' }],
    });
    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: createIdentityGraph(),
        },
        {
          identityGraphSchemasV2: identitySchemas,
        }
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });

    expect(
      exportInterpretabilityResearchBundleV3(
        {
          evidenceGraph: createEvidenceGraph(),
          identityGraph: createIdentityGraph(),
        },
        {
          evidenceGraphSchemasV1: evidenceSchemas,
          identityGraphSchemasV2: {
            ...identitySchemas,
            recurrentNeuronComponentSchemaV2: undefined,
          },
        }
      )
    ).toMatchObject({
      valid: false,
      errors: [
        {
          code: 'invalid-mechanism-identity-links',
          details: [{ code: 'missing-lineage-schemas' }],
        },
      ],
    });
  });
});
