const PASSENGER_OUTCOMES = {
  evacuated: {
    memorial: 'Both passenger groups reached shore before the ferry went down.',
    orla: 'Orla notes that both passenger groups reached shore before the ferry sank. The loss of the vessel still weighs on her watch, but she trusts Mara to give a full account of the rescue.',
    engineer:
      "The ferry engineer reached shore with the first passenger group and is available to advise Orla's harbor crew.",
  },
  partial: {
    memorial:
      'One passenger group reached shore; the other was lost with the ferry.',
    orla: "Orla credits Mara with getting one passenger group ashore, but keeps her trust provisional until the other group's loss is accounted for.",
    engineer:
      "The ferry engineer reached shore with the first passenger group and is available to advise Orla's harbor crew. The second passenger group was lost.",
  },
  lost: {
    memorial: 'Both passenger groups were lost with the ferry.',
    orla: "Orla's trust in Mara's harbor judgment is shaken after both passenger groups were lost with the ferry. She asks for a full account; the record does not establish which warnings reached the ferry.",
    engineer:
      'The ferry engineer remained aboard when the ferry went down; no ferry engineer is available to advise the harbor crew.',
  },
};

const THREEFOLD_CAMPAIGN_PLACES = [
  { id: 'broken-gate', label: 'Broken Gate' },
  { id: 'sluice', label: 'Tidal Archive' },
  { id: 'silt-margin', label: 'Silt Margin' },
  { id: 'hearthgaps', label: 'Hearthgaps' },
  { id: 'weftways', label: 'Weftways' },
  { id: 'grainlands', label: 'Grainlands' },
  { id: 'lantern-ward', label: 'Lantern Ward' },
  { id: 'belltops', label: 'Belltops' },
  { id: 'crownback-reach', label: 'Crownback Reach' },
  { id: 'wakeform-shoals', label: 'Wakeform Shoals' },
];
export const THREEFOLD_CAMPAIGN_SCENE_IDS = Object.freeze(
  THREEFOLD_CAMPAIGN_PLACES.map(place => place.id)
);

/**
 * Index the current and previously saved regions without merging their state.
 * @param {Record<string, any>} savedRuns Validated region saves keyed by scene ID.
 * @param {string} activeSceneId Scene currently open in the runtime.
 * @returns {Array<{id: string, label: string, active: boolean}>} Authored-order region index.
 */
export function getThreefoldCampaignPlaces(savedRuns, activeSceneId) {
  return THREEFOLD_CAMPAIGN_PLACES.filter(
    place =>
      place.id === activeSceneId ||
      savedRuns?.[place.id]?.scene?.id === place.id
  ).map(place => ({
    ...place,
    active: place.id === activeSceneId,
  }));
}

/**
 * Derive Belltops' accessible campaign records from the saved Broken Gate outcome.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>|null|undefined} brokenGate Saved Broken Gate run, if present.
 * @returns {{harborMemorial: {title: string, text: string}, orlaHarborResponse: {title: string, text: string}, harborEngineerAvailability: {title: string, text: string}}|null} Related harbor records, or null without a valid ferry loss.
 */
export function getThreefoldHarborCampaignContent(brokenGate) {
  if (!isSavedFerryLoss(brokenGate)) return null;

  const outcome = getPassengerOutcome(brokenGate.episode.passengers);
  if (!outcome) return null;

  return {
    harborMemorial: {
      title: 'Harrowfen ferry memorial',
      text: `The Belltops harbor bell marks the Harrowfen ferry, lost in the Broken Gate surge. ${outcome.memorial} No passenger names are listed.`,
    },
    orlaHarborResponse: {
      title: "Orla's harbor response",
      text: outcome.orla,
    },
    harborEngineerAvailability: {
      title: 'Harbor engineering support',
      text: outcome.engineer,
    },
  };
}

/**
 * @param {'aboard'|'partial'|'evacuated'|'lost'|undefined} passengers Saved passenger groups.
 * @returns {{memorial: string, orla: string, engineer: string}|null} Known outcome text or null.
 */
function getPassengerOutcome(passengers) {
  if (passengers === 'evacuated') return PASSENGER_OUTCOMES.evacuated;
  if (passengers === 'partial') return PASSENGER_OUTCOMES.partial;
  if (passengers === 'lost') return PASSENGER_OUTCOMES.lost;
  return null;
}

/**
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>|null|undefined} brokenGate Candidate saved run.
 * @returns {brokenGate is ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} Whether this is a Broken Gate ferry-loss record.
 */
function isSavedFerryLoss(brokenGate) {
  return (
    brokenGate?.scene?.id === 'broken-gate' &&
    brokenGate.episode?.ferry === 'lost'
  );
}
