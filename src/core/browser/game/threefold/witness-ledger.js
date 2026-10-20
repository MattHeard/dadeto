import {
  FERRY_OUTCOMES,
  LATCHFOLK_OUTCOMES,
  PASSENGER_OUTCOMES,
} from './episode-values.js';

const EVENT_TYPES = new Set(['choice', 'observation', 'repair']);
const CRISIS_STAGES = new Set(['rising', 'urgent', 'surge', 'aftermath']);
const GATE_STATES = new Set(['held', 'forced-open', 'repaired']);
const DRAINAGE_STATES = new Set(['dry', 'at-risk', 'flooded', 'receded']);

/**
 * Normalize and validate a saved factual witness history.
 * @param {unknown} candidate Saved ledger value.
 * @returns {Array<Record<string, any>>} Canonical ordered history.
 */
export function normalizeThreefoldWitnessLedger(candidate) {
  if (candidate === undefined) return [];
  if (!Array.isArray(candidate) || candidate.length > 128)
    throw new RangeError('Witness ledger is invalid.');
  const ids = new Set();
  return candidate.map((entry, index) => {
    if (!isWitnessEntry(entry, index, ids))
      throw new RangeError('Witness ledger is invalid.');
    ids.add(entry.id);
    return normalizeWitnessEntry(entry);
  });
}

/**
 * Add one deterministic witness event without changing earlier records.
 * @template T
 * @param {T & {witnessLedger?: Array<Record<string, any>>}} episode Current episode state.
 * @param {Record<string, any>} entry New factual event.
 * @returns {T & {witnessLedger: Array<Record<string, any>>}} Episode with its appended history.
 */
export function appendThreefoldWitnessEntry(episode, entry) {
  const ledger = episode.witnessLedger || [];
  return {
    ...episode,
    witnessLedger: normalizeThreefoldWitnessLedger([...ledger, entry]),
  };
}

/**
 * Build a concise accessible journal entry from one saved event.
 * @param {Record<string, any>} entry Canonical event.
 * @returns {{title: string, intention: string, knowledge: string, consequence: string, relation: string|null}} Player-facing text.
 */
export function presentThreefoldWitnessEntry(entry) {
  const label =
    entry.type === 'choice'
      ? 'CHOICE'
      : entry.type === 'repair'
        ? 'LATER REPAIR'
        : 'OBSERVATION';
  const minute = Number(entry.atGameMinute.toFixed(2));
  const known = entry.knowledge.displayedStatus || describeKnownState(entry);
  return {
    title: `${label} · ${minute} GAME MINUTES`,
    intention: `${entry.intention} Intended outcome: ${entry.intendedOutcome}`,
    knowledge: `Known then: ${known}`,
    consequence: `Observed: ${describeConsequence(entry.consequence)}`,
    relation: entry.relatedEventId
      ? `Linked to ${entry.relatedEventId}.`
      : null,
  };
}

/**
 * Check the required shape and referential integrity before normalization.
 * @param {any} entry Candidate event.
 * @param {number} index Expected sequence position.
 * @param {Set<string>} priorIds Earlier event IDs.
 * @returns {boolean} Whether the candidate is valid.
 */
function isWitnessEntry(entry, index, priorIds) {
  return (
    entry &&
    typeof entry === 'object' &&
    entry.id === `witness-${index + 1}` &&
    !priorIds.has(entry.id) &&
    EVENT_TYPES.has(entry.type) &&
    Number.isFinite(entry.atGameMinute) &&
    entry.atGameMinute >= 0 &&
    typeof entry.action === 'string' &&
    typeof entry.intention === 'string' &&
    typeof entry.intendedOutcome === 'string' &&
    isKnowledge(entry.knowledge) &&
    isConsequence(entry.consequence) &&
    (entry.relatedEventId === null || priorIds.has(entry.relatedEventId))
  );
}

/**
 * @param {any} value Candidate knowledge snapshot.
 * @returns {boolean} Whether its fields are canonicalizable.
 */
function isKnowledge(value) {
  return (
    isSharedSnapshot(value) &&
    (value.displayedStatus === null ||
      typeof value.displayedStatus === 'string') &&
    isStringList(value.previewedGeometryIds) &&
    isStringList(value.previewedOccupantIds) &&
    isStringList(value.previewedCreatureIds)
  );
}

/**
 * @param {any} value Candidate observed consequence snapshot.
 * @returns {boolean} Whether its fields are canonicalizable.
 */
function isConsequence(value) {
  return isSharedSnapshot(value) && isStringList(value.damagedGeometryIds);
}

/**
 * @param {any} value Candidate shared gate and settlement facts.
 * @returns {boolean} Whether common snapshot values are valid.
 */
function isSharedSnapshot(value) {
  return (
    value &&
    typeof value === 'object' &&
    Number.isInteger(value.scale) &&
    CRISIS_STAGES.has(value.crisisStage) &&
    Number.isFinite(value.elapsedMinutes) &&
    GATE_STATES.has(value.gateState) &&
    DRAINAGE_STATES.has(value.drainageState) &&
    PASSENGER_OUTCOMES.has(value.passengers) &&
    FERRY_OUTCOMES.has(value.ferry) &&
    LATCHFOLK_OUTCOMES.has(value.latchfolk)
  );
}

/**
 * @param {unknown} value Candidate string array.
 * @returns {boolean} Whether every entry is a non-empty string.
 */
function isStringList(value) {
  return (
    Array.isArray(value) &&
    value.length <= 64 &&
    value.every(item => typeof item === 'string' && item.length > 0)
  );
}

/**
 * Copy event values into the save-safe public shape.
 * @param {Record<string, any>} entry Valid event.
 * @returns {Record<string, any>} Canonical entry.
 */
function normalizeWitnessEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    atGameMinute: entry.atGameMinute,
    action: entry.action,
    intention: entry.intention,
    intendedOutcome: entry.intendedOutcome,
    knowledge: {
      scale: entry.knowledge.scale,
      crisisStage: entry.knowledge.crisisStage,
      elapsedMinutes: entry.knowledge.elapsedMinutes,
      displayedStatus: entry.knowledge.displayedStatus,
      previewedGeometryIds: [...entry.knowledge.previewedGeometryIds],
      previewedOccupantIds: [...entry.knowledge.previewedOccupantIds],
      previewedCreatureIds: [...entry.knowledge.previewedCreatureIds],
      gateState: entry.knowledge.gateState,
      drainageState: entry.knowledge.drainageState,
      passengers: entry.knowledge.passengers,
      ferry: entry.knowledge.ferry,
      latchfolk: entry.knowledge.latchfolk,
    },
    consequence: {
      scale: entry.consequence.scale,
      crisisStage: entry.consequence.crisisStage,
      elapsedMinutes: entry.consequence.elapsedMinutes,
      damagedGeometryIds: [...entry.consequence.damagedGeometryIds],
      gateState: entry.consequence.gateState,
      drainageState: entry.consequence.drainageState,
      passengers: entry.consequence.passengers,
      ferry: entry.consequence.ferry,
      latchfolk: entry.consequence.latchfolk,
    },
    relatedEventId: entry.relatedEventId,
  };
}

/**
 * Describe the pre-existing state when no rendered toast was captured.
 * @param {Record<string, any>} entry Witness event.
 * @returns {string} Bounded state summary.
 */
function describeKnownState(entry) {
  const { knowledge } = entry;
  return `scale ${knowledge.scale}, ${knowledge.crisisStage}, gate ${knowledge.gateState}, channel ${knowledge.drainageState}`;
}

/**
 * Describe outcome facts without evaluating or scoring the player's choice.
 * @param {Record<string, any>} consequence Canonical outcome snapshot.
 * @returns {string} Plain factual summary.
 */
function describeConsequence(consequence) {
  return [
    `scale ${consequence.scale}`,
    consequence.crisisStage,
    `gate ${consequence.gateState}`,
    `channel ${consequence.drainageState}`,
    `passengers ${consequence.passengers}`,
    `ferry ${consequence.ferry}`,
    `Latchfolk ${consequence.latchfolk}`,
  ].join('; ');
}
