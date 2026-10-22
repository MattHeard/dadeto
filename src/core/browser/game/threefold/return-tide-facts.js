import {
  RETURN_TIDE_PEOPLE,
  RETURN_TIDE_DEVICES,
} from './return-tide-world.js';

/**
 * Derive actual hardware, observed evidence and community preparation from saved play.
 * @param {Record<string, any>} runs Canonical saved and active regions.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Current explicit commitments.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Conserved feeder controls.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate|null} [iriFate] Actual surviving sibling support.
 * @returns {import('./return-tide.js').ReturnTideFacts} Concrete prerequisites without a moral score.
 */
export function getThreefoldReturnTideFacts(
  runs,
  tide,
  network,
  iriFate = null
) {
  const priorDeaths = RETURN_TIDE_PEOPLE.filter(person =>
    (runs[person.sceneId]?.encounter.growthDeaths || []).some(
      /**
       * @param {{creatureId:string}} death Historical casualty.
       * @returns {boolean} Whether this named person died.
       */
      death => death.creatureId === person.id
    )
  ).map(person => person.key);
  priorDeaths.push(
    ...tide.rememberedGrowthDeaths.filter(id => !priorDeaths.includes(id))
  );
  const living = RETURN_TIDE_PEOPLE.filter(
    person =>
      !priorDeaths.includes(person.key) &&
      !tide.deathIds.includes(person.key) &&
      !tide.displacedGroups.includes(person.faction || 'assembly')
  );
  const known = knownEvidence(runs);
  const factions = living
    .filter(
      person => person.faction && factionPrepared(person.faction, runs, network)
    )
    .map(person => /** @type {string} */ (person.faction));
  const gate = runs['broken-gate'];
  const gateEpisode = gate?.episode;
  const reportFiled = gateEpisode?.closedBy === 'reported';
  const engineerAvailable =
    ['partial', 'evacuated'].includes(gate?.episode.passengers) ||
    gate?.episode.gateRepairedBeforeSurge === true ||
    ['rescued', 'evacuated'].includes(iriFate?.outcome || '');
  const intact = RETURN_TIDE_DEVICES.filter(
    device =>
      !(runs[device.sceneId]?.player.destroyedGeometryIds || []).includes(
        device.id
      )
  ).map(device => device.kind);
  return {
    intactMechanisms: intact,
    availableFactions: factions,
    engineerAvailable:
      engineerAvailable &&
      (!tide.damageIds.includes('quay-hospital') ||
        tide.agreements.includes('assembly')),
    evidenceCount: known.length,
    rootRelief:
      network.bypassOpen && runs['silt-margin']?.siltMargin.signal === 'sent',
    coastReady:
      runs['crownback-reach']?.crownbackReach.tharnMet === true &&
      runs['wakeform-shoals']?.wakeformShoals.wakeformDiverted === true,
    preparedGroups: [
      ...new Set([...tide.agreements, ...naturallyPrepared(runs, network)]),
    ],
    priorDeathIds: priorDeaths,
    civicAccount: {
      reportFiled,
      iriConfessionDisclosed:
        reportFiled &&
        gateEpisode?.witnessLedger?.some(
          /**
           * @param {{action?: string}} entry Saved Broken Gate witness record.
           * @returns {boolean} Whether the optional lead was in the report.
           */
          entry => entry.action === 'latchfolk-witness-lead'
        ) === true,
      passengerOutcome: gateEpisode?.passengers || null,
      ferryOutcome: gateEpisode?.ferry || null,
    },
  };
}

/**
 * @param {Record<string, any>} runs Canonical route records.
 * @returns {string[]} Independently discovered evidence routes.
 */
function knownEvidence(runs) {
  const routes = /** @type {Record<string, boolean>} */ ({
    archive: runs['small-world-sluice']?.archiveTraceHeard === true,
    choir: runs['silt-margin']?.siltMargin.quietingEvidenceHeard === true,
    relay: runs.weftways?.weftways.relayRecordRead === true,
  });
  const known = [];
  for (const id of Object.keys(routes)) if (routes[id]) known.push(id);
  return known;
}

/**
 * @param {string} faction Negotiating community.
 * @param {Record<string, any>} runs Actual local preparation.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Existing relief.
 * @returns {boolean} Whether this community can make a real commitment.
 */
function factionPrepared(faction, runs, network) {
  if (faction === 'assembly') return true;
  if (faction === 'latchfolk')
    return (
      runs.hearthgaps?.hearthgaps.runoffChoice !== 'undecided' &&
      Boolean(runs.hearthgaps)
    );
  if (faction === 'threadbound')
    return runs.weftways?.weftways.relayRecordRead === true;
  if (faction === 'nursery')
    return (
      runs.grainlands?.grainlands.spiderFate !== 'present' &&
      Boolean(runs.grainlands) &&
      !network.nurseryDamaged
    );
  if (faction === 'choir')
    return runs['silt-margin']?.siltMargin.quietingEvidenceHeard === true;
  return runs['crownback-reach']?.crownbackReach.tharnMet === true;
}

/**
 * @param {Record<string, any>} runs Existing warnings and evacuation routes.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Physical shelter preparation.
 * @returns {string[]} Communities whose own prior work can save lives in Mara's absence.
 */
function naturallyPrepared(runs, network) {
  const groups = [];
  if (['warned', 'safe'].includes(runs['broken-gate']?.episode.latchfolk))
    groups.push('latchfolk');
  if (runs.weftways?.weftways.flowChoice === 'pell-bypass')
    groups.push('threadbound');
  if (network.hatchClosed && !network.nurseryDamaged) groups.push('nursery');
  if (runs['silt-margin']?.siltMargin.signal === 'sent') groups.push('choir');
  if (runs['crownback-reach']?.crownbackReach.tharnMet === true)
    groups.push('crownback');
  return groups;
}
