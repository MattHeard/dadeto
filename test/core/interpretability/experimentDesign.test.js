import {
  appendExperimentDesignV1,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  createNativeNeuronComponentV2,
  exportInterpretabilityResearchBundleV6,
  exportInterpretabilityResearchBundleV7,
  importInterpretabilityResearchBundleV7,
  importInterpretabilityResearchBundleV2,
  validateExperimentDesignCollectionV1,
} from '../../../src/core/interpretability/interpretability.js';
import { createTestZod } from './testZod.js';

const model = {
  modelId: 'test-model',
  repository: 'https://huggingface.co/example/test-model',
  revision: 'a'.repeat(40),
  architecture: 'GPT2LMHeadModel',
  checkpoint: {
    sha256: 'b'.repeat(64),
    trainingRunId: 'test-run-1',
  },
};
const z = createTestZod();
const schemas = {
  evidenceGraphSchemasV1: createInterpretabilitySchemasV1(z),
  identityGraphSchemasV2: createInterpretabilitySchemasV2(z),
};

/**
 * Create a complete V6 bundle with one attributable evidence trail.
 * @returns {Record<string, any>} Portable input bundle.
 */
function createBundle() {
  const mechanism = {
    schemaVersion: 1,
    id: 'mechanism-a',
    model,
    layerIndex: 0,
    activationHook: 'blocks.0.mlp.output',
    kind: 'native-neuron',
    sourceId: 'mlp',
    neuronIndex: 3,
  };
  const hypothesis = {
    schemaVersion: 1,
    id: 'hypothesis-a',
    revision: 1,
    claim: 'The feature responds to an explicit boundary cue.',
    status: 'proposed',
    mechanismIds: [mechanism.id],
    evidenceIds: ['evidence-a'],
    authorId: 'researcher-a',
    createdAt: '2026-10-24T08:00:00Z',
  };
  const experiment = {
    schemaVersion: 1,
    id: 'experiment-a',
    status: 'completed',
    model,
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    procedure: {
      repository: 'https://github.com/example/atlas-fixture',
      revision: 'c'.repeat(40),
      path: 'experiment.js',
    },
    seed: 17,
    inputSplitId: 'fixture-split-a',
    runtime: { implementation: 'deterministic-fixture' },
    predictions: [{ target: 'activation', expected: 'higher on boundary cue' }],
    observations: [
      { kind: 'negative', summary: 'The cue did not change the response.' },
    ],
    authorId: 'researcher-a',
    createdAt: '2026-10-24T08:01:00Z',
  };
  const evidence = {
    schemaVersion: 1,
    id: 'evidence-a',
    kind: 'negative',
    summary: 'A prior cue substitution failed to change the response.',
    mechanismIds: [mechanism.id],
    hypothesisIds: [hypothesis.id],
    experimentIds: [experiment.id],
    validationState: 'unreviewed',
    authorId: 'researcher-b',
    createdAt: '2026-10-24T08:02:00Z',
  };
  const component = createNativeNeuronComponentV2(model, 'mlp', {
    layerIndex: 0,
    activationHook: mechanism.activationHook,
    neuronIndex: mechanism.neuronIndex,
  });
  return {
    evidenceGraph: {
      mechanisms: [mechanism],
      hypotheses: [hypothesis],
      experiments: [experiment],
      estimates: [],
      evidence: [evidence],
      edges: [
        {
          schemaVersion: 1,
          id: 'edge-a',
          fromId: experiment.id,
          toId: evidence.id,
          relation: 'contradicts',
          authorId: 'researcher-b',
          createdAt: '2026-10-24T08:03:00Z',
        },
      ],
    },
    identityGraph: {
      components: [component],
      activationPositions: [],
      observations: [],
      structuralConnections: [],
      circuitSnapshots: [],
    },
    accuracyEvaluations: [],
    identityReferences: [],
  };
}

/**
 * Create a falsifiable proposal grounded in the current fixture evidence.
 * @param {string} id Unique plan ID.
 * @param {Array<Record<string, any>>} [citations] Optional citations.
 * @returns {Record<string, any>} Unexecuted plan.
 */
function createDesign(id = 'design-a', citations) {
  const bundle = createBundle();
  const component = bundle.identityGraph.components[0];
  return {
    schemaVersion: 1,
    id,
    status: 'proposed',
    executionStatus: 'untested',
    authorId: 'agent-a',
    agentId: 'atlas-researcher',
    createdAt: '2026-10-24T09:00:00Z',
    mechanism: {
      mechanismId: 'mechanism-a',
      componentId: component.id,
      model,
    },
    contextSnapshotId: `atlas:context:v1:${'d'.repeat(64)}`,
    citations: citations ?? [
      {
        targetType: 'hypothesis',
        targetId: 'hypothesis-a',
        relation: 'motivated-by',
      },
      {
        targetType: 'evidence',
        targetId: 'evidence-a',
        relation: 'challenges',
      },
    ],
    uncertainty:
      'The failed cue substitution may have used insufficiently distinct inputs.',
    favoredHypothesis: 'Activation follows the structural boundary cue.',
    alternativeHypothesis: {
      kind: 'null',
      statement: 'Activation is invariant to the boundary cue.',
    },
    test: {
      inputSelection:
        'Choose held-out pairs with identical payload and one boundary marker difference.',
      inputConstruction:
        'Swap only the boundary marker while preserving token count and surrounding text.',
      measurements: ['Mean activation at the selected component and position.'],
      interventions: [
        'Replace the boundary marker with a length-matched neutral marker.',
      ],
      controls: ['Use matched pairs without a boundary marker.'],
      expectedOutcomes: [
        {
          hypothesis: 'favored',
          observation:
            'Matched boundary swaps change activation in the predicted direction.',
        },
        {
          hypothesis: 'alternative',
          observation:
            'Boundary swaps produce no reliable activation difference.',
        },
      ],
      weakeningCondition:
        'The favored account is weakened if boundary swaps remain within the control variation.',
    },
    reproducibility: {
      status: 'not-yet-executable',
      inputSpecification:
        'No held-out sequences are selected or serialized yet.',
      budget: {
        maxInputs: 64,
        maxComputeUnits: 2,
        computeUnit: 'GPU-hours',
      },
      sourceReferences: [],
    },
  };
}

/**
 * Export and reload a V6 baseline before testing additive design support.
 * @param {Record<string, any>} [bundle] Source bundle.
 * @returns {Record<string, any>} Validated bundle.
 */
function importV6(bundle = createBundle()) {
  const exported = exportInterpretabilityResearchBundleV6(bundle, schemas);
  expect(exported.valid).toBe(true);
  if (!exported.valid) throw new Error('fixture must export as V6');
  const imported = importInterpretabilityResearchBundleV2(
    exported.json,
    schemas
  );
  expect(imported.valid).toBe(true);
  if (!imported.valid) throw new Error('fixture must import as V6');
  return imported.bundle;
}

describe('Atlas experiment design V1', () => {
  it('rejects malformed V7 envelopes and invalid design collections', () => {
    expect(exportInterpretabilityResearchBundleV7(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(importInterpretabilityResearchBundleV7(null, schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV7('{', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-json' }],
    });
    expect(importInterpretabilityResearchBundleV7('[]', schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-document' }],
    });
    expect(
      importInterpretabilityResearchBundleV7(
        JSON.stringify({ schemaVersion: 8, experimentDesigns: [] }),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify({ schemaVersion: 8 }),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'unsupported-version' }],
    });
    expect(
      importInterpretabilityResearchBundleV7(
        JSON.stringify({
          schemaVersion: 7,
          experimentDesigns: [],
          extra: true,
        }),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      importInterpretabilityResearchBundleV7(
        JSON.stringify({ schemaVersion: 7 }),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      importInterpretabilityResearchBundleV7(
        JSON.stringify({
          schemaVersion: 7,
          evidenceGraph: {},
          identityGraph: {},
          mechanismIdentityLinks: [],
          accuracyEvaluations: [],
          experimentDesigns: [],
        }),
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-evidence-graph' }],
    });
  });

  it('validates V7 exports and design context references', () => {
    const missingDesignSchema = {
      ...schemas,
      evidenceGraphSchemasV1: {
        ...schemas.evidenceGraphSchemasV1,
        experimentDesignSchemaV1: undefined,
      },
    };
    const validBase = importV6();
    expect(
      exportInterpretabilityResearchBundleV7(validBase, schemas).valid
    ).toBe(true);
    expect(exportInterpretabilityResearchBundleV7({}, schemas)).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'invalid-evidence-graph' })],
    });
    const graphSchema = schemas.identityGraphSchemasV2.identityGraphSchemaV3;
    let graphSchemaCalls = 0;
    const failsDuringImport = {
      ...schemas,
      identityGraphSchemasV2: {
        ...schemas.identityGraphSchemasV2,
        identityGraphSchemaV3: {
          safeParse: value => {
            graphSchemaCalls += 1;
            return graphSchemaCalls === 1
              ? graphSchema.safeParse(value)
              : { success: false, error: { issues: [] } };
          },
        },
      },
    };
    expect(
      exportInterpretabilityResearchBundleV7(validBase, failsDuringImport)
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'invalid-identity-graph' })],
    });
    expect(
      exportInterpretabilityResearchBundleV7(
        { ...validBase, experimentDesigns: [] },
        missingDesignSchema
      )
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'invalid-experiment-designs' })],
    });
    const exported = exportInterpretabilityResearchBundleV7(
      { ...validBase, experimentDesigns: [createDesign()] },
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const invalidDesignEnvelope = JSON.parse(exported.json);
    invalidDesignEnvelope.experimentDesigns[0].unexpected = true;
    expect(
      importInterpretabilityResearchBundleV2(
        JSON.stringify(invalidDesignEnvelope),
        schemas
      ).valid
    ).toBe(false);
    expect(
      validateExperimentDesignCollectionV1(
        {},
        validBase,
        schemas.evidenceGraphSchemasV1.experimentDesignSchemaV1
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-experiment-designs' }],
    });
    expect(
      validateExperimentDesignCollectionV1([], validBase, undefined)
    ).toEqual({
      valid: false,
      errors: [{ code: 'missing-experiment-design-schema' }],
    });
    expect(
      validateExperimentDesignCollectionV1(
        [],
        {},
        schemas.evidenceGraphSchemasV1.experimentDesignSchemaV1
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-experiment-design-context' }],
    });

    const unknownComponent = createDesign('design-missing-component');
    unknownComponent.mechanism.componentId = 'component-missing';
    expect(
      validateExperimentDesignCollectionV1(
        [unknownComponent],
        {
          ...validBase,
          mechanismIdentityLinks: [
            {
              legacyMechanismId: 'mechanism-a',
              componentId: 'component-missing',
            },
          ],
        },
        schemas.evidenceGraphSchemasV1.experimentDesignSchemaV1
      )
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'unknown-design-component' })],
    });
  });

  it('rejects incoherent design citations and reproducibility claims', () => {
    const validBase = importV6();
    const permissiveSchemas = {
      ...schemas,
      evidenceGraphSchemasV1: {
        ...schemas.evidenceGraphSchemasV1,
        experimentDesignSchemaV1: {
          safeParse: data => ({ success: true, data }),
        },
      },
    };
    const selfReference = createDesign('design-self-reference');
    selfReference.citations[0].targetId = selfReference.id;
    expect(
      appendExperimentDesignV1(validBase, selfReference, permissiveSchemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({
          code: 'self-referential-or-duplicate-design-citation',
        }),
      ],
    });

    const duplicateCitation = createDesign('design-duplicate-citation', [
      {
        targetType: 'hypothesis',
        targetId: 'hypothesis-a',
        relation: 'motivated-by',
      },
      {
        targetType: 'evidence',
        targetId: 'evidence-a',
        relation: 'challenges',
      },
      {
        targetType: 'evidence',
        targetId: 'evidence-a',
        relation: 'tests',
      },
    ]);
    expect(
      appendExperimentDesignV1(validBase, duplicateCitation, permissiveSchemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({
          code: 'self-referential-or-duplicate-design-citation',
        }),
      ],
    });

    const noEvidenceCitation = createDesign(
      'design-missing-evidence-citation',
      [
        {
          targetType: 'hypothesis',
          targetId: 'hypothesis-a',
          relation: 'motivated-by',
        },
        {
          targetType: 'hypothesis',
          targetId: 'hypothesis-missing',
          relation: 'tests',
        },
      ]
    );
    expect(
      appendExperimentDesignV1(validBase, noEvidenceCitation, permissiveSchemas)
    ).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'missing-typed-design-citations' }),
      ]),
    });

    const noHypothesis = createDesign('design-no-hypothesis-citation', [
      {
        targetType: 'evidence',
        targetId: 'evidence-a',
        relation: 'challenges',
      },
      {
        targetType: 'evidence',
        targetId: 'evidence-b',
        relation: 'tests',
        unresolvedSource: {
          source: 'research-note:evidence-b',
          recordedAt: '2026-10-24T10:00:00Z',
        },
      },
    ]);
    expect(
      schemas.evidenceGraphSchemasV1.experimentDesignSchemaV1.safeParse(
        noHypothesis
      ).success
    ).toBe(false);

    const executable = createDesign('design-executable-envelope');
    executable.reproducibility = {
      ...executable.reproducibility,
      status: 'executable',
      procedure: {
        repository: 'https://github.com/example/atlas-fixture',
        revision: 'e'.repeat(40),
        path: 'experiments/run.js',
      },
    };
    expect(
      schemas.evidenceGraphSchemasV1.experimentDesignSchemaV1.safeParse(
        executable
      ).success
    ).toBe(true);

    const contradictoryResolution = createDesign('design-invalid-resolution');
    contradictoryResolution.citations[1].unresolvedSource = {
      source: 'external-source:already-indexed',
      recordedAt: '2026-10-24T10:00:00Z',
    };
    expect(
      appendExperimentDesignV1(validBase, contradictoryResolution, schemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'invalid-resolved-design-citation' }),
      ],
    });
  });
});

describe('Atlas experiment design V1 portable records', () => {
  it('appends an immutable, evidence-linked plan and round-trips through V7', () => {
    const initial = importV6();
    const original = structuredClone(initial);
    const appended = appendExperimentDesignV1(initial, createDesign(), schemas);

    expect(appended.valid).toBe(true);
    if (!appended.valid) return;
    expect(initial).toEqual(original);
    expect(appended.bundle.experimentDesigns).toHaveLength(1);
    expect(appended.bundle.experimentDesigns[0].executionStatus).toBe(
      'untested'
    );
    expect(appended.bundle.evidenceGraph).toEqual(initial.evidenceGraph);

    const exported = exportInterpretabilityResearchBundleV7(
      appended.bundle,
      schemas
    );
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const envelope = JSON.parse(exported.json);
    expect(envelope.schemaVersion).toBe(7);
    expect(envelope.experimentDesigns).toEqual([createDesign()]);
    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (imported.valid)
      expect(imported.bundle.experimentDesigns).toEqual([createDesign()]);
  });

  it('sorts plans by immutable ID and preserves unresolved source-bound citations', () => {
    let bundle = importV6();
    const first = appendExperimentDesignV1(
      bundle,
      createDesign('design-z'),
      schemas
    );
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    const unresolved = createDesign('design-a', [
      {
        targetType: 'hypothesis',
        targetId: 'hypothesis-a',
        relation: 'motivated-by',
      },
      {
        targetType: 'evidence',
        targetId: 'unindexed-evidence',
        relation: 'challenges',
        unresolvedSource: {
          source: 'research-note:unindexed-evidence',
          recordedAt: '2026-10-24T09:03:00Z',
        },
      },
    ]);
    const second = appendExperimentDesignV1(first.bundle, unresolved, schemas);
    expect(second.valid).toBe(true);
    if (!second.valid) return;
    bundle = second.bundle;

    expect(bundle.experimentDesigns.map(item => item.id)).toEqual([
      'design-a',
      'design-z',
    ]);
    expect(bundle.identityReferences).toContainEqual({
      schemaVersion: 1,
      claimId: 'atlas:design-reference:design-a:evidence:unindexed-evidence',
      entityType: 'evidence',
      entityId: 'unindexed-evidence',
      authorId: 'agent-a',
      source: 'research-note:unindexed-evidence',
      sourceRecordId: 'design-a',
      recordedAt: '2026-10-24T09:03:00Z',
    });
    const exported = exportInterpretabilityResearchBundleV7(bundle, schemas);
    expect(exported.valid).toBe(true);
    if (!exported.valid) return;
    const imported = importInterpretabilityResearchBundleV2(
      exported.json,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (imported.valid) {
      expect(imported.bundle.experimentDesigns).toEqual(
        bundle.experimentDesigns
      );
      expect(imported.bundle.identityReferences).toEqual(
        bundle.identityReferences
      );
    }
  });

  it('rejects malformed, duplicate, cross-checkpoint, and unresolved citations', () => {
    const bundle = importV6();
    const valid = appendExperimentDesignV1(bundle, createDesign(), schemas);
    expect(valid.valid).toBe(true);
    if (!valid.valid) return;

    expect(
      appendExperimentDesignV1(valid.bundle, createDesign(), schemas)
    ).toEqual({
      valid: false,
      errors: [{ code: 'duplicate-experiment-design-id', id: 'design-a' }],
    });

    const malformed = createDesign('design-malformed');
    malformed.measurements = ['fabricated observed activation'];
    expect(appendExperimentDesignV1(bundle, malformed, schemas).valid).toBe(
      false
    );

    const crossCheckpoint = createDesign('design-checkpoint');
    crossCheckpoint.mechanism.model = {
      ...model,
      checkpoint: { sha256: 'c'.repeat(64), trainingRunId: 'other-run' },
    };
    const checkpointResult = appendExperimentDesignV1(
      bundle,
      crossCheckpoint,
      schemas
    );
    expect(checkpointResult.valid).toBe(false);
    if (!checkpointResult.valid)
      expect(checkpointResult.errors[0].code).toBe('cross-checkpoint-design');

    const unresolved = createDesign('design-unresolved');
    unresolved.citations[1].targetId = 'unindexed-evidence';
    const unresolvedResult = appendExperimentDesignV1(
      bundle,
      unresolved,
      schemas
    );
    expect(unresolvedResult.valid).toBe(false);
    if (!unresolvedResult.valid)
      expect(unresolvedResult.errors[0].code).toBe(
        'unresolved-design-citation'
      );

    const unknownMechanism = createDesign('design-unknown-mechanism');
    unknownMechanism.mechanism.mechanismId = 'mechanism-unknown';
    expect(
      appendExperimentDesignV1(bundle, unknownMechanism, schemas)
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'unknown-design-mechanism' })],
    });

    const unknownComponent = createDesign('design-unknown-component');
    unknownComponent.mechanism.componentId = 'component-unknown';
    expect(
      appendExperimentDesignV1(bundle, unknownComponent, schemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'invalid-design-mechanism-lineage' }),
      ],
    });

    const sameCheckpointDifferentModel = createDesign(
      'design-model-identity-mismatch'
    );
    sameCheckpointDifferentModel.mechanism.model = {
      ...model,
      architecture: 'OtherArchitecture',
    };
    expect(
      appendExperimentDesignV1(bundle, sameCheckpointDifferentModel, schemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'design-model-identity-mismatch' }),
      ],
    });
  });

  it('returns stable append failures before persistence for invalid inputs', () => {
    expect(appendExperimentDesignV1(null, createDesign(), schemas)).toEqual({
      valid: false,
      errors: [{ code: 'invalid-research-bundle' }],
    });
    expect(
      appendExperimentDesignV1(
        { ...importV6(), experimentDesigns: null },
        createDesign(),
        schemas
      )
    ).toEqual({
      valid: false,
      errors: [{ code: 'invalid-experiment-designs' }],
    });
    expect(appendExperimentDesignV1({}, createDesign(), schemas)).toMatchObject(
      {
        valid: false,
        errors: [expect.objectContaining({ code: 'invalid-evidence-graph' })],
      }
    );
    expect(
      appendExperimentDesignV1(importV6(), createDesign(), {
        ...schemas,
        evidenceGraphSchemasV1: {
          ...schemas.evidenceGraphSchemasV1,
          experimentDesignSchemaV1: undefined,
        },
      })
    ).toEqual({
      valid: false,
      errors: [{ code: 'missing-experiment-design-schema' }],
    });

    const graphSchema = schemas.identityGraphSchemasV2.identityGraphSchemaV3;
    let graphSchemaCalls = 0;
    const failsAfterExport = {
      ...schemas,
      identityGraphSchemasV2: {
        ...schemas.identityGraphSchemasV2,
        identityGraphSchemaV3: {
          safeParse: value => {
            graphSchemaCalls += 1;
            return graphSchemaCalls === 1
              ? graphSchema.safeParse(value)
              : { success: false, error: { issues: [] } };
          },
        },
      },
    };
    expect(
      appendExperimentDesignV1(importV6(), createDesign(), failsAfterExport)
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'invalid-identity-graph' })],
    });
  });

  it('keeps legacy V6 exports explicit about unsupported plan loss', () => {
    const imported = importV6();
    const appended = appendExperimentDesignV1(
      imported,
      createDesign(),
      schemas
    );
    expect(appended.valid).toBe(true);
    if (!appended.valid) return;
    const { experimentDesigns, ...legacyBundle } = appended.bundle;
    expect(experimentDesigns).toHaveLength(1);
    expect(
      exportInterpretabilityResearchBundleV6(appended.bundle, schemas)
    ).toEqual({
      valid: false,
      errors: [{ code: 'unsupported-experiment-designs' }],
    });
    expect(
      exportInterpretabilityResearchBundleV6(legacyBundle, schemas).valid
    ).toBe(true);
  });
});
