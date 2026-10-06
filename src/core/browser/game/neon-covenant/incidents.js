import { LAB_CONTENT } from './content.js';
import { evaluationComplete } from './evaluation.js';
import { recordFromKeys } from './recordFromKeys.js';
const INCIDENTS = LAB_CONTENT.incidents;

/**
 * Start independent, persistable incident episodes without historical invention.
 * @returns {Record<string, any>} Initial causal chains.
 */
export function createIncidentChains() {
  return recordFromKeys(Object.keys(INCIDENTS), () => ({
    stage: 'clear',
    warnedAt: 0,
    charged: false,
    episodes: 0,
  }));
}

/**
 * Validate causal state before an imported episode can suppress future charges.
 * @param {Record<string, any>} lab Candidate incident ledger.
 * @returns {boolean} Whether every authored chain has a valid persisted state.
 */
export function validIncidentChains(lab) {
  return Boolean(
    lab.incidentChains &&
      Object.keys(lab.incidentChains).length === 4 &&
      Number.isInteger(lab.incidentGrace) &&
      lab.incidentGrace >= 0 &&
      lab.incidentGrace <= 2 &&
      Number.isFinite(lab.lastIncidentCost) &&
      lab.lastIncidentCost >= 0 &&
      Object.keys(INCIDENTS).every(id => {
        const chain = lab.incidentChains[id];
        return (
          chain &&
          ['clear', 'warning', 'intervention', 'incident', 'recovery'].includes(
            chain.stage
          ) &&
          typeof chain.charged === 'boolean' &&
          (chain.stage !== 'clear' || !chain.charged) &&
          (chain.stage !== 'incident' || chain.charged) &&
          (!chain.charged || chain.episodes > 0) &&
          Number.isInteger(chain.warnedAt) &&
          chain.warnedAt >= 0 &&
          Number.isInteger(chain.episodes) &&
          chain.episodes >= 0
        );
      })
  );
}

/**
 * Derive the four causes from operations rather than generic metric thresholds.
 * @param {Record<string, any>} lab Settling ledger with updated research.
 * @param {Record<string, number>} flow Actual throughput and research gain.
 * @returns {Record<string, boolean>} Conditions needing attention.
 */
function causes(lab, flow) {
  return {
    heat: flow.progress > 0 && flow.demand > lab.cooling,
    evaluation:
      (flow.progress > 0 && !lab.teams.safety) ||
      lab.deployed.some(
        (/** @type {string} */ id) => !evaluationComplete(lab, id)
      ),
    rights:
      lab.data === 'scraped' &&
      Object.values(lab.research).some(progress => progress > 0),
    support: flow.supportDemand > flow.supportCapacity,
  };
}

/**
 * Advance one episode, retaining its charge until two safe settlements recover it.
 * @param {Record<string, any>} chain Persisted episode being settled.
 * @param {boolean} hazardous Whether its actual cause remains present.
 * @param {number} day Settlement index for a full warning interval.
 * @param {number} grace Protected migration settlements remaining.
 * @returns {boolean} Whether this settlement incurs its first remediation charge.
 */
function advance(chain, hazardous, day, grace) {
  if (!hazardous) {
    if (chain.stage === 'recovery') {
      chain.stage = 'clear';
      chain.charged = false;
      chain.warnedAt = 0;
    } else if (chain.stage !== 'clear') chain.stage = 'recovery';
    return false;
  }
  if (chain.stage === 'incident') return false;
  if (chain.charged) {
    chain.stage = 'incident';
    return false;
  }
  if (chain.stage !== 'warning') {
    chain.stage = 'warning';
    chain.warnedAt = day;
    return false;
  }
  if (grace || day <= chain.warnedAt) return false;
  chain.stage = 'incident';
  chain.charged = true;
  chain.episodes++;
  return true;
}

/**
 * Settle causal chains once and publish costs alongside the actual financial report.
 * @param {Record<string, any>} lab Mutable settlement clone.
 * @param {Record<string, number>} flow Actual operating forecast.
 * @param {number} day Shift being settled.
 * @param {string[]} report Settlement explanations to append.
 * @returns {number} Total newly incurred remediation costs.
 */
export function settleIncidents(lab, flow, day, report) {
  const active = causes(lab, flow);
  let cost = 0;
  for (const [id, definition] of Object.entries(INCIDENTS)) {
    const chain = lab.incidentChains[id];
    if (advance(chain, active[id], day, lab.incidentGrace)) {
      cost += definition.cost;
      lab.incidents++;
      lab.trust = Math.max(0, lab.trust - definition.trustLoss);
      report.push(
        `${definition.name}: incident; ${definition.cost}k remediation charged once.`
      );
    } else if (chain.stage !== 'clear') {
      report.push(
        `${definition.name}: ${chain.stage}. ${definition.trigger} Response: ${definition.responseDetail || `${definition.responseCost}k`}. Unresolved incidents are not charged again.`
      );
    }
  }
  lab.incidentGrace = Math.max(0, lab.incidentGrace - 1);
  lab.lastIncidentCost = cost;
  return cost;
}

/**
 * Commit a disclosed intervention without pretending that triage fixes its cause.
 * @param {Record<string, any>} lab Mutable order clone.
 * @param {string} id Authored causal chain identifier.
 * @returns {string} Accepted or rejected response explanation.
 */
export function intervene(lab, id) {
  const definition = INCIDENTS[id];
  if (!definition) return 'Unknown incident response.';
  const chain = lab.incidentChains[id];
  if (['clear', 'recovery', 'intervention'].includes(chain.stage))
    return 'No pending response. Inspect the incident register.';
  if (id === 'evaluation' && !lab.teams.safety)
    return 'Assign an evaluator before checkpoint review.';
  if (id === 'evaluation')
    return 'Sable: complete representative probes at the evaluation console. Incident triage cannot grant release evidence.';
  if (lab.cash < definition.responseCost)
    return `Need ${definition.responseCost}k credits. Response rejected.`;
  lab.cash -= definition.responseCost;
  if (id === 'heat') lab.cooling += 4;
  if (id === 'rights') lab.data = 'licensed';
  if (id === 'support') {
    lab.morale = Math.min(100, lab.morale + 6);
    // Triage postpones escalation, but staffing must resolve the underlying load.
  }
  chain.stage = 'intervention';
  return `${definition.response}: ${definition.responseCost}k. Review the next forecast; persistent causes still need repair.`;
}

/**
 * Give the responsible colleague a concrete follow-up, including genuine recovery.
 * @param {Record<string, any>} lab Operating ledger.
 * @param {string} employeeId Named colleague being consulted.
 * @returns {string[]} Current owned warnings and responses.
 */
export function incidentThoughts(lab, employeeId) {
  return Object.entries(INCIDENTS)
    .filter(
      ([id, definition]) =>
        definition.owner === employeeId &&
        lab.incidentChains[id].stage !== 'clear'
    )
    .map(
      ([id, definition]) =>
        `${definition.name}: ${lab.incidentChains[id].stage}. ${definition.trigger} ${definition.response}: ${definition.responseDetail || `${definition.responseCost}k`}. Fix the cause, not just the warning light.`
    );
}
