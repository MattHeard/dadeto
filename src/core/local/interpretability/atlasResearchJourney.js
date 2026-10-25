import {
  discoverResearchCandidatesV1,
  importInterpretabilityResearchBundleV2,
  proposeAlgZooEvidenceSensitiveExperimentDesignV1,
} from '../../interpretability/interpretability.js';
import { createInterpretabilityResearchServiceV1 } from '../../interpretability/researchService.js';

const MAX_CANDIDATE_PAGE = 100;
const MAX_CONTEXT_ITEMS = 1000;
const CONTEXT_PAGE_SIZE = 100;
const MAX_CONTEXT_PAGES = MAX_CONTEXT_ITEMS / CONTEXT_PAGE_SIZE;

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Compose the evidence-sensitive journey from injected local adapters.
 * @param {any} defaults Storage, effect, identity, clock, and hash adapters.
 * @returns {any} Local research journey.
 */
export function createAtlasResearchJourneyCore(defaults) {
  return Object.freeze({
    runAtlasResearchJourneyCli: (
      /** @type {string[]} */ args,
      /** @type {any} */ overrides = {}
    ) => runAtlasResearchJourneyCli(args, { ...defaults, ...overrides }),
  });
}

/**
 * Discover a candidate, retrieve its complete bounded context, draft a plan,
 * and submit that immutable plan through the injected atomic storage method.
 * @param {any} bundle Validated portable research bundle.
 * @param {{allowEffects: AllowEffects, service: ReturnType<typeof createInterpretabilityResearchServiceV1>, proposal: {id: string, authorId: string, agentId?: string, createdAt: string}}} options Effect capability, permission-aware service, and plan attribution.
 * @returns {Promise<Record<string, any>>} Submitted plan or explicit refusal.
 */
export async function runAtlasResearchJourneyV1(
  bundle,
  { allowEffects, service, proposal }
) {
  const discovery = discoverResearchCandidatesV1(bundle, {
    pageSize: MAX_CANDIDATE_PAGE,
  });
  if (!discovery.valid) return discovery;
  const attempts = [];
  for (const candidate of discovery.candidates) {
    if (candidate.identityStatus !== 'resolved') {
      attempts.push({
        mechanismId: candidate.legacyMechanismId,
        code: 'unresolved-candidate-identity',
      });
      continue;
    }
    const snapshot = await readCompleteContext(
      service,
      allowEffects,
      candidate.legacyMechanismId
    );
    if (!snapshot.valid) {
      attempts.push({
        mechanismId: candidate.legacyMechanismId,
        code: snapshot.errors[0]?.code ?? 'context-unavailable',
      });
      continue;
    }
    const drafted = proposeAlgZooEvidenceSensitiveExperimentDesignV1(
      candidate,
      snapshot,
      proposal
    );
    if (!drafted.valid) {
      attempts.push({
        mechanismId: candidate.legacyMechanismId,
        code: drafted.errors[0]?.code ?? 'design-refused',
      });
      continue;
    }
    let submission;
    try {
      submission = await service.submitExperimentDesign(
        allowEffects,
        drafted.design
      );
    } catch {
      return failure('design-submission-failed', attempts);
    }
    if (!submission.valid) {
      return {
        valid: false,
        errors: submission.errors,
        attempts,
      };
    }
    return {
      valid: true,
      candidate: {
        canonicalMechanismId: candidate.canonicalMechanismId,
        identityStatus: candidate.identityStatus,
        legacyMechanismId: candidate.legacyMechanismId,
        model: candidate.model,
      },
      context: {
        itemCount: snapshot.items.length,
        snapshotId: snapshot.snapshotId,
        warnings: snapshot.warnings,
      },
      design: drafted.design,
      submission: { valid: true, bundleVersion: 7 },
      discovery: { candidateCount: discovery.candidates.length },
    };
  }
  return failure(
    discovery.candidates.length === 0
      ? 'no-eligible-research-candidates'
      : 'no-evidence-sensitive-design',
    attempts
  );
}

/**
 * Read every page of a stable context snapshot without exceeding the bound.
 * @param {ReturnType<typeof createInterpretabilityResearchServiceV1>} service Research service.
 * @param {AllowEffects} allowEffects Permission forwarded to bundle reads.
 * @param {string} mechanismId Discovered legacy mechanism identity.
 * @returns {Promise<Record<string, any>>} Complete context or explicit refusal.
 */
async function readCompleteContext(service, allowEffects, mechanismId) {
  const query = {
    mechanismId,
    maxDepth: 4,
    pageSize: CONTEXT_PAGE_SIZE,
    maxItems: MAX_CONTEXT_ITEMS,
  };
  let first;
  try {
    first = await service.readContextSnapshot(allowEffects, query);
  } catch {
    return { valid: false, errors: [{ code: 'context-read-failed' }] };
  }
  if (!first.valid) return first;
  if (first.continuationCursor) {
    return {
      valid: false,
      errors: [{ code: 'context-exceeds-journey-bound' }],
    };
  }
  const items = [...first.items];
  let cursor = first.nextCursor;
  let pageCount = 1;
  while (cursor) {
    pageCount += 1;
    if (pageCount > MAX_CONTEXT_PAGES) {
      return {
        valid: false,
        errors: [{ code: 'context-page-limit-exceeded' }],
      };
    }
    let page;
    try {
      page = await service.readContextSnapshot(allowEffects, {
        ...query,
        cursor,
      });
    } catch {
      return { valid: false, errors: [{ code: 'context-read-failed' }] };
    }
    if (!page.valid) return page;
    if (
      page.snapshotId !== first.snapshotId ||
      page.mechanism.id !== mechanismId ||
      page.continuationCursor
    ) {
      return {
        valid: false,
        errors: [{ code: 'context-snapshot-incomplete' }],
      };
    }
    items.push(...page.items);
    cursor = page.nextCursor;
  }
  if (items.length !== first.totalItems) {
    return { valid: false, errors: [{ code: 'context-snapshot-incomplete' }] };
  }
  return {
    ...first,
    items,
    nextCursor: null,
    continuationCursor: null,
    contextStatus: 'complete',
  };
}

/**
 * Build a strict machine-readable error result.
 * @param {string} code Stable refusal code.
 * @param {Array<Record<string, string>>} attempts Candidate-specific reasons.
 * @returns {{valid: false, errors: Array<Record<string, string>>, attempts: Array<Record<string, string>>}} Refusal.
 */
function failure(code, attempts = []) {
  return { valid: false, errors: [{ code }], attempts };
}

/**
 * Parse the local JSON command's name/value arguments.
 * @param {string[]} args Command-line arguments.
 * @returns {any} Parsed options.
 */
export function parseAtlasResearchJourneyArgs(args) {
  const supported = new Set([
    '--bundle',
    '--author-id',
    '--design-id',
    '--agent-id',
    '--created-at',
  ]);
  /** @type {Record<string, string>} */
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!supported.has(name))
      return { valid: false, errors: [{ code: 'unknown-option' }] };
    if (!value || value.startsWith('--')) {
      return { valid: false, errors: [{ code: 'option-value-required' }] };
    }
    const key = name.slice(2).replaceAll('-', '_');
    if (options[key])
      return { valid: false, errors: [{ code: 'duplicate-option' }] };
    options[key] = value;
  }
  if (!options.bundle || !options.author_id) {
    return { valid: false, errors: [{ code: 'bundle-and-author-required' }] };
  }
  return { valid: true, options };
}

/**
 * Run the file-backed JSON journey as one local effect-bound command.
 * @param {string[]} args CLI arguments after the script name.
 * @param {any} dependencies Injected local adapters.
 * @returns {Promise<{exitCode: number, result: Record<string, any>}>} JSON result and process status.
 */
export async function runAtlasResearchJourneyCli(args, dependencies = {}) {
  const parsed = parseAtlasResearchJourneyArgs(args);
  if (!parsed.valid) return { exitCode: 2, result: parsed };
  const {
    schemas,
    readFileImpl,
    createStorage,
    bindEffect,
    hashCanonicalSnapshot,
    nowIso,
    randomId,
  } = dependencies;
  if (!schemas) return { exitCode: 2, result: failure('schemas-required') };
  const storage = createStorage({
    bundlePath: parsed.options.bundle,
    schemas,
    ...(readFileImpl ? { readFileImpl } : {}),
  });
  const service = createInterpretabilityResearchServiceV1({
    storage,
    schemas,
    hashContextSnapshot: hashCanonicalSnapshot,
  });
  const proposal = {
    id: parsed.options.design_id ?? randomId(),
    authorId: parsed.options.author_id,
    createdAt: parsed.options.created_at ?? nowIso(),
    ...(parsed.options.agent_id ? { agentId: parsed.options.agent_id } : {}),
  };
  try {
    const result = await bindEffect(
      async (/** @type {AllowEffects} */ allowEffects) => {
        const json = await storage.loadBundle(allowEffects);
        const imported = importInterpretabilityResearchBundleV2(json, schemas);
        if (!imported.valid) return imported;
        return runAtlasResearchJourneyV1(imported.bundle, {
          allowEffects,
          service,
          proposal,
        });
      }
    );
    return { exitCode: result.valid ? 0 : 1, result };
  } catch {
    return { exitCode: 1, result: failure('atlas-journey-failed') };
  }
}
