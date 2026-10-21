const PASSENGER_MEMORIAL_TEXT = {
  evacuated: 'Both passenger groups reached shore before the ferry went down.',
  partial:
    'One passenger group reached shore; the other was lost with the ferry.',
  lost: 'Both passenger groups were lost with the ferry.',
};

/**
 * Derive the Belltops memorial from the saved Broken Gate outcome.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>|null|undefined} brokenGate Saved Broken Gate run, if present.
 * @returns {{title: string, text: string}|null} Factual harbor record of the lost ferry.
 */
export function getThreefoldHarborMemorial(brokenGate) {
  if (
    brokenGate?.scene?.id !== 'broken-gate' ||
    brokenGate.episode?.ferry !== 'lost'
  )
    return null;

  const passengerRecord =
    brokenGate.episode.passengers === 'evacuated'
      ? PASSENGER_MEMORIAL_TEXT.evacuated
      : brokenGate.episode.passengers === 'partial'
        ? PASSENGER_MEMORIAL_TEXT.partial
        : brokenGate.episode.passengers === 'lost'
          ? PASSENGER_MEMORIAL_TEXT.lost
          : null;
  if (!passengerRecord) return null;

  return {
    title: 'Harrowfen ferry memorial',
    text: `The Belltops harbor bell marks the Harrowfen ferry, lost in the Broken Gate surge. ${passengerRecord} No passenger names are listed.`,
  };
}
