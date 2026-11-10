import { captureEvidenceResult } from './evidence-result.js';
import {
  normalizeImpactPath,
  classifyImpactPath,
  parseRelatedImpactPaths,
} from './impact-paths.js';

/**
 * @template [Reason=string]
 * @typedef {{changedPaths?: unknown[], relatedTestPaths?: unknown[], relatedTestsResolved?: unknown, collectionError?: Reason}} ImpactPlanOptions
 */
/**
 * @template [Reason=string]
 * @typedef {import('../../core/local/impact-plan.js').TrustedImpactPlanInput<Reason>} TrustedImpactPlanInput
 */

/**
 * Interpret planner candidates in the original property/element read order.
 * Keep opaque reason payloads by identity and represent original structural errors.
 * @template [Reason=string]
 * @param {ImpactPlanOptions<Reason>} [options] Unparsed option fields.
 * @returns {{ok: true, evidence: TrustedImpactPlanInput<Reason>} | {ok: false, error: unknown}} Parsed input or exact failure.
 */
export function parseImpactPlanInputs(options) {
  return captureEvidenceResult(() => {
    const {
      changedPaths = [],
      relatedTestPaths,
      relatedTestsResolved = false,
      collectionError = '',
    } = options === undefined ? {} : options;
    const changed = [...new Set(changedPaths.map(normalizeImpactPath))].sort();
    const invalid = changed.find(path => !classifyImpactPath(path));
    const sourceChanges = changed.filter(
      path => classifyImpactPath(path) === 'source'
    );
    const directTests = changed.filter(
      path => classifyImpactPath(path) === 'test'
    );
    const parsedRelated = parseRelatedImpactPaths(relatedTestPaths);
    if (!parsedRelated.ok) throw parsedRelated.error;
    return {
      changes: {
        paths: changed,
        invalid,
        sources: sourceChanges,
        tests: directTests,
      },
      discovery: {
        paths: parsedRelated.paths,
        resolved: Boolean(relatedTestsResolved),
      },
      collectionError,
    };
  });
}
