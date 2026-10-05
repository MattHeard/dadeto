import { LAB_CONTENT } from './content.js';

/** @typedef {Record<string, any>} EpilogueCampaign */

/**
 * Summarize the actual people, operating choices and obligations at closing.
 * @param {string} outcome Authored campaign resolution.
 * @param {EpilogueCampaign} lab Final persistent campaign ledger.
 * @returns {string} Resolution-specific, evidence-backed closing passage.
 */
export function campaignEpilogue(outcome, lab) {
  const releases = lab.deployed.length
    ? lab.deployed
        .map((/** @type {string} */ id) => {
          const project = LAB_CONTENT.projects[id];
          const settings = lab.programs[id].settings;
          return `${project.name.split(' / ')[0]} / ${settings.specialization} / ${settings.size} / ${settings.hosting} / ${settings.oversight}`;
        })
        .join('; ')
    : 'no model released';
  const people = lab.employees
    .map(
      (/** @type {{name: string, role: string}} */ person) =>
        `${person.name} / ${person.role}`
    )
    .join(', ');
  const strongest = Object.keys(LAB_CONTENT.stakeholders).reduce(
    (best, id) =>
      lab.stakeholderStanding[id] > lab.stakeholderStanding[best] ? id : best,
    Object.keys(LAB_CONTENT.stakeholders)[0]
  );
  const details = `Released work: ${releases}.
    Your team closes as ${people}, with morale ${lab.morale}/100.
    ${LAB_CONTENT.stakeholders[strongest].name} has the strongest standing at ${lab.stakeholderStanding[strongest]}/100; the safety register records ${lab.incidents} incident(s).
    Debt at the ownership hearing: ${lab.debt}k. ${ownershipTerms(outcome, lab)}`;
  return details.replace(/\s+/g, ' ');
}

/**
 * Explain the ownership result from the actual resolution and signed note.
 * @param {string} outcome Authored campaign resolution.
 * @param {EpilogueCampaign} lab Final persistent campaign ledger.
 * @returns {string} Closing ownership terms.
 */
function ownershipTerms(outcome, lab) {
  if (lab.rescueFinancing)
    return `${LAB_CONTENT.rescueOffers[lab.rescueFinancing.id].name} ownership terms remain active.`;
  if (outcome === 'insolvent')
    return 'The creditors take control after the intervention window closes.';
  if (outcome === 'acquired')
    return 'Helios takes the keys at the debt confrontation.';
  if (outcome === 'city-covenant')
    return 'The clinic and transit union share ownership under the covenant.';
  if (outcome === 'gilded-cage')
    return 'The lab remains open under the restrictions earned by its record.';
  return 'The team keeps the keys without a new outside owner.';
}
