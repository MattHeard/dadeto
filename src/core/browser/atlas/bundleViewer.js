import {
  getEvidenceGraphContextV1,
  importInterpretabilityResearchBundleV2,
  presentEvidenceGraphContextV1,
} from '../../interpretability/interpretability.js';

/** @typedef {ReturnType<typeof importInterpretabilityResearchBundleV2>} AtlasImportResult */
/** @typedef {Extract<AtlasImportResult, {valid: true}>['bundle']} AtlasResearchBundle */
/** @typedef {ReturnType<typeof presentEvidenceGraphContextV1>} AtlasContextPage */

/**
 * Create the read-only bundle and context operations used by the Atlas page.
 * @param {{schemas: Parameters<typeof importInterpretabilityResearchBundleV2>[1], pageSize?: number, maxDepth?: number}} options Injected schema adapters and context bounds.
 * @returns {{importBundle: (json: string) => AtlasImportResult, getContextPage: (bundle: AtlasResearchBundle, mechanismId: string, cursor?: {type: 'record'|'edge', id: string}|null) => AtlasContextPage}} Read-only viewer operations.
 */
export function createAtlasBundleViewer({
  schemas,
  pageSize = 20,
  maxDepth = 3,
}) {
  return Object.freeze({
    importBundle(json) {
      const imported = importInterpretabilityResearchBundleV2(json, schemas);
      return imported;
    },
    getContextPage(bundle, mechanismId, cursor = null) {
      if (!bundle?.evidenceGraph) {
        return { valid: false, errors: [{ code: 'invalid-research-bundle' }] };
      }
      return presentEvidenceGraphContextV1(
        getEvidenceGraphContextV1(bundle.evidenceGraph, {
          mechanismId,
          maxDepth,
          pageSize,
          cursor,
        })
      );
    },
  });
}
