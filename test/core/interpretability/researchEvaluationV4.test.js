import {
  appendAccuracyEvaluationV1,
  createInterpretabilityResearchServiceV1,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
  exportInterpretabilityResearchBundleV2,
  exportInterpretabilityResearchBundleV3,
  exportInterpretabilityResearchBundleV4,
  importInterpretabilityResearchBundleV2,
} from '../../../src/core/interpretability/interpretability.js';
import { evaluateAlgZooWholeModelAccuracyV1 } from '../../../src/core/interpretability/algZooPilotHarness/index.js';
import { createTestZod } from './testZod.js';

const model = {
  modelId: 'alg-zoo-m16-10',
  repository: 'https://huggingface.co/example/alg-zoo-m16-10',
  revision: 'a'.repeat(40),
  architecture: 'RecurrentNeuralNetwork',
};
const evidenceSchemas = createInterpretabilitySchemasV1(createTestZod());
const identitySchemas = createInterpretabilitySchemasV2(createTestZod());
const schemas = {
  evidenceGraphSchemasV1: evidenceSchemas,
  identityGraphSchemasV2: identitySchemas,
};
const identityGraph = {
  components: [],
  activationPositions: [],
  observations: [],
  structuralConnections: [],
  circuitSnapshots: [],
};

/**
 * Make deterministic held-out inputs for all four preregistered scales.
 * @returns {Record<string, any>} Synthetic evaluation measurements.
 */
function syntheticMeasurements() {
  const heldOutSplitId = 'algzoo-held-out-synthetic-v1';
  const variants = [];
  for (const noiseScale of [0.01, 0.05, 0.1, 0.2]) {
    for (let replicate = 0; replicate < 8; replicate += 1) {
      const referenceAccuracy = 0.96 - noiseScale * 0.5 - replicate * 0.001;
      variants.push({
        variantId: `noise-${noiseScale}-replicate-${replicate}`,
        heldOutSplitId,
        noiseScale,
        referenceAccuracy,
        mechanisticEstimate: referenceAccuracy - 0.08,
        samplingEstimate: referenceAccuracy - 0.05,
        mechanisticCompute: 100000,
        samplingCompute: 100000,
      });
    }
  }
  return {
    heldOutSplitId,
    sampleCountPerVariant: 100000,
    samplingBaseline: {
      method: {
        repository: 'https://github.com/example/monte-carlo-baseline',
        revision: 'c'.repeat(40),
        path: 'baseline/accuracy.js',
      },
      seedCommitment: 'b'.repeat(64),
    },
    variants,
  };
}

/**
 * Build one valid estimate corresponding exactly to one report variant.
 * @param {Record<string, any>} variant Evaluated synthetic variant.
 * @returns {Record<string, any>} Versioned estimate record.
 */
function estimateForVariant(variant) {
  return {
    schemaVersion: 1,
    id: `estimate-${variant.variantId}`,
    model,
    metric: { name: 'accuracy', value: variant.mechanisticEstimate },
    uncertainty: { lower: 0.8, upper: 0.99, method: 'synthetic interval' },
    compute: { quantity: 100000, unit: 'forward evaluations' },
    method: {
      repository: 'https://github.com/example/mechanistic-estimator',
      revision: 'd'.repeat(40),
      path: 'estimator/accuracy.js',
    },
    assumptions: ['deterministic synthetic fixture'],
    hypothesisIds: [],
    evidenceIds: [],
    heldOutSplitId: variant.heldOutSplitId,
    authorId: 'researcher-a',
    createdAt: '2026-10-20T12:00:00Z',
  };
}

/**
 * Create a V4 bundle and linked evaluation from deterministic synthetic values.
 * @returns {{bundle: Record<string, any>, evaluation: Record<string, any>}} Fixture records.
 */
function createEvaluationFixture() {
  const comparison = evaluateAlgZooWholeModelAccuracyV1(
    syntheticMeasurements()
  );
  if (!comparison.valid)
    throw new Error('Synthetic evaluation fixture invalid.');
  const estimates = comparison.report.variants.map(estimateForVariant);
  const estimateByVariantId = new Map(
    comparison.report.variants.map((variant, index) => [
      variant.variantId,
      estimates[index],
    ])
  );
  const evaluation = {
    schemaVersion: 1,
    id: 'accuracy-evaluation-1',
    estimateLinks: comparison.report.variants.map(variant => ({
      variantId: variant.variantId,
      estimateId: estimateByVariantId.get(variant.variantId).id,
    })),
    report: comparison.report,
    authorId: 'researcher-b',
    createdAt: '2026-10-20T12:05:00Z',
  };
  return {
    bundle: {
      evidenceGraph: {
        mechanisms: [],
        hypotheses: [],
        experiments: [],
        estimates,
        evidence: [],
        edges: [],
      },
      identityGraph,
      mechanismIdentityLinks: [],
      accuracyEvaluations: [],
    },
    evaluation,
  };
}

/**
 * Assert that a report mutation is rejected with the expected validation code.
 * @param {Record<string, any>} bundle Existing portable research bundle.
 * @param {Record<string, any>} evaluation Mutated report record.
 * @param {string} code Expected stable validation error.
 */
function expectEvaluationValidationError(bundle, evaluation, code) {
  expect(appendAccuracyEvaluationV1(bundle, evaluation, schemas)).toMatchObject(
    {
      valid: false,
      errors: expect.arrayContaining([expect.objectContaining({ code })]),
    }
  );
}

describe('portable held-out accuracy evaluations V4', () => {
  it('appends a validated report immutably and links every variant to its estimate', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const original = JSON.parse(JSON.stringify(bundle));
    const appended = appendAccuracyEvaluationV1(bundle, evaluation, schemas);

    expect(appended.valid).toBe(true);
    if (!appended.valid) return;
    expect(bundle).toEqual(original);
    expect(appended.bundle.accuracyEvaluations).toEqual([evaluation]);
    expect(appended.bundle.accuracyEvaluations[0].report.overall).toEqual(
      evaluation.report.overall
    );
    expect(evaluation.report.overall.mechanisticMse).toBeGreaterThan(
      evaluation.report.overall.samplingMse
    );
  });

  it('rejects invalid schema, duplicate IDs, missing estimate links, and mismatched estimates', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const invalidSchema = structuredClone(evaluation);
    invalidSchema.report.sampleCountPerVariant = 99999;
    expect(
      appendAccuracyEvaluationV1(bundle, invalidSchema, schemas)
    ).toMatchObject({ valid: false });

    const duplicate = structuredClone(evaluation);
    duplicate.id = bundle.evidenceGraph.estimates[0].id;
    expect(
      appendAccuracyEvaluationV1(bundle, duplicate, schemas)
    ).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'duplicate-id' })],
    });

    const unresolved = structuredClone(evaluation);
    unresolved.estimateLinks[0].estimateId = 'missing-estimate';
    expect(
      appendAccuracyEvaluationV1(bundle, unresolved, schemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'unresolved-estimate-reference' }),
      ],
    });

    const mismatched = structuredClone(evaluation);
    const estimateId = mismatched.estimateLinks[0].estimateId;
    bundle.evidenceGraph.estimates.find(
      record => record.id === estimateId
    ).metric.value = 0.1;
    expect(
      appendAccuracyEvaluationV1(bundle, mismatched, schemas)
    ).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'mismatched-estimate-reference' }),
      ],
    });

    const missingValidator = {
      ...schemas,
      evidenceGraphSchemasV1: {
        ...schemas.evidenceGraphSchemasV1,
        accuracyEvaluationSchemaV1: undefined,
      },
    };
    expect(
      appendAccuracyEvaluationV1(bundle, evaluation, missingValidator)
    ).toMatchObject({ valid: false });
  });

  it('round-trips V4 evaluations and keeps V2/V3 imports valid with no reports', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const emptyV4 = exportInterpretabilityResearchBundleV4(bundle, schemas);
    expect(emptyV4.valid).toBe(true);
    if (emptyV4.valid) {
      const importedEmpty = importInterpretabilityResearchBundleV2(
        emptyV4.json,
        schemas
      );
      expect(importedEmpty.valid).toBe(true);
      if (importedEmpty.valid) {
        expect(importedEmpty.bundle.accuracyEvaluations).toEqual([]);
      }
    }
    const v4 = exportInterpretabilityResearchBundleV4(
      { ...bundle, accuracyEvaluations: [evaluation] },
      schemas
    );
    expect(v4.valid).toBe(true);
    if (!v4.valid) return;
    const importedV4 = importInterpretabilityResearchBundleV2(v4.json, schemas);
    expect(importedV4.valid).toBe(true);
    if (!importedV4.valid) return;
    expect(importedV4.bundle.accuracyEvaluations).toEqual([evaluation]);
    expect(importedV4.bundle.evidenceGraph.estimates).toEqual(
      bundle.evidenceGraph.estimates
    );

    const legacyBundle = { ...bundle, accuracyEvaluations: [] };
    for (const exporter of [
      exportInterpretabilityResearchBundleV2,
      exportInterpretabilityResearchBundleV3,
    ]) {
      const legacy = exporter(legacyBundle, schemas);
      expect(legacy.valid).toBe(true);
      if (!legacy.valid) continue;
      const imported = importInterpretabilityResearchBundleV2(
        legacy.json,
        schemas
      );
      expect(imported.valid).toBe(true);
      if (imported.valid)
        expect(imported.bundle.accuracyEvaluations).toEqual([]);
    }
    expect(
      exportInterpretabilityResearchBundleV3(
        { ...bundle, accuracyEvaluations: [evaluation] },
        schemas
      )
    ).toMatchObject({ valid: false });

    const legacyAppendBundle = { ...bundle };
    delete legacyAppendBundle.accuracyEvaluations;
    expect(
      appendAccuracyEvaluationV1(legacyAppendBundle, evaluation, schemas)
    ).toMatchObject({ valid: true });
  });

  it('rejects malformed V4 collections, report coverage, and duplicate links', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    expect(
      exportInterpretabilityResearchBundleV4(
        { ...bundle, accuracyEvaluations: null },
        schemas
      )
    ).toMatchObject({ valid: false });

    const invalidSchema = structuredClone(evaluation);
    invalidSchema.report.sampleCountPerVariant = 99999;
    expect(
      exportInterpretabilityResearchBundleV4(
        { ...bundle, accuracyEvaluations: [invalidSchema] },
        schemas
      )
    ).toMatchObject({ valid: false });

    expect(
      exportInterpretabilityResearchBundleV4(
        { ...bundle, accuracyEvaluations: [evaluation, evaluation] },
        schemas
      )
    ).toMatchObject({ valid: false });

    const tooManyVariants = structuredClone(evaluation);
    const extraVariant = {
      ...tooManyVariants.report.variants[0],
      variantId: 'noise-extra-replicate-0',
    };
    tooManyVariants.report.variants.push(extraVariant);
    tooManyVariants.estimateLinks.push({
      variantId: extraVariant.variantId,
      estimateId: 'estimate-extra',
    });
    expect(
      appendAccuracyEvaluationV1(bundle, tooManyVariants, schemas)
    ).toMatchObject({ valid: false });

    const tooManyScaleSummaries = structuredClone(evaluation);
    tooManyScaleSummaries.report.byNoiseScale.push(
      tooManyScaleSummaries.report.byNoiseScale[0]
    );
    expect(
      appendAccuracyEvaluationV1(bundle, tooManyScaleSummaries, schemas)
    ).toMatchObject({ valid: false });

    const duplicateVariant = structuredClone(evaluation);
    duplicateVariant.report.variants[1].variantId =
      duplicateVariant.report.variants[0].variantId;
    expect(
      appendAccuracyEvaluationV1(bundle, duplicateVariant, schemas)
    ).toMatchObject({ valid: false });

    const unbalancedScale = structuredClone(evaluation);
    unbalancedScale.report.variants[0].noiseScale = 0.05;
    expect(
      appendAccuracyEvaluationV1(bundle, unbalancedScale, schemas)
    ).toMatchObject({ valid: false });

    const missingVariantLink = structuredClone(evaluation);
    missingVariantLink.estimateLinks[0].variantId = 'missing-variant';
    expect(
      appendAccuracyEvaluationV1(bundle, missingVariantLink, schemas)
    ).toMatchObject({ valid: false });

    const duplicateEstimateLink = structuredClone(evaluation);
    duplicateEstimateLink.estimateLinks[1].estimateId =
      duplicateEstimateLink.estimateLinks[0].estimateId;
    expect(
      appendAccuracyEvaluationV1(bundle, duplicateEstimateLink, schemas)
    ).toMatchObject({ valid: false });

    const noMaterialVariation = structuredClone(evaluation);
    noMaterialVariation.report.variants.forEach(variant => {
      variant.referenceAccuracy = 0.9;
    });
    expect(
      appendAccuracyEvaluationV1(bundle, noMaterialVariation, schemas)
    ).toMatchObject({ valid: false });

    const invalidSummary = structuredClone(evaluation);
    invalidSummary.report.byNoiseScale[0].noiseScale = 0.05;
    expect(
      appendAccuracyEvaluationV1(bundle, invalidSummary, schemas)
    ).toMatchObject({
      valid: false,
    });

    const malformedEnvelope = exportInterpretabilityResearchBundleV4(
      { ...bundle, accuracyEvaluations: [evaluation] },
      schemas
    );
    if (!malformedEnvelope.valid) return;
    const envelope = JSON.parse(malformedEnvelope.json);
    envelope.extra = true;
    expect(
      importInterpretabilityResearchBundleV2(JSON.stringify(envelope), schemas)
    ).toMatchObject({ valid: false });
    delete envelope.extra;
    envelope.accuracyEvaluations = null;
    expect(
      importInterpretabilityResearchBundleV2(JSON.stringify(envelope), schemas)
    ).toMatchObject({ valid: false });

    expect(appendAccuracyEvaluationV1(null, evaluation, schemas)).toMatchObject(
      { valid: false }
    );
    expect(
      appendAccuracyEvaluationV1(
        { ...bundle, evidenceGraph: null },
        evaluation,
        schemas
      )
    ).toMatchObject({ valid: false });
  });

  it('uses empty legacy collections and rejects invalid existing reports', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const legacyBundle = { ...bundle };
    delete legacyBundle.accuracyEvaluations;
    expect(
      appendAccuracyEvaluationV1(legacyBundle, evaluation, schemas)
    ).toMatchObject({ valid: true });

    expect(
      appendAccuracyEvaluationV1(
        { ...bundle, accuracyEvaluations: [evaluation, evaluation] },
        evaluation,
        schemas
      )
    ).toMatchObject({ valid: false });

    const unresolved = structuredClone(evaluation);
    unresolved.id = 'evaluation-without-estimates';
    unresolved.estimateLinks[0].estimateId = 'missing-estimate';
    expect(
      appendAccuracyEvaluationV1(
        { ...bundle, evidenceGraph: {} },
        unresolved,
        schemas
      )
    ).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'unresolved-estimate-reference' }),
      ]),
    });
  });

  it('rejects report summaries and provenance that disagree with variant rows', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const mutations = [
      [
        'invalid-accuracy-variant-provenance',
        report => {
          report.variants[0].heldOutSplitId = 'different-split';
        },
      ],
      [
        'invalid-accuracy-variant-provenance',
        report => {
          report.variants[0].samplingCompute += 1;
        },
      ],
      [
        'inconsistent-accuracy-overall-summary',
        report => {
          report.overall.mechanisticMse += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-overall-summary',
        report => {
          report.overall.samplingMse += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-scale-summary',
        report => {
          report.byNoiseScale[0].mechanisticMse += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-scale-summary',
        report => {
          report.byNoiseScale[0].samplingMse += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-reference-range',
        report => {
          report.referenceAccuracyRange.minimum += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-reference-range',
        report => {
          report.referenceAccuracyRange.maximum += 0.001;
        },
      ],
      [
        'inconsistent-accuracy-reference-range',
        report => {
          report.referenceAccuracyRange.spread += 0.001;
        },
      ],
    ];

    for (const [code, mutate] of mutations) {
      const invalid = structuredClone(evaluation);
      mutate(invalid.report);
      expectEvaluationValidationError(bundle, invalid, code);
    }
  });

  it('accepts floating-point summary differences within the documented tolerance', () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const rounded = structuredClone(evaluation);
    rounded.report.overall.mechanisticMse += 5e-13;
    rounded.report.referenceAccuracyRange.minimum += 5e-13;

    expect(appendAccuracyEvaluationV1(bundle, rounded, schemas)).toMatchObject({
      valid: true,
    });
  });

  it('persists through the service with the same token and preserves reports on later writes', async () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const initial = exportInterpretabilityResearchBundleV4(bundle, schemas);
    if (!initial.valid) throw new Error('Synthetic bundle fixture invalid.');
    let storedJson = initial.json;
    const loadPermissions = [];
    const savePermissions = [];
    const service = createInterpretabilityResearchServiceV1({
      loadBundle: async token => {
        loadPermissions.push(token);
        return storedJson;
      },
      saveBundle: async (token, json) => {
        savePermissions.push(token);
        storedJson = json;
      },
      schemas,
    });
    const token = Object.freeze({ testPermission: true });

    const saved = await service.submitEvaluation(token, evaluation);
    expect(saved.valid).toBe(true);
    expect(loadPermissions).toEqual([token]);
    expect(savePermissions).toEqual([token]);
    const imported = importInterpretabilityResearchBundleV2(
      storedJson,
      schemas
    );
    expect(imported.valid).toBe(true);
    if (!imported.valid) return;
    expect(imported.bundle.accuracyEvaluations).toEqual([evaluation]);

    const extraEstimate = estimateForVariant({
      variantId: 'later-estimate',
      heldOutSplitId: evaluation.report.heldOutSplitId,
      mechanisticEstimate: 0.5,
    });
    extraEstimate.id = 'estimate-later';
    const nextWrite = await service.submitEstimate(token, extraEstimate);
    expect(nextWrite.valid).toBe(true);
    const afterNextWrite = importInterpretabilityResearchBundleV2(
      storedJson,
      schemas
    );
    expect(afterNextWrite.valid).toBe(true);
    if (afterNextWrite.valid) {
      expect(afterNextWrite.bundle.accuracyEvaluations).toEqual([evaluation]);
    }
    expect(loadPermissions).toEqual([token, token]);
    expect(savePermissions).toEqual([token, token]);

    const rejected = await service.submitEvaluation(token, {
      ...evaluation,
      id: 'invalid-evaluation',
      report: { ...evaluation.report, variantCount: 12 },
    });
    expect(rejected.valid).toBe(false);

    const duplicateId = await service.submitEvaluation(token, {
      ...evaluation,
      id: bundle.evidenceGraph.estimates[0].id,
    });
    expect(duplicateId).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'duplicate-id' })],
    });

    const unresolvedReference = structuredClone(evaluation);
    unresolvedReference.id = 'unresolved-evaluation';
    unresolvedReference.estimateLinks[0].estimateId = 'missing-estimate';
    const unresolved = await service.submitEvaluation(
      token,
      unresolvedReference
    );
    expect(unresolved).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ code: 'unresolved-estimate-reference' }),
      ],
    });
    expect(savePermissions).toEqual([token, token]);
  });
});

describe('permission-aware held-out accuracy report reads', () => {
  it('reads persisted reports with the same permission token, including negative results', async () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const initial = exportInterpretabilityResearchBundleV4(
      { ...bundle, accuracyEvaluations: [evaluation] },
      schemas
    );
    if (!initial.valid) throw new Error('Synthetic bundle fixture invalid.');
    const loadPermissions = [];
    const savePermissions = [];
    const service = createInterpretabilityResearchServiceV1({
      loadBundle: async token => {
        loadPermissions.push(token);
        return initial.json;
      },
      saveBundle: async token => savePermissions.push(token),
      schemas,
    });
    const token = Object.freeze({ testPermission: true });

    const result = await service.readEvaluations(token);

    expect(result).toMatchObject({
      valid: true,
      evaluations: [evaluation],
    });
    if (result.valid) {
      expect(
        result.evaluations[0].report.overall.mechanisticMse
      ).toBeGreaterThan(result.evaluations[0].report.overall.samplingMse);
    }
    expect(loadPermissions).toEqual([token]);
    expect(savePermissions).toEqual([]);
  });

  it('returns an empty evaluation list when reading a legacy V3 bundle', async () => {
    const { bundle } = createEvaluationFixture();
    const legacy = exportInterpretabilityResearchBundleV3(bundle, schemas);
    if (!legacy.valid) throw new Error('Legacy bundle fixture invalid.');
    const permissions = [];
    const service = createInterpretabilityResearchServiceV1({
      loadBundle: async token => {
        permissions.push(token);
        return legacy.json;
      },
      saveBundle: async () => {},
      schemas,
    });
    const token = Object.freeze({ testPermission: true });

    await expect(service.readEvaluations(token)).resolves.toEqual({
      valid: true,
      evaluations: [],
    });
    expect(permissions).toEqual([token]);
  });

  it('rejects semantically tampered reports when reading stored bundles', async () => {
    const { bundle, evaluation } = createEvaluationFixture();
    const initial = exportInterpretabilityResearchBundleV4(
      { ...bundle, accuracyEvaluations: [evaluation] },
      schemas
    );
    if (!initial.valid) throw new Error('Synthetic bundle fixture invalid.');
    const envelope = JSON.parse(initial.json);
    envelope.accuracyEvaluations[0].report.overall.samplingMse += 0.001;
    let saves = 0;
    const service = createInterpretabilityResearchServiceV1({
      loadBundle: async () => JSON.stringify(envelope),
      saveBundle: async () => {
        saves += 1;
      },
      schemas,
    });

    await expect(
      service.readEvaluations(Object.freeze({ testPermission: true }))
    ).resolves.toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({
          code: 'invalid-accuracy-evaluations',
          details: expect.arrayContaining([
            expect.objectContaining({
              code: 'inconsistent-accuracy-overall-summary',
            }),
          ]),
        }),
      ],
    });
    expect(saves).toBe(0);
  });
});
