import { THREEFOLD_SLUICE_SCENE_ID } from './sluice-scene.js';
import { getThreefoldSiltMarginWaterStatus } from './silt-margin-water.js';
import {
  normalizeThreefoldSiltMarginState,
  THREEFOLD_SILT_MARGIN_SCENE_ID,
} from './silt-margin.js';
import { normalizeThreefoldHearthgapsState } from './hearthgaps.js';

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
  {
    id: 'sluice',
    sceneId: THREEFOLD_SLUICE_SCENE_ID,
    label: 'Tidal Archive',
  },
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
  THREEFOLD_CAMPAIGN_PLACES.map(place => place.sceneId || place.id)
);

/**
 * Index the current and previously saved regions without merging their state.
 * @param {Record<string, any>} savedRuns Validated region saves keyed by scene ID.
 * @param {string} activeSceneId Scene currently open in the runtime.
 * @returns {Array<{id: string, label: string, active: boolean}>} Authored-order region index.
 */
export function getThreefoldCampaignPlaces(savedRuns, activeSceneId) {
  return THREEFOLD_CAMPAIGN_PLACES.filter(place => {
    const sceneId = place.sceneId || place.id;
    const isActive = sceneId === activeSceneId;
    const isSaved = savedRuns?.[sceneId]?.scene?.id === sceneId;
    return isActive || isSaved;
  }).map(({ sceneId, ...place }) => ({
    ...place,
    active: (sceneId || place.id) === activeSceneId,
  }));
}

/**
 * Derive the shared pressure-system view from validated, independently saved routes.
 * @param {Record<string, any>} savedRuns Candidate route saves keyed by scene ID.
 * @returns {Array<{id: string, label: string, state: string, detail?: string}>} Known pressure outcomes in authored route order.
 */
export function getThreefoldCampaignPressureState(savedRuns) {
  const pressure = [];
  const belltops = savedRuns?.belltops;
  if (belltops?.scene?.id === 'belltops') {
    const destroyedGeometryIds = belltops.player?.destroyedGeometryIds;
    const regulatorDamaged =
      Array.isArray(destroyedGeometryIds) &&
      destroyedGeometryIds.includes('belltops-pressure-regulator');
    pressure.push({
      id: 'belltops-quay',
      label: 'Quay pressure regulator',
      state: regulatorDamaged ? 'damaged' : 'intact',
    });
  }

  const hearthgaps = savedRuns?.hearthgaps;
  if (
    hearthgaps?.scene?.id === 'hearthgaps' &&
    hearthgaps.hearthgaps?.runoffChoice !== undefined
  ) {
    try {
      const route = normalizeThreefoldHearthgapsState(hearthgaps.hearthgaps);
      if (route.runoffChoice !== 'undecided') {
        pressure.push({
          id: 'hearthgaps-runoff',
          label: 'Hearthgaps runoff',
          state: route.runoffChoice,
          detail: route.floodedHomeIds.join(','),
        });
      }
    } catch {
      // Invalid route data does not contribute to the campaign pressure view.
    }
  }

  const siltMargin = savedRuns?.[THREEFOLD_SILT_MARGIN_SCENE_ID];
  if (
    siltMargin?.scene?.id === THREEFOLD_SILT_MARGIN_SCENE_ID &&
    siltMargin.siltMargin
  ) {
    try {
      const route = normalizeThreefoldSiltMarginState(siltMargin.siltMargin);
      pressure.push({
        id: 'silt-margin-choir',
        label: 'Silt Margin crossing and Choir signal',
        state: route.signal,
        detail: getThreefoldSiltMarginWaterStatus(route.waterPuzzle)
          .crossingAvailable
          ? 'crossing-open'
          : 'crossing-flooded',
      });
    } catch {
      // Invalid route data does not contribute to the campaign pressure view.
    }
  }
  return pressure;
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
