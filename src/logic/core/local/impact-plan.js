import { JEST_RUNNER, quotePath } from './impact-commands.js';
import { isLogicJavaScriptPath } from './logic-source-paths.js';

/** @typedef {{paths: string[], invalid: string | undefined, sources: string[], tests: string[]}} ImpactChanges */
/** @typedef {{paths: string[], resolved: boolean}} RelatedImpactDiscovery */
/**
 * @template [Reason=string]
 * @typedef {{changes: ImpactChanges, discovery: RelatedImpactDiscovery, collectionError: Reason | string}} TrustedImpactPlanInput
 */
/** @typedef {'eslint' | 'core-parse' | 'duplication'} ImpactStaticGate */
/** @typedef {{changedPaths: string[], tests: string[], staticGates: ImpactStaticGate[], commands: string[], authoritative: 'npm run check:full'}} ImpactPlanBase */
/** @typedef {ImpactPlanBase & {mode: 'none', testSelection: 'none', reason: string}} NoChangesImpactPlan */
/**
 * @template [Reason=string]
 * @typedef {ImpactPlanBase & {mode: 'fallback', testSelection: 'all-unit', reason: Reason | string}} FallbackImpactPlan
 */
/** @typedef {ImpactPlanBase & {mode: 'selected', testSelection: 'related' | 'direct', reason?: undefined}} SelectedImpactPlan */
/**
 * @template [Reason=string]
 * @typedef {NoChangesImpactPlan | FallbackImpactPlan<Reason> | SelectedImpactPlan} CheckImpactPlan
 */

/**
 * Construct deterministic selection from interpreted change/discovery evidence.
 * @template [Reason=string]
 * @param {TrustedImpactPlanInput<Reason>} input Parsed planner evidence.
 * @returns {CheckImpactPlan<Reason>} Plan retaining its opaque reason payload type.
 */
export function createTrustedCheckImpactPlan({
  changes,
  discovery,
  collectionError,
}) {
  if (!collectionError && changes.paths.length === 0)
    return createNoChangesPlan();
  return createChangedPlan(changes, discovery, collectionError);
}

/**
 * Build the changed-path plan in the original fallback precedence.
 * @template [Reason=string]
 * @param {ImpactChanges} changes Interpreted changed-path state.
 * @param {RelatedImpactDiscovery} discovery Interpreted related-test state.
 * @param {Reason | string} collectionError Original collection evidence.
 * @returns {FallbackImpactPlan<Reason> | SelectedImpactPlan} Complete changed-path plan.
 */
function createChangedPlan(changes, discovery, collectionError) {
  let reason = collectionError;
  if (!reason && changes.invalid !== undefined)
    reason = `Unsupported or unsafe changed path: ${changes.invalid || '(empty)'}.`;
  if (!reason && changes.sources.length > 0 && !discovery.resolved)
    reason = 'Jest related-test discovery did not complete successfully.';
  if (!reason && changes.sources.length > 0 && discovery.paths.length === 0)
    reason = 'Jest did not identify related unit tests for changed source.';
  if (reason)
    return {
      mode: 'fallback',
      changedPaths: changes.paths,
      tests: [],
      testSelection: 'all-unit',
      staticGates: [],
      commands: [
        `node ${JEST_RUNNER} --runInBand --runTestsByPath <unit-test files in bounded shards>`,
      ],
      reason,
      authoritative: 'npm run check:full',
    };
  return createSelectedPlan(changes, discovery.paths);
}

/**
 * Construct the established no-change domain result.
 * @returns {NoChangesImpactPlan} Complete no-change plan.
 */
function createNoChangesPlan() {
  return {
    mode: 'none',
    changedPaths: [],
    tests: [],
    testSelection: 'none',
    staticGates: [],
    commands: [],
    reason: 'No changed source or unit-test paths were found.',
    authoritative: 'npm run check:full',
  };
}

/**
 * Build ordered selected tests and their supported domain gates.
 * @param {ImpactChanges} changes Interpreted changed-path state.
 * @param {string[]} related Interpreted related tests.
 * @returns {SelectedImpactPlan} Selected plan with exact command ordering.
 */
function createSelectedPlan(changes, related) {
  const tests = [...new Set([...changes.tests, ...related])].sort();
  const testSelection = changes.sources.length > 0 ? 'related' : 'direct';
  const commands = [
    `node ${JEST_RUNNER} --runInBand --runTestsByPath ${tests.map(quotePath).join(' ')}`,
  ];
  /** @type {ImpactStaticGate[]} */
  const staticGates = ['eslint'];
  if (changes.sources.some(isLogicJavaScriptPath)) {
    staticGates.push('core-parse');
    commands.push('npm run core-parse');
    staticGates.push('duplication');
    commands.push('npm run duplication');
  }
  return {
    mode: 'selected',
    changedPaths: changes.paths,
    tests,
    testSelection,
    staticGates,
    commands,
    authoritative: 'npm run check:full',
  };
}
