import {
  createCircuitStructuralSnapshotV2,
  createInterpretabilitySchemasV1,
  createInterpretabilitySchemasV2,
} from '../../interpretability/interpretability.js';

/** @typedef {Parameters<typeof import('../../interpretability/interpretability.js').importInterpretabilityResearchBundleV2>[1]} AtlasResearchSchemas */

/**
 * Build schema adapters for a portable bundle, hashing circuit identities before
 * the synchronous core validator checks their stored digests.
 * @param {{z: Record<string, any>, hashCanonicalIdentity: (identity: string) => Promise<string>|string}} options Injected schema and digest runtimes.
 * @returns {(json: string) => Promise<AtlasResearchSchemas>} Async schema resolver.
 */
export function createAtlasSchemaResolver({ z, hashCanonicalIdentity }) {
  return async json => {
    const identityHashes = new Map();
    const envelope = parseEnvelope(json);
    const snapshots = envelope?.identityGraph?.circuitSnapshots;

    if (Array.isArray(snapshots)) {
      for (const snapshot of snapshots) {
        if (!isHashableSnapshot(snapshot)) continue;
        await createCircuitStructuralSnapshotV2(
          snapshot.circuitId,
          snapshot.model,
          snapshot,
          async canonicalIdentity => {
            const digest = await hashCanonicalIdentity(canonicalIdentity);
            identityHashes.set(canonicalIdentity, digest);
            return digest;
          }
        );
      }
    }

    return /** @type {AtlasResearchSchemas} */ ({
      evidenceGraphSchemasV1: createInterpretabilitySchemasV1(z),
      identityGraphSchemasV2: createInterpretabilitySchemasV2(
        z,
        canonicalIdentity => identityHashes.get(canonicalIdentity) ?? ''
      ),
    });
  };
}

/**
 * Parse the outer bundle for optional digest precomputation.
 * @param {string} json Candidate bundle JSON.
 * @returns {Record<string, any>|null} Parsed envelope or null when invalid JSON.
 */
function parseEnvelope(json) {
  try {
    const envelope = JSON.parse(json);
    return envelope && typeof envelope === 'object' && !Array.isArray(envelope)
      ? envelope
      : null;
  } catch {
    return null;
  }
}

/**
 * Check the structural fields needed by the pure snapshot canonicalizer.
 * @param {any} snapshot Candidate circuit snapshot.
 * @returns {boolean} Whether its canonical digest can be prepared.
 */
function isHashableSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === 'object' &&
      snapshot.model &&
      typeof snapshot.model === 'object' &&
      Array.isArray(snapshot.componentIds) &&
      Array.isArray(snapshot.connectionIds) &&
      Array.isArray(snapshot.boundaryComponentIds)
  );
}
