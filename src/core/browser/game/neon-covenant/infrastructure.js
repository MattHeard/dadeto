/** @type {Record<string, Record<string, any>>} Authored infrastructure orders and operating effects. */
export const INFRASTRUCTURE = {
  refurbished: {
    name: 'Refurbished compute',
    cost: 18,
    compute: 2,
    cooling: 0,
    recurring: 0,
    reliability: -6,
    power: 0,
    limit: 2,
    detail:
      'Adds two compute for 18k. Older parts lower service reliability by 6 points per unit; no recurring bill.',
  },
  accelerator: {
    name: 'Specialized accelerator',
    cost: 36,
    compute: 4,
    cooling: 0,
    recurring: 3,
    reliability: -2,
    power: -2,
    limit: 1,
    detail:
      'Adds four compute and saves 2k power per shift, but precision cooling and support cost 3k per shift; reliability -2.',
  },
  leased: {
    name: 'Leased compute block',
    cost: 8,
    compute: 4,
    cooling: 0,
    recurring: 6,
    reliability: -5,
    power: 0,
    limit: 1,
    detail:
      'Adds four compute for 8k up front and 6k per shift. Provider outages lower service reliability by 5 points.',
  },
  backupPower: {
    name: 'Backup power',
    cost: 16,
    compute: 0,
    cooling: 0,
    recurring: 0,
    reliability: 5,
    power: -2,
    limit: 1,
    detail:
      'A 16k battery avoids 2k power cost each shift and improves service reliability by 5 points.',
  },
  heatRecovery: {
    name: 'Heat recovery loop',
    cost: 22,
    compute: 0,
    cooling: 3,
    recurring: 0,
    reliability: 3,
    power: 0,
    limit: 1,
    detail:
      'Costs 22k and recovers three cooling units from waste heat, improving service reliability by 3 points.',
  },
};

/**
 * Create independent equipment state for a new or migrated campaign.
 * @returns {Record<string, number>} Installed authored alternatives.
 */
export function createInfrastructure() {
  return Object.fromEntries(Object.keys(INFRASTRUCTURE).map(id => [id, 0]));
}

/**
 * Calculate disclosed recurring bills and the reliability/power modifiers.
 * @param {Record<string, any>} lab Current ledger.
 * @returns {Record<string, number>} Derived equipment effects.
 */
export function infrastructureEffects(lab) {
  return Object.entries(INFRASTRUCTURE).reduce(
    (effects, [id, option]) => {
      const count = lab.infrastructure[id];
      effects.recurring += count * option.recurring;
      effects.reliability += count * option.reliability;
      effects.power += count * option.power;
      return effects;
    },
    { recurring: 0, reliability: 0, power: 0 }
  );
}

/**
 * Install a bounded alternative with its disclosed price and capacity effect.
 * @param {Record<string, any>} lab Mutable ledger clone.
 * @param {string} id Authored equipment identifier.
 * @returns {string} Installation result or rejection.
 */
export function infrastructureOrder(lab, id) {
  const option = INFRASTRUCTURE[id];
  if (!option) return 'Unknown infrastructure. Order rejected.';
  if (lab.infrastructure[id] >= option.limit)
    return `${option.name} installation limit reached.`;
  if (lab.cash < option.cost)
    return `Need ${option.cost}k credits. Order rejected.`;
  lab.cash -= option.cost;
  lab.infrastructure[id]++;
  lab.compute += option.compute;
  lab.cooling += option.cooling;
  return `${option.name} installed. ${option.detail}`;
}

/**
 * Validate equipment counts against trusted authored choices.
 * @param {Record<string, any>} lab Imported ledger.
 * @returns {boolean} Whether every installed alternative is valid.
 */
export function validInfrastructure(lab) {
  return Boolean(
    lab.infrastructure &&
      Object.keys(lab.infrastructure).length ===
        Object.keys(INFRASTRUCTURE).length &&
      Object.entries(INFRASTRUCTURE).every(
        ([id, option]) =>
          Number.isInteger(lab.infrastructure[id]) &&
          lab.infrastructure[id] >= 0 &&
          lab.infrastructure[id] <= option.limit
      )
  );
}

/**
 * Migrate rules-six equipment ledgers without altering historical accounting.
 * @param {Record<string, any>} state Portable campaign.
 * @returns {Record<string, any>} Upgraded state or untouched input.
 */
export function migrateInfrastructure(state) {
  if (state.lab?.rulesVersion !== 6) return state;
  const upgraded = {
    ...state,
    lab: {
      ...state.lab,
      rulesVersion: 7,
      infrastructure: createInfrastructure(),
    },
    toast:
      'Infrastructure options unlocked. Ledger and original slot backup are preserved.',
  };
  return upgraded;
}
