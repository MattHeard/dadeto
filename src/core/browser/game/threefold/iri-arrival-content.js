/**
 * Present a reachable shift record without disclosing an unobserved event.
 * @param {import('./campaign-outcomes.js').ThreefoldCampaignOutcomes} outcomes Physical and known events.
 * @param {ReturnType<typeof import('./quay-regulator.js').getThreefoldQuayContent>} content Existing machinery controls.
 * @returns {ReturnType<typeof import('./quay-regulator.js').getThreefoldQuayContent>} Existing controls with a physical arrival account.
 */
export function presentThreefoldIriArrival(outcomes, content) {
  if (!content) return null;
  if (outcomes.iriKnowledge !== undefined)
    return {
      ...content,
      text: 'A shift record remains at the Quay panel. Approach and press A to read what happened here. Reading does not change the machinery or turn back the tide.',
      hud: 'A READ QUAY SHIFT RECORD',
      action: null,
    };
  const account = arrivalAccount(outcomes.iriFate?.milestoneId);
  if (!account) return content;
  return {
    ...content,
    text: `${account.text} ${content.text}`,
    hud: content.action ? content.hud : account.hud,
  };
}

/**
 * Explain the specific prior-action cause after its record has been observed.
 * @param {string|undefined} milestoneId Observed physical event.
 * @returns {{text: string, hud: string}|null} Attributed shift record.
 */
function arrivalAccount(milestoneId) {
  const accounts = {
    'quay-fitted-governor-escape': {
      text: 'The shift record says the fitted crane governor took the load at the surge. Iri escaped from the panel. Harbor lifting remains permanently unavailable.',
      hud: 'IRI ESCAPED · GOVERNOR HOLDS',
    },
    'quay-relief-escape': {
      text: 'The shift record says the Hearthgaps bypass and surviving Choir signal unloaded the regulator. Iri escaped along the relieved service route; the harbor crane was not consumed.',
      hud: 'IRI ESCAPED · RELIEF ROUTE',
    },
    'quay-engineer-crane-evacuation': {
      text: 'The shift record credits the surviving ferry engineer and harbor crew. They fitted the crane governor and evacuated Iri. The regulator holds, but harbor lifting is permanently unavailable.',
      hud: 'IRI EVACUATED · CRANE IDLE',
    },
    'quay-support-withdrawal': {
      text: 'At the surge milestone the support crew withdrew without a surviving engineer and usable crane handoff or coordinated relief route. Iri was left holding the panel. Mara can still arrange a handoff; abandonment is not a death.',
      hud: 'IRI ABANDONED · PANEL HELD',
    },
    'quay-unchecked-gate-surge': {
      text: 'The aftermath record identifies the forced, unrepaired Broken Gate as the route of the surge. Without a relief escape or engineer handoff, Iri died at the panel and the regulator failed. Quieting evidence remains in the Archive, Silt Margin and Weftways.',
      hud: 'IRI DEAD · GATE SURGE',
    },
  };
  return accounts[/** @type {keyof typeof accounts} */ (milestoneId)] || null;
}

/**
 * Describe last observed knowledge without asserting a still-current location.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate} fate Observed event.
 * @returns {string|null} Public account, or null for an unsupported outcome.
 */
export function describeKnownThreefoldIriFate(fate) {
  const descriptions = {
    trapped: 'Iri was last seen holding the pressure regulator.',
    rescued: 'Mara rescued Iri from the pressure regulator.',
    escaped: 'Iri escaped from the pressure regulator.',
    dead: describeIriDeath(fate.milestoneId),
    evacuated: 'Another crew evacuated Iri from the pressure regulator.',
    abandoned:
      'Iri was left holding the pressure regulator; a later handoff may still be possible.',
  };
  return descriptions[fate.outcome] || null;
}

/**
 * Attribute a known death only to the cause that was actually recorded.
 * @param {string} milestoneId Observed cause.
 * @returns {string} Public cause-specific account.
 */
function describeIriDeath(milestoneId) {
  if (milestoneId === 'quay-regulator-growth')
    return 'Iri died when Mara grew into the pressure regulator.';
  if (milestoneId === 'quay-unchecked-gate-surge')
    return 'Iri died in the surge through the forced, unrepaired Broken Gate.';
  return "An account records Iri's death.";
}
