import {
  appendIdentityReferenceV1,
  appendExperimentDesignV1,
  appendAccuracyEvaluationV1,
  appendMechanisticEstimateV1,
  appendExperimentSubmissionV1,
  exportInterpretabilityResearchBundleV6,
  exportInterpretabilityResearchBundleV7,
  getEvidenceGraphContextV1,
  getEvidenceGraphContextSnapshotV1,
  importInterpretabilityResearchBundleV2,
  summarizeIdentityReferencesV1,
} from './index.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {Parameters<typeof importInterpretabilityResearchBundleV2>[1]} ResearchSchemas */
/** @typedef {Parameters<typeof getEvidenceGraphContextV1>[1]} EvidenceContextQuery */
/** @typedef {Parameters<typeof getEvidenceGraphContextSnapshotV1>[1]} EvidenceContextSnapshotQuery */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: true}> & {mechanismIdentityLink: Record<string, string>|null}} ResearchContextPage */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: false}>} ResearchContextFailure */
/** @typedef {Extract<Awaited<ReturnType<typeof getEvidenceGraphContextSnapshotV1>>, {valid: true}> & {mechanismIdentityLink: Record<string, string>|null}} ResearchContextSnapshotPage */
/** @typedef {Extract<Awaited<ReturnType<typeof getEvidenceGraphContextSnapshotV1>>, {valid: false}>} ResearchContextSnapshotFailure */
/** @typedef {ResearchContextSnapshotFailure|ResearchContextSnapshotPage} ResearchContextSnapshotServiceResult */
/** @typedef {Parameters<typeof appendExperimentSubmissionV1>[1]} ExperimentSubmission */
/** @typedef {Parameters<typeof appendMechanisticEstimateV1>[1]} MechanisticEstimate */
/** @typedef {Parameters<typeof appendAccuracyEvaluationV1>[1]} AccuracyEvaluation */
/** @typedef {Parameters<typeof appendIdentityReferenceV1>[1]} IdentityReference */
/** @typedef {Parameters<typeof appendExperimentDesignV1>[1]} ExperimentDesign */
/** @typedef {ReturnType<typeof importInterpretabilityResearchBundleV2>} BundleImportResult */
/** @typedef {Extract<BundleImportResult, {valid: true}>['bundle']} ResearchBundle */
/** @typedef {ReturnType<typeof summarizeIdentityReferencesV1>|Extract<BundleImportResult, {valid: false}>} IdentityReferenceServiceResult */
/** @typedef {{valid: true, evaluations: Array<AccuracyEvaluation>}|Extract<BundleImportResult, {valid: false}>} AccuracyEvaluationsServiceResult */
/** @typedef {(bundle: ResearchBundle, submission: ExperimentSubmission|MechanisticEstimate|AccuracyEvaluation|IdentityReference, schemas: ResearchSchemas) => any} ResearchAppender */
/** @typedef {ReturnType<typeof getEvidenceGraphContextV1>|ReturnType<typeof appendExperimentSubmissionV1>|ReturnType<typeof appendMechanisticEstimateV1>|ReturnType<typeof appendAccuracyEvaluationV1>|ReturnType<typeof appendIdentityReferenceV1>|ReturnType<typeof appendExperimentDesignV1>|ReturnType<typeof exportInterpretabilityResearchBundleV6>|ReturnType<typeof exportInterpretabilityResearchBundleV7>} BundleOperationResult */
/** @typedef {BundleImportResult|BundleOperationResult} ResearchServiceResult */
/** @typedef {Extract<BundleImportResult, {valid: false}>|ResearchContextFailure|ResearchContextPage} ResearchContextServiceResult */
/** @typedef {{allowEffects: AllowEffects, bundle: ResearchBundle, submission: ExperimentSubmission|MechanisticEstimate|AccuracyEvaluation|IdentityReference, append: ResearchAppender}} ResearchWrite */
/** @typedef {(allowEffects: AllowEffects, design: ExperimentDesign) => Promise<ResearchServiceResult>} ExperimentDesignSubmitter */

/**
 * Create the pure Atlas read/submission service over injected bundle storage.
 * @param {{storage: {loadBundle: (allowEffects: AllowEffects) => Promise<string>, saveBundle: (allowEffects: AllowEffects, json: string) => Promise<void>, submitExperimentDesign?: ExperimentDesignSubmitter}, schemas: ResearchSchemas, hashContextSnapshot?: (canonicalSnapshot: string) => string|Promise<string>}} options Injected storage operations, caller-provided schema adapters, and pure hash function. Design submission storage must provide atomic append semantics.
 * @returns {{readContext: (allowEffects: AllowEffects, query: EvidenceContextQuery) => Promise<ResearchContextServiceResult>, readContextSnapshot: (allowEffects: AllowEffects, query: EvidenceContextSnapshotQuery) => Promise<ResearchContextSnapshotServiceResult>, readEvaluations: (allowEffects: AllowEffects) => Promise<AccuracyEvaluationsServiceResult>, readIdentityReferences: (allowEffects: AllowEffects) => Promise<IdentityReferenceServiceResult>, submitExperiment: (allowEffects: AllowEffects, submission: ExperimentSubmission) => Promise<ResearchServiceResult>, submitExperimentDesign: (allowEffects: AllowEffects, design: ExperimentDesign) => Promise<ResearchServiceResult>, submitEstimate: (allowEffects: AllowEffects, estimate: MechanisticEstimate) => Promise<ResearchServiceResult>, submitEvaluation: (allowEffects: AllowEffects, evaluation: AccuracyEvaluation) => Promise<ResearchServiceResult>, submitIdentityReference: (allowEffects: AllowEffects, reference: IdentityReference) => Promise<ResearchServiceResult>}} Permission-aware service methods.
 */
export function createInterpretabilityResearchServiceV1({
  storage,
  schemas,
  hashContextSnapshot,
}) {
  const {
    loadBundle,
    saveBundle,
    submitExperimentDesign: submitDesignStorage,
  } = storage;
  /**
   * @param {AllowEffects} allowEffects Permission token forwarded to storage.
   * @template T
   * @param {(bundle: ResearchBundle) => Promise<T>|T} operation Work to run against a validated bundle.
   * @returns {Promise<Extract<BundleImportResult, {valid: false}>|T>} Operation result or import failure.
   */
  const withBundle = (allowEffects, operation) =>
    withImportedBundle(allowEffects, loadBundle, schemas, operation);
  const saveResearchRecord = createResearchWriter(schemas, saveBundle);
  /**
   * @param {AllowEffects} allowEffects Permission token forwarded to storage.
   * @param {ResearchAppender} append Bundle append operation.
   * @param {ExperimentSubmission|MechanisticEstimate|AccuracyEvaluation|IdentityReference} submission Submitted record.
   * @returns {Promise<ResearchServiceResult>} Export result or validation failure.
   */
  const submit = (allowEffects, append, submission) =>
    withBundle(allowEffects, bundle =>
      saveResearchRecord({ allowEffects, bundle, append, submission })
    );
  /**
   * Submit one record that belongs to the V1 evidence graph.
   * @param {AllowEffects} allowEffects Permission token forwarded to storage.
   * @param {Function} append Pure graph append operation.
   * @param {ExperimentSubmission|MechanisticEstimate} submission Submitted record.
   * @returns {Promise<ResearchServiceResult>} Export result or validation failure.
   */
  const submitGraphRecord = (allowEffects, append, submission) =>
    submit(
      allowEffects,
      (bundle, record, providedSchemas) => {
        const appended = append(
          bundle.evidenceGraph,
          record,
          providedSchemas?.evidenceGraphSchemasV1
        );
        return appended.valid
          ? {
              valid: true,
              bundle: { ...bundle, evidenceGraph: appended.graph },
            }
          : appended;
      },
      submission
    );
  /**
   * Submit a proposed design through an atomic storage update so concurrent
   * investigators cannot overwrite one another's immutable plans.
   * @param {AllowEffects} allowEffects Permission token forwarded to storage.
   * @param {ExperimentDesign} design Proposed, untested design.
   * @returns {Promise<ResearchServiceResult>} V7 export or validation failure.
   */
  const submitDesign = (allowEffects, design) =>
    typeof submitDesignStorage === 'function'
      ? submitDesignStorage(allowEffects, design)
      : Promise.resolve({
          valid: false,
          errors: [{ code: 'atomic-experiment-design-storage-required' }],
        });

  /**
   * Attach an optional canonical identity link without changing invalid context results.
   * @param {ResearchBundle} bundle Validated portable research bundle.
   * @param {any} context Retrieved graph context.
   * @returns {any} Context with the linked canonical identity when available.
   */
  function withMechanismIdentityLink(bundle, context) {
    if (!context.valid) return context;
    const mechanismIdentityLink =
      bundle.mechanismIdentityLinks.find(
        link => link.legacyMechanismId === context.mechanism.id
      ) ?? null;
    return Object.assign({}, context, { mechanismIdentityLink });
  }

  return Object.freeze({
    readContext: (allowEffects, query) =>
      withBundle(
        allowEffects,
        bundle =>
          /** @type {ResearchContextServiceResult} */ (
            withMechanismIdentityLink(
              bundle,
              getEvidenceGraphContextV1(bundle.evidenceGraph, query)
            )
          )
      ),
    readContextSnapshot: (allowEffects, query) =>
      withBundle(allowEffects, async bundle => {
        const context = await getEvidenceGraphContextSnapshotV1(
          bundle.evidenceGraph,
          query,
          hashContextSnapshot
        );
        return /** @type {ResearchContextSnapshotServiceResult} */ (
          withMechanismIdentityLink(bundle, context)
        );
      }),
    readEvaluations: allowEffects =>
      withBundle(allowEffects, bundle => ({
        valid: true,
        evaluations: bundle.accuracyEvaluations,
      })),
    readIdentityReferences: allowEffects =>
      withBundle(allowEffects, bundle =>
        summarizeIdentityReferencesV1(
          bundle.identityReferences,
          identityReferenceSchema(schemas)
        )
      ),
    submitExperiment: (allowEffects, submission) =>
      submitGraphRecord(allowEffects, appendExperimentSubmissionV1, submission),
    submitExperimentDesign: submitDesign,
    submitEstimate: (allowEffects, estimate) =>
      submitGraphRecord(allowEffects, appendMechanisticEstimateV1, estimate),
    submitEvaluation: (allowEffects, evaluation) =>
      submit(allowEffects, appendAccuracyEvaluationV1, evaluation),
    submitIdentityReference: (allowEffects, reference) =>
      submit(allowEffects, appendIdentityReferenceV1, reference),
  });
}

/**
 * Resolve the injected reference schema from the supported schema adapters.
 * @param {ResearchSchemas} schemas Schema adapters supplied to the service.
 * @returns {any} Identity-reference validator.
 */
function identityReferenceSchema(schemas) {
  return (
    schemas?.identityGraphSchemasV2?.identityReferenceSchemaV1 ??
    schemas?.identityReferenceSchemaV1
  );
}

/**
 * Load and validate one portable research bundle through the injected adapter.
 * @param {AllowEffects} allowEffects Permission token forwarded to storage.
 * @param {(allowEffects: AllowEffects) => Promise<string>} loadBundle Storage adapter.
 * @param {ResearchSchemas} schemas Injected schema adapters.
 * @returns {Promise<BundleImportResult>} Validated bundle or stable failure.
 */
async function loadImportedBundle(allowEffects, loadBundle, schemas) {
  const json = await loadBundle(allowEffects);
  return importInterpretabilityResearchBundleV2(json, schemas);
}

/**
 * Run one operation after importing and validating the stored bundle.
 * @param {AllowEffects} allowEffects Permission token forwarded to storage.
 * @param {(allowEffects: AllowEffects) => Promise<string>} loadBundle Storage adapter.
 * @param {ResearchSchemas} schemas Injected schema adapters.
 * @template T
 * @param {(bundle: ResearchBundle) => Promise<T>|T} operation Work to run against a validated bundle.
 * @returns {Promise<Extract<BundleImportResult, {valid: false}>|T>} Operation result or import failure.
 */
async function withImportedBundle(
  allowEffects,
  loadBundle,
  schemas,
  operation
) {
  const imported = await loadImportedBundle(allowEffects, loadBundle, schemas);
  if (!imported.valid) return imported;
  return operation(imported.bundle);
}

/**
 * Bind schema and storage adapters to validated research-record persistence.
 * @param {ResearchSchemas} schemas Injected schema adapters.
 * @param {(allowEffects: AllowEffects, json: string) => Promise<void>} saveBundle Storage adapter.
 * @returns {(options: ResearchWrite) => Promise<ResearchServiceResult>} Bound writer.
 */
function createResearchWriter(schemas, saveBundle) {
  /**
   * @param {ResearchWrite} options Validated bundle and submitted data.
   * @returns {Promise<ResearchServiceResult>} Export result or validation failure.
   */
  return async options => {
    const { allowEffects, bundle, submission, append } = options;
    const appended = append(bundle, submission, schemas);
    if (!appended.valid) return appended;

    const exported = Array.isArray(appended.bundle?.experimentDesigns)
      ? exportInterpretabilityResearchBundleV7(appended.bundle, schemas)
      : exportInterpretabilityResearchBundleV6(appended.bundle, schemas);
    if (!exported.valid) return exported;

    await saveBundle(allowEffects, exported.json);
    return exported;
  };
}
