import { clampNumber } from '../../../index.js';
import { LAB_CONTENT } from './content.js';
import { validInfrastructure } from './infrastructure.js';
import { evaluationComplete } from './evaluation.js';

const STAKEHOLDER_IDS = Object.keys(LAB_CONTENT.stakeholders);

/**
 * Create independently mutable signed terms and stakeholder standings.
 * @returns {Record<string, any>} Fresh contract and constituency ledgers.
 */
export function createContractLedger() {
  return {
    contractTerms: {},
    stakeholderStanding: Object.fromEntries(
      Object.entries(LAB_CONTENT.stakeholders).map(([id, entry]) => [
        id,
        entry.starting,
      ])
    ),
  };
}

/**
 * Resolve authored economic and service terms for a signed agreement.
 * @param {Record<string, any>} lab Current campaign ledger.
 * @param {string} id Authored partner id.
 * @returns {Record<string, any>} Selected trusted package, or balanced legacy terms.
 */
export function contractTerms(lab, id) {
  const deal = LAB_CONTENT.contracts[id];
  return deal?.packages[lab.contractTerms?.[id]] || deal?.packages.balanced;
}

/**
 * Reveal negotiation packages only after their relationship leverage is earned.
 * @param {Record<string, any>} lab Current campaign.
 * @param {string} id Authored partner.
 * @returns {string[]} Package identifiers available to negotiate.
 */
export function availableContractPackages(lab, id) {
  const deal = LAB_CONTENT.contracts[id];
  if (!deal) return [];
  const packages = ['balanced'];
  const leverage =
    /** @type {Record<string, {stakeholder: string, promise: string}>} */ ({
      clinic: { stakeholder: 'clinic', promise: 'mae' },
      transit: { stakeholder: 'transit', promise: 'mae' },
      helios: { stakeholder: 'regulator', promise: 'ada' },
    })[id];
  if (
    lab.stakeholderStanding?.[leverage.stakeholder] >= 55 ||
    lab.promises?.includes(leverage.promise)
  )
    packages.push('community');
  if (
    (lab.stakeholderStanding?.investor || 0) >= 55 ||
    lab.fulfilled?.length > 0
  )
    packages.push('priority');
  return packages;
}

/**
 * Accept a disclosed offer and persist its package, advance and stakeholder effects.
 * @param {Record<string, any>} lab Mutable planning ledger.
 * @param {string} id Authored partner id.
 * @param {string} packageId Authored package identifier.
 * @returns {string} Outcome message; rejected offers never mutate the ledger.
 */
export function negotiateContract(lab, id, packageId = 'balanced') {
  const deal = LAB_CONTENT.contracts[id];
  if (!deal || !Object.hasOwn(deal.packages, packageId))
    return 'Unknown offer. No terms or credits changed.';
  if (lab.contracts.includes(id)) return 'This agreement is already signed.';
  if (!availableContractPackages(lab, id).includes(packageId))
    return 'That package needs stronger partner or investor leverage. No order committed.';
  const active = lab.contracts.filter(
    (/** @type {string} */ contractId) =>
      !lab.fulfilled.includes(contractId) && !lab.expired.includes(contractId)
  );
  const locked = active.some(
    (/** @type {string} */ contractId) =>
      contractTerms(lab, contractId).exclusive
  );
  const offer = deal.packages[packageId];
  if (locked || (offer.exclusive && active.length))
    return 'An exclusive agreement is still active. Deliver it or let its deadline resolve before signing another.';
  lab.contracts.push(id);
  lab.contractTerms[id] = packageId;
  lab.cash += offer.advance;
  lab.trust = clampNumber(lab.trust + deal.trust, 0, 100);
  if (offer.attribution) lab.commitmentPolicies.attribution = true;
  for (const [stakeholder, change] of Object.entries(offer.impact))
    lab.stakeholderStanding[stakeholder] = clampNumber(
      lab.stakeholderStanding[stakeholder] + change,
      0,
      100
    );
  return `${deal.name}: ${offer.name} signed. ${offer.advance}k advance; deliver by shift ${offer.deadline}. ${offer.daily}k maximum income, ${offer.serviceCost}k service cost per shift. ${offer.exclusive ? 'Other deals wait until this exclusive term resolves.' : 'No exclusivity.'}`;
}

/**
 * Determine whether a project satisfies its negotiated oversight clause.
 * @param {Record<string, any>} lab Campaign.
 * @param {string} id Signed agreement.
 * @returns {boolean} Whether the released program meets its signed ceiling.
 */
export function contractOversightSatisfied(lab, id) {
  const deal = LAB_CONTENT.contracts[id];
  const oversight = contractTerms(lab, id).oversight;
  const actual = lab.programs[deal.project].settings.oversight;
  return (
    oversight === 'any' ||
    (oversight === 'human' && actual !== 'autonomous') ||
    (oversight === 'autonomous' && actual === 'autonomous')
  );
}

/**
 * Settle independently observable constituencies after one real shift.
 * @param {Record<string, any>} lab Settled campaign.
 * @param {number} incidentCost Actual one-time incident charges this shift.
 * @param {Record<string, any>} operations Current operating reliability by project.
 * @returns {void} Updates only bounded stakeholder standings.
 */
export function settleStakeholders(lab, incidentCost, operations) {
  const serviceDelta = (
    /** @type {string} */ contractId,
    /** @type {string} */ projectId
  ) => {
    if (lab.expired.includes(contractId)) return -1;
    if (!lab.fulfilled.includes(contractId)) return 0;
    const performance = operations.projects.find(
      (/** @type {Record<string, any>} */ row) => row.id === projectId
    );
    return performance?.adoption >= 20 && performance.reliability >= 70
      ? 1
      : -2;
  };
  /** @type {Record<string, number>} */
  const effects = {
    workforce:
      (lab.morale >= 75 ? 1 : 0) -
      (lab.morale < 35 ? 2 : 0) -
      (incidentCost > 0 ? 2 : 0),
    clinic: serviceDelta('clinic', 'atlas'),
    transit: serviceDelta('transit', 'lumen'),
    regulator:
      lab.data === 'licensed' &&
      lab.risk <= 35 &&
      lab.commitmentPolicies.register &&
      lab.deployed.every((/** @type {string} */ id) =>
        evaluationComplete(lab, id)
      )
        ? 1
        : lab.data === 'scraped' || lab.risk >= 55
          ? -2
          : 0,
    investor:
      lab.cash >= lab.debt + 50
        ? 1
        : lab.cash < 25 || lab.cash < lab.debt
          ? -1
          : 0,
  };
  for (const id of STAKEHOLDER_IDS)
    lab.stakeholderStanding[id] = clampNumber(
      lab.stakeholderStanding[id] + effects[id],
      0,
      100
    );
}

/**
 * Validate saved terms against authored packages and bounded stakeholder values.
 * @param {Record<string, any>} lab Portable ledger.
 * @returns {boolean} Whether mutable contract state is internally consistent.
 */
export function validContractLedger(lab) {
  return Boolean(
    Array.isArray(lab.contracts) &&
      new Set(lab.contracts).size === lab.contracts.length &&
      lab.contractTerms &&
      Object.keys(lab.contractTerms).length === lab.contracts.length &&
      lab.contracts.every(
        (/** @type {string} */ id) =>
          Object.hasOwn(LAB_CONTENT.contracts, id) &&
          Object.hasOwn(
            LAB_CONTENT.contracts[id].packages,
            lab.contractTerms[id]
          )
      ) &&
      lab.stakeholderStanding &&
      Object.keys(lab.stakeholderStanding).length === STAKEHOLDER_IDS.length &&
      STAKEHOLDER_IDS.every(
        id =>
          Number.isInteger(lab.stakeholderStanding[id]) &&
          lab.stakeholderStanding[id] >= 0 &&
          lab.stakeholderStanding[id] <= 100
      )
  );
}

/**
 * Migrate rules-seven fixed agreements without replaying advances or outcomes.
 * @param {Record<string, any>} state Portable campaign.
 * @returns {Record<string, any>} Upgraded state, or original invalid candidate.
 */
export function migrateContracts(state) {
  const lab = state.lab;
  if (
    lab?.rulesVersion !== 7 ||
    !validInfrastructure(lab) ||
    !Array.isArray(lab.contracts) ||
    new Set(lab.contracts).size !== lab.contracts.length ||
    !lab.contracts.every((/** @type {string} */ id) =>
      Object.hasOwn(LAB_CONTENT.contracts, id)
    ) ||
    !Array.isArray(lab.fulfilled) ||
    !Array.isArray(lab.expired) ||
    !Number.isInteger(lab.trust) ||
    !Number.isInteger(lab.morale) ||
    !Number.isInteger(lab.risk) ||
    !Number.isInteger(lab.cash) ||
    !Number.isInteger(lab.debt)
  )
    return state;
  const standing = Object.fromEntries(
    Object.keys(LAB_CONTENT.stakeholders).map(id => {
      const observed =
        id === 'workforce'
          ? 30 + Math.round(lab.morale * 0.4)
          : id === 'regulator'
            ? 65 - Math.round(lab.risk * 0.5)
            : id === 'investor'
              ? 50 + Math.sign(lab.cash - lab.debt) * 10
              : 35 + Math.round(lab.trust * 0.3);
      return [id, clampNumber(observed, 0, 100)];
    })
  );
  const upgraded = {
    ...state,
    lab: {
      ...lab,
      rulesVersion: 8,
      contractTerms: Object.fromEntries(
        lab.contracts.map((/** @type {string} */ id) => [id, 'balanced'])
      ),
      stakeholderStanding: standing,
    },
    toast:
      'Negotiation ledger upgraded. Existing agreements retain their original terms and paid advances; no settlement is replayed.',
  };
  return upgraded;
}
