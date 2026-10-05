import { LAB_CONTENT } from './content.js';
import { migrateCampaignAct } from './campaign.js';

const WINDOW_LENGTH = 2;

/**
 * Create the durable record for a financial-distress episode.
 * @returns {{status: string, openedShift: null, shiftsRemaining: number}} Clear initial state.
 */
export function createDistress() {
  return { status: 'clear', openedShift: null, shiftsRemaining: 0 };
}

/**
 * Validate a saved rescue choice against the authored offer and current date.
 * @param {Record<string, any>} financing Persisted offer id and signed shift.
 * @param {number} shift Current world shift.
 * @returns {boolean} Whether the saved financing is canonical.
 */
function validFinancing(financing, shift) {
  return (
    financing === null ||
    (financing &&
      Object.keys(financing).length === 2 &&
      Object.hasOwn(LAB_CONTENT.rescueOffers, financing.id) &&
      Number.isInteger(financing.signedShift) &&
      financing.signedShift >= 1 &&
      financing.signedShift <= shift)
  );
}

/**
 * Validate current distress state without trusting saved authored terms.
 * @param {Record<string, any>} lab Campaign ledger.
 * @param {number} shift Current world shift.
 * @returns {boolean} Whether the episode and financing references are valid.
 */
export function validDistress(lab, shift) {
  const record = lab.distress;
  if (
    !record ||
    Object.keys(record).length !== 3 ||
    !['clear', 'open', 'stabilized', 'expired'].includes(record.status) ||
    !validFinancing(lab.rescueFinancing, shift)
  )
    return false;
  if (record.status === 'clear')
    return record.openedShift === null && record.shiftsRemaining === 0;
  if (record.status === 'open')
    return (
      Number.isInteger(record.openedShift) &&
      record.openedShift >= 1 &&
      record.openedShift <= shift &&
      Number.isInteger(record.shiftsRemaining) &&
      record.shiftsRemaining > 0 &&
      record.shiftsRemaining <= WINDOW_LENGTH
    );
  return (
    Number.isInteger(record.openedShift) &&
    record.openedShift >= 1 &&
    record.openedShift <= shift &&
    record.shiftsRemaining === 0
  );
}

/**
 * Apply one authored emergency note to an open distress episode.
 * @param {Record<string, any>} lab Mutable cloned ledger.
 * @param {string} id Authored offer identifier.
 * @param {number} shift Current playable shift.
 * @returns {string} Terms accepted or the exact rejection reason.
 */
export function rescueOrder(lab, id, shift) {
  const offer = LAB_CONTENT.rescueOffers[id];
  if (lab.distress.status !== 'open')
    return 'No distress window is open. No financing or ownership changes.';
  if (lab.rescueFinancing)
    return 'One rescue note is already signed. No further financing is available.';
  if (!offer) return 'Unknown financing offer. No ledger changes.';
  lab.cash += offer.advance;
  lab.debt += offer.repayment;
  for (const [stakeholder, change] of Object.entries(offer.standing))
    lab.stakeholderStanding[stakeholder] = Math.max(
      0,
      Math.min(100, lab.stakeholderStanding[stakeholder] + change)
    );
  lab.rescueFinancing = { id, signedShift: shift };
  return `${offer.name} signed: +${offer.advance}k now, ${offer.repayment}k due at shift 28. ${offer.ownership}`;
}

/**
 * Open, stabilize, or expire the two-settlement intervention window.
 * @param {Record<string, any>} lab Settled mutable ledger.
 * @param {number} nextShift Shift that would follow this settlement.
 * @param {string[]} report Mutable settlement report.
 * @returns {boolean} Whether the two-shift window expired while cash stayed negative.
 */
export function advanceDistress(lab, nextShift, report) {
  const record = lab.distress;
  if (lab.cash >= 0) {
    if (record.status === 'open') {
      lab.distress = { ...record, status: 'stabilized', shiftsRemaining: 0 };
      report.push('RUNWAY STABILIZED. The intervention window is closed.');
    }
    return false;
  }
  if (record.status === 'clear' || record.status === 'stabilized') {
    lab.distress = {
      status: 'open',
      openedShift: nextShift,
      shiftsRemaining: WINDOW_LENGTH,
    };
    report.push(
      `CASH BELOW ZERO. Emergency options remain for ${WINDOW_LENGTH} shifts before insolvency.`
    );
    return false;
  }
  if (record.status === 'expired') return true;
  const shiftsRemaining = Math.max(0, record.shiftsRemaining - 1);
  if (shiftsRemaining === 0) {
    lab.distress = { ...record, status: 'expired', shiftsRemaining };
    report.push('RESCUE WINDOW EXPIRED. Insolvency follows this report.');
    return true;
  }
  lab.distress = { ...record, shiftsRemaining };
  report.push(
    `DISTRESS: ${shiftsRemaining} intervention shift remains before insolvency.`
  );
  return false;
}

/**
 * Add the signed rescue's ownership consequence to a resolution epilogue.
 * @param {Record<string, any>} lab Final campaign ledger.
 * @returns {string} Authored ownership consequence or no added paragraph.
 */
export function rescueConsequence(lab) {
  const id = lab.rescueFinancing?.id;
  return id ? LAB_CONTENT.rescueOffers[id].ownership : '';
}

/**
 * Upgrade a rules-nine ledger without inventing distress or financing history.
 * @param {Record<string, any>} state Portable saved campaign.
 * @returns {Record<string, any>} Rules-ten campaign or untouched input.
 */
export function migrateDistress(state) {
  if (state.lab?.rulesVersion === 8) state = migrateCampaignAct(state);
  if (state.lab?.rulesVersion !== 9) return state;
  const migrated = /** @type {Record<string, any>} */ ({
    ...state,
    lab: {
      ...state.lab,
      rulesVersion: 10,
      distress: createDistress(),
      rescueFinancing: null,
    },
  });
  migrated.toast =
    'Runway intervention is available if cash falls below zero. Existing balances and history are preserved.';
  return migrated;
}
