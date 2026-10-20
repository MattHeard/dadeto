import { readFileSync } from 'node:fs';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  createInterpretabilityResearchServiceV1,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createNativeNeuronComponentV2,
  createRecurrentActivationPositionV2,
  createRecurrentNeuronComponentV2,
  exportInterpretabilityResearchBundleV2,
  exportInterpretabilityResearchBundleV3,
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
  modelId: 'test-model',
  repository: 'https://huggingface.co/example/test-model',
  revision: 'a'.repeat(40),
  architecture: 'GPT2LMHeadModel',
};
const schemas = {
  evidenceGraphSchemasV1: createInterpretabilitySchemasV1(createTestZod()),
  identityGraphSchemasV2: createInterpretabilitySchemasV2(createTestZod()),
};
const createdAt = '2026-10-20T15:00:00Z';

/**
 * Build a V1 graph with one attributed experiment and evidence record.
 * @param {string} kind Native or recurrent mechanism kind.
 * @returns {Record<string, any>} Complete versioned evidence graph.
 */
function createEvidenceGraph(kind = 'native-neuron') {
  const mechanism = {
    schemaVersion: 1,
    id: 'mechanism-a',
    model,
    layerIndex: 0,
    activationHook:
      kind === 'recurrent-state' ? 'rnn.hidden_state' : 'blocks.0.mlp.output',
    kind,
    sourceId: kind === 'recurrent-state' ? 'rnn' : 'mlp',
    neuronIndex: 7,
    ...(kind === 'recurrent-state' ? { timeStep: 0 } : {}),
  };
  const hypothesis = {
    schemaVersion: 1,
    id: 'hypothesis-a',
    revision: 1,
    claim: 'The selected unit has a measurable activation response.',
    status: 'proposed',
    mechanismIds: [mechanism.id],
    evidenceIds: ['evidence-a'],
    authorId: 'investigator-a',
    createdAt,
  };
  const experiment = {
    schemaVersion: 1,
    id: 'experiment-a',
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    procedure: {
      repository: 'https://github.com/example/replay',
      revision: 'b'.repeat(40),
      path: 'experiments/replay.js',
    },
    seed: 17,
    inputSplitId: 'fixture-input-a',
    runtime: { implementation: 'deterministic-fixture' },
    predictions: [{ target: 'activation', expected: 'positive' }],
    observations: [{ kind: 'observed', summary: 'Measured a positive value.' }],
    authorId: 'investigator-a',
    createdAt,
  };
  const evidence = {
    schemaVersion: 1,
    id: 'evidence-a',
    kind: 'observation',
    summary: 'Investigator A recorded a replay measurement.',
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    experimentIds: [experiment.id],
    validationState: 'unreviewed',
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
        id: 'edge-mechanism-hypothesis',
        fromId: mechanism.id,
        toId: hypothesis.id,
        relation: 'connected-to',
        authorId: 'investigator-a',
        createdAt,
      },
      {
        schemaVersion: 1,
        id: 'edge-hypothesis-evidence',
        fromId: hypothesis.id,
        toId: evidence.id,
        relation: 'supports',
        authorId: 'investigator-a',
        createdAt,
      },
      {
        schemaVersion: 1,
        id: 'edge-experiment-hypothesis',
        fromId: experiment.id,
        toId: hypothesis.id,
        relation: 'depends-on',
        authorId: 'investigator-a',
        createdAt,
      },
    ],
  };
}

/**
 * Create a valid follow-on submission using the supplied fake activation.
 * @param {number} activation Deterministic fake-inference result.
 * @returns {Record<string, any>} V1 experiment, evidence, and dependency edge.
 */
function createSubmission(activation) {
  const experiment = {
    schemaVersion: 1,
    id: 'experiment-b',
    status: 'completed',
    model,
    mechanismIds: ['mechanism-a'],
    hypothesisIds: ['hypothesis-a'],
    procedure: {
      repository: 'https://github.com/example/replay',
      revision: 'c'.repeat(40),
      path: 'experiments/replay.js',
    },
    seed: 18,
    inputSplitId: 'fixture-input-b',
    runtime: { implementation: 'fake-inference-v1' },
    predictions: [{ target: 'activation', expected: `equal to ${activation}` }],
    observations: [
      { kind: 'observed', summary: `Fake inference returned ${activation}.` },
    ],
    authorId: 'investigator-b',
    createdAt: '2026-10-20T15:05:00Z',
  };
  const evidence = {
    schemaVersion: 1,
    id: 'evidence-b',
    kind: 'observation',
    summary: `Investigator B recorded activation ${activation}.`,
    mechanismIds: ['mechanism-a'],
    hypothesisIds: ['hypothesis-a'],
    experimentIds: [experiment.id],
    validationState: 'unreviewed',
    authorId: 'investigator-b',
    createdAt: '2026-10-20T15:05:00Z',
  };
  return {
    experiment,
    evidence: [evidence],
    edges: [
      {
        schemaVersion: 1,
        id: 'edge-b-depends-on-a',
        fromId: experiment.id,
        toId: 'evidence-a',
        relation: 'depends-on',
        authorId: 'investigator-b',
        createdAt: '2026-10-20T15:05:00Z',
      },
      {
        schemaVersion: 1,
        id: 'edge-b-supports-b',
        fromId: experiment.id,
        toId: evidence.id,
        relation: 'supports',
        authorId: 'investigator-b',
        createdAt: '2026-10-20T15:05:00Z',
      },
    ],
  };
}

/**
 * Create one versioned whole-model estimate linked to the fixture evidence.
 * @returns {Record<string, any>} Complete mechanistic estimate.
 */
function createEstimate() {
  return {
    schemaVersion: 1,
    id: 'estimate-b',
    model,
    metric: { name: 'accuracy', value: 0.72 },
    uncertainty: { lower: 0.68, upper: 0.76, method: 'bootstrap' },
    compute: { quantity: 4, unit: 'GPU-hours' },
    method: {
      repository: 'https://github.com/example/estimator',
      revision: 'd'.repeat(40),
      path: 'estimate.py',
    },
    assumptions: ['The held-out perturbations represent target inputs.'],
    hypothesisIds: ['hypothesis-a'],
    evidenceIds: ['evidence-a'],
    heldOutSplitId: 'perturbations-held-out-v1',
    authorId: 'investigator-b',
    createdAt: '2026-10-20T16:00:00Z',
  };
}

/**
 * Create an in-memory storage adapter that records permission forwarding.
 * @param {string} initialJson Initial portable research bundle.
 * @param {Record<string, any>} [serviceSchemas] Optional service schema adapters.
 * @returns {Record<string, any>} Service, observed permissions, and stored JSON.
 */
function createMemoryAdapter(initialJson, serviceSchemas = schemas) {
  let storedJson = initialJson;
  const loadPermissions = [];
  const savePermissions = [];
  const createService = () =>
    createInterpretabilityResearchServiceV1({
      loadBundle: async allowEffects => {
        loadPermissions.push(allowEffects);
        return storedJson;
      },
      saveBundle: async (allowEffects, json) => {
        savePermissions.push(allowEffects);
        storedJson = json;
      },
      schemas: serviceSchemas,
    });
  return {
    service: createService(),
    createService,
    loadPermissions,
    savePermissions,
    getStoredJson: () => storedJson,
  };
}

/**
 * Serialize one V1 evidence graph with an empty V2 identity graph.
 * @param {Record<string, any>} evidenceGraph Versioned evidence graph.
 * @param {boolean} [versionThree] Whether to create the V3 envelope.
 * @returns {string} Portable research bundle JSON.
 */
function createPortableBundle(evidenceGraph, versionThree = true) {
  const exporter = versionThree
    ? exportInterpretabilityResearchBundleV3
    : exportInterpretabilityResearchBundleV2;
  const mechanism = evidenceGraph.mechanisms[0];
  /** @type {Record<string, any>|null} */
  let component = null;
  if (versionThree && mechanism.kind === 'native-neuron') {
    component = createNativeNeuronComponentV2(
      mechanism.model,
      mechanism.sourceId,
      {
        layerIndex: mechanism.layerIndex,
        activationHook: mechanism.activationHook,
        neuronIndex: mechanism.neuronIndex,
      }
    );
  } else if (versionThree && mechanism.kind === 'recurrent-state') {
    component = createRecurrentNeuronComponentV2(
      mechanism.model,
      mechanism.sourceId,
      {
        layerIndex: mechanism.layerIndex,
        activationHook: mechanism.activationHook,
        neuronIndex: mechanism.neuronIndex,
      }
    );
  }
  const activationPosition =
    mechanism.kind === 'recurrent-state' && component
      ? createRecurrentActivationPositionV2({
          componentId: component.id,
          timeStepIndex: mechanism.timeStep,
        })
      : null;
  const result = exporter(
    {
      evidenceGraph,
      identityGraph: {
        components: component ? [component] : [],
        activationPositions: activationPosition ? [activationPosition] : [],
        observations: [],
        structuralConnections: [],
        circuitSnapshots: [],
      },
    },
    schemas
  );
  if (!result.valid) throw new Error('Fixture bundle failed validation.');
  return result.json;
}

/**
 * Build a V3 bundle from one pinned Pythia native-neuron artifact record.
 * @returns {{json: string, mechanism: Record<string, any>, component: Record<string, any>}} Portable V3 bundle and source identities.
 */
function createPythiaNativePortableBundle() {
  const source = pythiaActivationArtifact.activation.components[3];
  const mechanism = {
    schemaVersion: 1,
    id: 'pythia-native-mechanism-3',
    model: source.model,
    layerIndex: source.layerIndex,
    activationHook: source.activationHook,
    kind: 'native-neuron',
    sourceId: source.sourceId,
    neuronIndex: source.neuronIndex,
  };
  const component = createNativeNeuronComponentV2(
    source.model,
    source.sourceId,
    {
      layerIndex: source.layerIndex,
      activationHook: source.activationHook,
      neuronIndex: source.neuronIndex,
    }
  );
  const evidenceGraph = {
    ...createEvidenceGraph(),
    mechanisms: [mechanism],
    hypotheses: [],
    experiments: [],
    estimates: [],
    evidence: [],
    edges: [],
  };
  const exported = exportInterpretabilityResearchBundleV3(
    {
      evidenceGraph,
      identityGraph: {
        components: [component],
        activationPositions: [],
        observations: [],
        structuralConnections: [],
        circuitSnapshots: [],
      },
    },
    schemas
  );
  if (!exported.valid) throw new Error('Pythia context fixture is invalid.');
  return { json: exported.json, mechanism, component };
}

describe('permission-aware interpretability research service V1', () => {
  it('returns a Pythia native context linked to its canonical V2 component', async () => {
    const allowEffects = createAllowEffects();
    const { json, mechanism, component } = createPythiaNativePortableBundle();
    const memory = createMemoryAdapter(json);
    const context = await memory.service.readContext(allowEffects, {
      mechanismId: mechanism.id,
    });

    expect(context).toMatchObject({
      valid: true,
      mechanism: { id: mechanism.id },
      mechanismIdentityLink: {
        legacyMechanismId: mechanism.id,
        componentId: component.id,
      },
    });
    if (!context.valid) return;
    expect(context.mechanismIdentityLink).not.toHaveProperty(
      'activationPositionId'
    );
  });

  it('returns recurrent lineage and a null link for V2 context reads', async () => {
    const allowEffects = createAllowEffects();
    const recurrentMemory = createMemoryAdapter(
      createPortableBundle(createEvidenceGraph('recurrent-state'))
    );
    const recurrentContext = await recurrentMemory.service.readContext(
      allowEffects,
      { mechanismId: 'mechanism-a' }
    );

    expect(recurrentContext).toMatchObject({ valid: true });
    if (!recurrentContext.valid) return;
    expect(recurrentContext.mechanismIdentityLink).toEqual({
      legacyMechanismId: 'mechanism-a',
      componentId: expect.any(String),
      activationPositionId: expect.any(String),
    });

    const legacyMemory = createMemoryAdapter(
      createPortableBundle(createEvidenceGraph(), false)
    );
    const legacyContext = await legacyMemory.service.readContext(allowEffects, {
      mechanismId: 'mechanism-a',
    });
    expect(legacyContext).toMatchObject({
      valid: true,
      mechanismIdentityLink: null,
    });
    const unknownContext = await legacyMemory.service.readContext(
      allowEffects,
      { mechanismId: 'unknown-mechanism' }
    );
    expect(unknownContext).toEqual({
      valid: false,
      errors: [{ code: 'unknown-mechanism', mechanismId: 'unknown-mechanism' }],
    });
  });

  it('reads bounded context and persists validated follow-on submissions', async () => {
    const allowEffects = createAllowEffects();
    const memory = createMemoryAdapter(
      createPortableBundle(createEvidenceGraph())
    );
    const context = await memory.service.readContext(allowEffects, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 2,
    });

    expect(context.valid).toBe(true);
    if (!context.valid) return;
    expect(context.mechanism.id).toBe('mechanism-a');
    expect(context.items).toHaveLength(2);
    expect(context.totalItems).toBeGreaterThan(context.items.length);
    expect(context.nextCursor).not.toBeNull();

    const fakeInference = input => input * 2;
    const submission = createSubmission(fakeInference(7));
    const saved = await memory.service.submitExperiment(
      allowEffects,
      submission
    );
    expect(saved.valid).toBe(true);
    expect(memory.loadPermissions).toEqual([allowEffects, allowEffects]);
    expect(memory.savePermissions).toEqual([allowEffects]);

    const imported = importInterpretabilityResearchBundleV2(
      memory.getStoredJson(),
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(
      imported.bundle.evidenceGraph.experiments.map(record => record.id)
    ).toEqual(['experiment-a', 'experiment-b']);
    expect(
      imported.bundle.evidenceGraph.evidence.map(record => record.id)
    ).toEqual(['evidence-a', 'evidence-b']);
    expect(imported.bundle.evidenceGraph.edges).toContainEqual(
      expect.objectContaining({
        id: 'edge-b-depends-on-a',
        toId: 'evidence-a',
        relation: 'depends-on',
      })
    );

    const invalidSubmission = createSubmission(14);
    invalidSubmission.evidence[0].kind = 'invalid';
    const rejected = await memory.service.submitExperiment(
      allowEffects,
      invalidSubmission
    );
    expect(rejected.valid).toBe(false);
    expect(memory.savePermissions).toHaveLength(1);
  });

  it('exposes competing hypotheses and typed evidence to API callers', async () => {
    const allowEffects = createAllowEffects();
    const graph = createEvidenceGraph();
    graph.hypotheses.push({
      ...graph.hypotheses[0],
      id: 'hypothesis-b',
      claim: 'The selected unit has a negative response.',
      evidenceIds: ['evidence-b'],
      authorId: 'investigator-b',
    });
    graph.evidence.push({
      ...graph.evidence[0],
      id: 'evidence-b',
      kind: 'negative',
      summary: 'Investigator B recorded a negative replay measurement.',
      hypothesisIds: ['hypothesis-b'],
      authorId: 'investigator-b',
    });
    graph.edges.push(
      {
        ...graph.edges[0],
        id: 'edge-mechanism-hypothesis-b',
        toId: 'hypothesis-b',
        authorId: 'investigator-b',
      },
      {
        ...graph.edges[1],
        id: 'edge-hypothesis-b-evidence-b',
        fromId: 'hypothesis-b',
        toId: 'evidence-b',
        authorId: 'investigator-b',
      },
      {
        ...graph.edges[1],
        id: 'edge-hypothesis-a-contradicts-evidence-b',
        toId: 'evidence-b',
        relation: 'contradicts',
        authorId: 'investigator-b',
      }
    );
    const memory = createMemoryAdapter(createPortableBundle(graph));
    const context = await memory.service.readContext(allowEffects, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 20,
    });

    expect(context.valid).toBe(true);
    if (!context.valid) return;
    const records = context.items
      .filter(item => item.itemType === 'record')
      .map(item => ({ collection: item.collection, record: item.record }));
    expect(
      records
        .filter(item => item.collection === 'hypotheses')
        .map(item => item.record.id)
    ).toEqual(['hypothesis-a', 'hypothesis-b']);
    expect(
      records
        .filter(item => item.collection === 'evidence')
        .map(item => item.record.kind)
    ).toEqual(['observation', 'negative']);
    expect(
      context.items
        .filter(item => item.itemType === 'edge')
        .map(item => item.record.relation)
    ).toEqual(expect.arrayContaining(['supports', 'contradicts']));
  });

  it('lets a fresh investigator session reuse persisted evidence through the service', async () => {
    const sourceGraph = createEvidenceGraph();
    const initialGraph = {
      ...sourceGraph,
      hypotheses: [{ ...sourceGraph.hypotheses[0], evidenceIds: [] }],
      experiments: [],
      estimates: [],
      evidence: [],
      edges: [sourceGraph.edges[0]],
    };
    const memory = createMemoryAdapter(createPortableBundle(initialGraph));
    const investigatorA = memory.service;
    const investigatorB = memory.createService();
    const allowEffectsA = createAllowEffects();
    const allowEffectsB = createAllowEffects();
    const firstSubmission = {
      experiment: sourceGraph.experiments[0],
      evidence: [sourceGraph.evidence[0]],
      edges: sourceGraph.edges.slice(1),
    };

    const savedA = await investigatorA.submitExperiment(
      allowEffectsA,
      firstSubmission
    );
    expect(savedA.valid).toBe(true);

    const afterA = importInterpretabilityResearchBundleV2(
      memory.getStoredJson(),
      schemas
    );
    expect(afterA.valid).toBe(true);
    if (!afterA.valid) return;
    const originalEvidence = afterA.bundle.evidenceGraph.evidence.find(
      record => record.id === 'evidence-a'
    );
    expect(originalEvidence).toBeDefined();
    if (!originalEvidence) return;
    const originalEvidenceJson = JSON.stringify(originalEvidence);

    const retrieved = await investigatorB.readContext(allowEffectsB, {
      mechanismId: 'mechanism-a',
      maxDepth: 2,
      pageSize: 20,
    });
    expect(retrieved.valid).toBe(true);
    if (!retrieved.valid) return;
    const priorEvidence = retrieved.items.find(
      item => item.id === originalEvidence.id
    );
    expect(priorEvidence?.record.authorId).toBe('investigator-a');
    if (!priorEvidence) return;

    const followUp = createSubmission(14);
    const derivedPrediction = `Follow-up test based on retrieved finding: ${priorEvidence.record.summary}`;
    followUp.experiment.predictions[0].expected = derivedPrediction;
    const savedB = await investigatorB.submitExperiment(
      allowEffectsB,
      followUp
    );
    expect(savedB.valid).toBe(true);

    const afterB = importInterpretabilityResearchBundleV2(
      memory.getStoredJson(),
      schemas
    );
    expect(afterB.valid).toBe(true);
    if (!afterB.valid) return;
    const graph = afterB.bundle.evidenceGraph;
    expect(
      JSON.stringify(graph.evidence.find(record => record.id === 'evidence-a'))
    ).toBe(originalEvidenceJson);
    expect(
      graph.experiments.find(record => record.id === 'experiment-b')
        ?.predictions[0].expected
    ).toBe(derivedPrediction);
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        id: 'edge-b-depends-on-a',
        fromId: 'experiment-b',
        toId: 'evidence-a',
        relation: 'depends-on',
        authorId: 'investigator-b',
      })
    );
    expect(memory.loadPermissions).toEqual([
      allowEffectsA,
      allowEffectsB,
      allowEffectsB,
    ]);
    expect(memory.savePermissions).toEqual([allowEffectsA, allowEffectsB]);
  });

  it('persists a validated estimate with V3 identity lineage and the same permission token', async () => {
    const allowEffects = createAllowEffects();
    const memory = createMemoryAdapter(
      createPortableBundle(createEvidenceGraph())
    );

    const saved = await memory.service.submitEstimate(
      allowEffects,
      createEstimate()
    );

    expect(saved.valid).toBe(true);
    expect(memory.loadPermissions).toEqual([allowEffects]);
    expect(memory.savePermissions).toEqual([allowEffects]);

    const imported = importInterpretabilityResearchBundleV2(
      memory.getStoredJson(),
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.bundle.evidenceGraph.estimates).toEqual([createEstimate()]);
    expect(imported.bundle.mechanismIdentityLinks).toHaveLength(1);
  });

  it('does not persist estimates with invalid schemas or unresolved references', async () => {
    const allowEffects = createAllowEffects();
    const initialJson = createPortableBundle(createEvidenceGraph());
    const memory = createMemoryAdapter(initialJson);
    const invalid = createEstimate();
    invalid.metric.value = 1.2;

    const rejectedSchema = await memory.service.submitEstimate(
      allowEffects,
      invalid
    );
    const unresolved = createEstimate();
    unresolved.id = 'estimate-unresolved';
    unresolved.hypothesisIds = ['missing-hypothesis'];
    const rejectedReference = await memory.service.submitEstimate(
      allowEffects,
      unresolved
    );
    const duplicate = createEstimate();
    duplicate.id = 'hypothesis-a';
    const rejectedDuplicate = await memory.service.submitEstimate(
      allowEffects,
      duplicate
    );

    expect(rejectedSchema.valid).toBe(false);
    expect(rejectedReference.valid).toBe(false);
    expect(rejectedDuplicate.valid).toBe(false);
    expect(memory.loadPermissions).toEqual([
      allowEffects,
      allowEffects,
      allowEffects,
    ]);
    expect(memory.savePermissions).toEqual([]);

    const missingEstimateSchema = createMemoryAdapter(initialJson, {
      ...schemas,
      evidenceGraphSchemasV1: {
        ...schemas.evidenceGraphSchemasV1,
        mechanisticEstimateSchemaV1: undefined,
      },
    });
    const rejectedMissingValidator =
      await missingEstimateSchema.service.submitEstimate(
        allowEffects,
        createEstimate()
      );
    expect(rejectedMissingValidator.valid).toBe(false);
    expect(missingEstimateSchema.loadPermissions).toEqual([allowEffects]);
    expect(missingEstimateSchema.savePermissions).toEqual([]);
  });

  it('returns import failures without reading context or writing data', async () => {
    const allowEffects = createAllowEffects();
    const memory = createMemoryAdapter('{');
    const context = await memory.service.readContext(allowEffects, {
      mechanismId: 'mechanism-a',
    });
    const submission = await memory.service.submitExperiment(
      allowEffects,
      createSubmission(14)
    );

    expect(context).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(submission).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(memory.loadPermissions).toEqual([allowEffects, allowEffects]);
    expect(memory.savePermissions).toEqual([]);
  });

  it('does not save a V2 bundle whose recurrent identities cannot migrate to V3', async () => {
    const allowEffects = createAllowEffects();
    const memory = createMemoryAdapter(
      createPortableBundle(createEvidenceGraph('recurrent-state'), false)
    );
    const result = await memory.service.submitExperiment(
      allowEffects,
      createSubmission(14)
    );

    expect(result.valid).toBe(false);
    expect(memory.loadPermissions).toEqual([allowEffects]);
    expect(memory.savePermissions).toEqual([]);
  });
});
