import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  createInterpretabilityResearchServiceV1,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  exportInterpretabilityResearchBundleV2,
  exportInterpretabilityResearchBundleV3,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

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
 * Create an in-memory storage adapter that records permission forwarding.
 * @param {string} initialJson Initial portable research bundle.
 * @returns {Record<string, any>} Service, observed permissions, and stored JSON.
 */
function createMemoryAdapter(initialJson) {
  let storedJson = initialJson;
  const loadPermissions = [];
  const savePermissions = [];
  const service = createInterpretabilityResearchServiceV1({
    loadBundle: async allowEffects => {
      loadPermissions.push(allowEffects);
      return storedJson;
    },
    saveBundle: async (allowEffects, json) => {
      savePermissions.push(allowEffects);
      storedJson = json;
    },
    schemas,
  });
  return {
    service,
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
  const result = exporter(
    {
      evidenceGraph,
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
  if (!result.valid) throw new Error('Fixture bundle failed validation.');
  return result.json;
}

describe('permission-aware interpretability research service V1', () => {
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
