import {
  appendExperimentSubmissionV1,
  exportInterpretabilityResearchBundleV3,
  getEvidenceGraphContextV1,
  importInterpretabilityResearchBundleV2,
} from './index.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {Parameters<typeof importInterpretabilityResearchBundleV2>[1]} ResearchSchemas */
/** @typedef {Parameters<typeof getEvidenceGraphContextV1>[1]} EvidenceContextQuery */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: true}> & {mechanismIdentityLink: Record<string, string>|null}} ResearchContextPage */
/** @typedef {Extract<ReturnType<typeof getEvidenceGraphContextV1>, {valid: false}>} ResearchContextFailure */
/** @typedef {Parameters<typeof appendExperimentSubmissionV1>[1]} ExperimentSubmission */
/** @typedef {ReturnType<typeof importInterpretabilityResearchBundleV2>} BundleImportResult */
/** @typedef {Extract<BundleImportResult, {valid: true}>['bundle']} ResearchBundle */
/** @typedef {ReturnType<typeof getEvidenceGraphContextV1>|ReturnType<typeof appendExperimentSubmissionV1>|ReturnType<typeof exportInterpretabilityResearchBundleV3>} BundleOperationResult */
/** @typedef {BundleImportResult|BundleOperationResult} ResearchServiceResult */
/** @typedef {Extract<BundleImportResult, {valid: false}>|ResearchContextFailure|ResearchContextPage} ResearchContextServiceResult */
/** @typedef {{allowEffects: AllowEffects, bundle: ResearchBundle, submission: ExperimentSubmission}} ExperimentWrite */

/**
 * Create the pure Atlas read/submission service over injected bundle storage.
 * @param {{loadBundle: (allowEffects: AllowEffects) => Promise<string>, saveBundle: (allowEffects: AllowEffects, json: string) => Promise<void>, schemas: ResearchSchemas}} options Storage capabilities and caller-provided schema adapters.
 * @returns {{readContext: (allowEffects: AllowEffects, query: EvidenceContextQuery) => Promise<ResearchContextServiceResult>, submitExperiment: (allowEffects: AllowEffects, submission: ExperimentSubmission) => Promise<ResearchServiceResult>}} Permission-aware service methods.
 */
export function createInterpretabilityResearchServiceV1({
  loadBundle,
  saveBundle,
  schemas,
}) {
  /**
   * @param {AllowEffects} allowEffects Permission token forwarded to storage.
   * @template T
   * @param {(bundle: ResearchBundle) => Promise<T>|T} operation Work to run against a validated bundle.
   * @returns {Promise<Extract<BundleImportResult, {valid: false}>|T>} Operation result or import failure.
   */
  const withBundle = (allowEffects, operation) =>
    withImportedBundle(allowEffects, loadBundle, schemas, operation);
  const saveExperiment = createExperimentWriter(schemas, saveBundle);

  return Object.freeze({
    readContext: (allowEffects, query) =>
      withBundle(allowEffects, bundle => {
        const context = getEvidenceGraphContextV1(bundle.evidenceGraph, query);
        if (!context.valid) return context;
        const mechanismIdentityLink =
          bundle.mechanismIdentityLinks.find(
            link => link.legacyMechanismId === context.mechanism.id
          ) ?? null;
        return { ...context, mechanismIdentityLink };
      }),
    submitExperiment: (allowEffects, submission) =>
      withBundle(allowEffects, bundle =>
        saveExperiment({
          allowEffects,
          bundle,
          submission,
        })
      ),
  });
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
 * Bind schema and storage adapters to the experiment persistence operation.
 * @param {ResearchSchemas} schemas Injected schema adapters.
 * @param {(allowEffects: AllowEffects, json: string) => Promise<void>} saveBundle Storage adapter.
 * @returns {(options: ExperimentWrite) => Promise<ReturnType<typeof appendExperimentSubmissionV1>|ReturnType<typeof exportInterpretabilityResearchBundleV3>>} Bound writer.
 */
function createExperimentWriter(schemas, saveBundle) {
  /**
   * @param {ExperimentWrite} options Validated bundle and submitted data.
   * @returns {Promise<ReturnType<typeof appendExperimentSubmissionV1>|ReturnType<typeof exportInterpretabilityResearchBundleV3>>} Export result or validation failure.
   */
  return async options => {
    const { allowEffects, bundle, submission } = options;
    const appended = appendExperimentSubmissionV1(
      bundle.evidenceGraph,
      submission,
      schemas?.evidenceGraphSchemasV1
    );
    if (!appended.valid) return appended;

    const exported = exportInterpretabilityResearchBundleV3(
      { ...bundle, evidenceGraph: appended.graph },
      schemas
    );
    if (!exported.valid) return exported;

    await saveBundle(allowEffects, exported.json);
    return exported;
  };
}
