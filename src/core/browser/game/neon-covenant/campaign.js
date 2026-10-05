import { LAB_CONTENT } from './content.js';

/** @type {Record<string, (lab: Record<string, any>, shift: number) => boolean>} */
const CHAPTER_SCENES = {
  prototype: lab =>
    Object.values(lab.programs).some(program =>
      program.milestones.includes('prototype')
    ),
  users: lab => lab.deployed.length > 0,
  sharedRecord: (lab, shift) => shift >= 14 && lab.fulfilled.length > 0,
};

/** @type {Record<string, string>} */
const SCENE_LABELS = {
  prototype: 'Ada / first prototype',
  users: 'Mae / first users',
  sharedRecord: 'Archive / ownership register',
};

/**
 * Resolve the authored act containing a campaign shift.
 * @param {number} shift Current 1-based shift.
 * @returns {Record<string, any>} Authored act, clamped to the campaign bounds.
 */
export function actForShift(shift) {
  const bounded = Math.max(1, Math.min(28, shift));
  const acts = /** @type {Record<string, any>[]} */ (LAB_CONTENT.acts);
  return (
    acts.find(act => bounded >= act.startShift && bounded <= act.endShift) ||
    acts[0]
  );
}

/**
 * Create persistent identity for the act in which the campaign currently sits.
 * @param {number} shift Current 1-based shift.
 * @returns {{id: string, enteredShift: number}} Saved act marker.
 */
export function createCampaignAct(shift) {
  const act = actForShift(shift);
  return { id: act.id, enteredShift: act.startShift };
}

/**
 * Advance the act marker once when settlement crosses an authored boundary.
 * @param {Record<string, any>} lab Settled mutable campaign ledger.
 * @param {number} nextShift Shift that becomes active after settlement.
 * @returns {{campaignAct: {id: string, enteredShift: number}, act: Record<string, any>, changed: boolean}} Transition result.
 */
export function advanceCampaignAct(lab, nextShift) {
  const act = actForShift(nextShift);
  const campaignAct = createCampaignAct(nextShift);
  return {
    campaignAct,
    act,
    changed: lab.campaignAct?.id !== campaignAct.id,
  };
}

/**
 * List authored archive scenes unlocked by earned campaign evidence.
 * @param {Record<string, any>} lab Current ledger.
 * @param {number} shift Current 1-based shift.
 * @returns {string[]} Unlocked scene identifiers in authored order.
 */
export function availableChapterScenes(lab, shift) {
  return Object.entries(CHAPTER_SCENES)
    .filter(([, unlocked]) => unlocked(lab, shift))
    .map(([id]) => id);
}

/**
 * Resolve a compact authored name for an unlocked archive scene.
 * @param {string} id Authored scene identifier.
 * @returns {string} Visible handheld choice label.
 */
export function chapterSceneLabel(id) {
  return SCENE_LABELS[id] || 'Unknown chapter scene';
}

/**
 * Validate the persisted act marker against the trusted calendar.
 * @param {Record<string, any>} lab Current campaign ledger.
 * @param {number} shift Current 1-based shift.
 * @returns {boolean} Whether the marker is canonical for this date.
 */
export function validCampaignAct(lab, shift) {
  const expected = createCampaignAct(shift);
  return Boolean(
    lab.campaignAct &&
      Object.keys(lab.campaignAct).length === 2 &&
      lab.campaignAct.id === expected.id &&
      lab.campaignAct.enteredShift === expected.enteredShift
  );
}

/**
 * Upgrade rules-eight saves with a date-derived act and no invented history.
 * @param {Record<string, any>} state Portable saved campaign.
 * @returns {Record<string, any>} Rules-nine campaign or the untouched input.
 */
export function migrateCampaignAct(state) {
  const day = state.world?.day;
  if (
    state.lab?.rulesVersion !== 8 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 29
  )
    return state;
  const migrated = /** @type {Record<string, any>} */ ({
    ...state,
    lab: { ...state.lab },
  });
  migrated.lab.rulesVersion = 9;
  migrated.lab.campaignAct = createCampaignAct(day);
  migrated.toast =
    'Campaign chapters unlocked. Your current shift and every prior ledger entry are preserved.';
  return migrated;
}
