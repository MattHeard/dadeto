import {
  advanceDistress,
  createDistress,
  migrateDistress,
  rescueConsequence,
  rescueOrder,
  validDistress,
} from '../../../../src/core/browser/game/neon-covenant/distress.js';
import {
  createLab,
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonState,
  menuCommand,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { validLabSave } from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migratePlanning } from '../../../../src/core/browser/game/neon-covenant/planning.js';

/**
 * Build a lab with an active financial intervention window.
 * @param {Record<string, any>} overrides Optional ledger fields.
 * @returns {Record<string, any>} Distressed campaign ledger.
 */
function distressedLab(overrides = {}) {
  return {
    ...createLab(),
    cash: -20,
    distress: { status: 'open', openedShift: 4, shiftsRemaining: 2 },
    ...overrides,
  };
}

/**
 * Create a controller snapshot positioned in the rescue menu.
 * @param {Record<string, any>} lab Distressed campaign ledger.
 * @returns {Record<string, any>} Playable controller snapshot.
 */
function distressState(lab) {
  const state = createNeonState();
  return {
    ...state,
    dialogue: null,
    world: { ...state.world, day: 4 },
    lab,
    menu: { page: 'distress', selected: 0 },
  };
}

test('a negative settlement opens exactly two playable rescue settlements', () => {
  const state = createNeonState();
  state.dialogue = null;
  state.world.day = 10;
  state.lab.cash = -100;
  const opened = endShift(state);
  expect(opened.lab.distress).toEqual({
    status: 'open',
    openedShift: 11,
    shiftsRemaining: 2,
  });
  expect(opened.lab.outcome).toBeNull();
  const first = endShift(opened);
  expect(first.lab.distress.shiftsRemaining).toBe(1);
  expect(first.lab.outcome).toBeNull();
  const expired = endShift(first);
  expect(expired.lab.distress).toEqual({
    status: 'expired',
    openedShift: 11,
    shiftsRemaining: 0,
  });
  expect(expired.lab.outcome).toBe('insolvent');
  expect(expired.lab.report).toContain(
    'RESCUE WINDOW EXPIRED. Insolvency follows this report.'
  );
});

test('cleared runway stabilizes the episode and leaves it available for a later relapse', () => {
  const lab = distressedLab({ cash: 300 });
  const report = [];
  expect(advanceDistress(lab, 5, report)).toBe(false);
  expect(lab.distress).toEqual({
    status: 'stabilized',
    openedShift: 4,
    shiftsRemaining: 0,
  });
  expect(report).toEqual([
    'RUNWAY STABILIZED. The intervention window is closed.',
  ]);
  lab.cash = -1;
  expect(advanceDistress(lab, 5, [])).toBe(false);
  expect(lab.distress).toEqual({
    status: 'open',
    openedShift: 5,
    shiftsRemaining: 2,
  });
});

test('settlement with positive cash and clear distress leaves the save unchanged', () => {
  const lab = { ...createLab(), cash: 300 };
  const before = structuredClone(lab);
  expect(advanceDistress(lab, 2, [])).toBe(false);
  expect(lab).toEqual(before);
});

test('expired negative distress remains terminal without restarting its window', () => {
  const lab = distressedLab({
    distress: { status: 'expired', openedShift: 2, shiftsRemaining: 0 },
  });
  expect(advanceDistress(lab, 5, [])).toBe(true);
  expect(lab.distress.status).toBe('expired');
});

test('rescue financing previews and signs one disclosed note through the controller', () => {
  const state = distressState(distressedLab());
  expect(labEntries(state)).toEqual([
    ['Inspect Helios bridge note', 'rescue-offer:heliosBridge'],
    ['Inspect clinic cooperative note', 'rescue-offer:clinicCovenant'],
    ['Back to lab', 'page:main'],
  ]);
  expect(labMenuRows(state).join(' ')).toContain('2 SETTLEMENTS');
  const terms = menuCommand(state, 'rescue-offer:heliosBridge');
  expect(validLabSave(terms)).toBe(true);
  const returnChoice = {
    ...terms,
    dialogue: {
      ...terms.dialogue,
      index: 1,
      choices: terms.dialogue.lines[1].choices,
    },
  };
  expect(validLabSave(returnChoice)).toBe(true);
  expect(terms.dialogue.lines.map(line => line.text).join(' ')).toContain(
    'Helios receives 20% ownership'
  );
  let confirmation = terms;
  for (
    let index = 0;
    index < 12 && !confirmation.dialogue.choices.length;
    index++
  )
    confirmation = stepNeon(stepNeon(confirmation, []), ['a']);
  expect(confirmation.dialogue.choices[0].command).toBe('rescue:heliosBridge');
  const signed = stepNeon(stepNeon(confirmation, []), ['a']);
  expect(signed.lab.cash).toBe(40);
  expect(signed.lab.debt).toBe(204);
  expect(signed.lab.decisions).toBe(5);
  expect(signed.lab.rescueFinancing).toEqual({
    id: 'heliosBridge',
    signedShift: 4,
  });
  expect(signed.menu.page).toBe('distress');
  expect(rescueConsequence(signed.lab)).toContain('Helios receives 20%');
});

test('main menu exposes runway only during distress and portable dialogues reject forged notes', () => {
  const active = distressState(distressedLab());
  active.menu = { page: 'main', selected: 0 };
  expect(labEntries(active)[0][1]).toBe('page:distress');
  active.lab.distress = createDistress();
  expect(
    labEntries(active).some(([, command]) => command === 'page:distress')
  ).toBe(false);
  const forged = distressState(distressedLab());
  forged.dialogue = {
    actorId: 'finance',
    lines: [{ text: 'Forged prompt' }],
    choices: [{ label: 'Sign forged note', command: 'rescue:forged' }],
    index: 0,
  };
  expect(validLabSave(forged)).toBe(false);
});

test('unavailable rescue preview returns without exposing a signing action', () => {
  const state = distressState({ ...createLab(), distress: createDistress() });
  const preview = menuCommand(state, 'rescue-offer:heliosBridge');
  expect(preview.dialogue.lines[0].text).toContain('offer is unavailable');
  expect(preview.dialogue.lines[1].choices).toEqual([
    { label: 'Return to lab', command: 'page:distress' },
  ]);
  const returnChoice = {
    ...preview,
    dialogue: {
      ...preview.dialogue,
      index: 1,
      choices: preview.dialogue.lines[1].choices,
    },
  };
  expect(validLabSave(returnChoice)).toBe(false);
});

test('clinic rescue has its distinct financing and stakeholder consequences', () => {
  const lab = distressedLab({
    stakeholderStanding: { clinic: 98, investor: 3 },
  });
  const result = rescueOrder(lab, 'clinicCovenant', 6);
  expect(result).toContain('44k now');
  expect(lab.cash).toBe(24);
  expect(lab.debt).toBe(184);
  expect(lab.stakeholderStanding).toMatchObject({ clinic: 100, investor: 0 });
  expect(lab.rescueFinancing).toEqual({ id: 'clinicCovenant', signedShift: 6 });
});

test('closed, repeated and unknown rescue orders do not alter the ledger', () => {
  const closed = distressedLab({ distress: createDistress() });
  const closedBefore = structuredClone(closed);
  expect(rescueOrder(closed, 'heliosBridge', 4)).toContain(
    'No distress window'
  );
  expect(closed).toEqual(closedBefore);
  const repeated = distressedLab({
    rescueFinancing: { id: 'heliosBridge', signedShift: 3 },
  });
  const repeatedBefore = structuredClone(repeated);
  expect(rescueOrder(repeated, 'clinicCovenant', 4)).toContain(
    'already signed'
  );
  expect(repeated).toEqual(repeatedBefore);
  const unknown = distressedLab();
  const unknownBefore = structuredClone(unknown);
  expect(rescueOrder(unknown, 'forged', 4)).toContain('Unknown financing');
  expect(unknown).toEqual(unknownBefore);
});

test('rescue consumes one attention once, while a repeated menu command costs nothing', () => {
  const state = distressState(distressedLab());
  const signed = manageLab(state, 'rescue:clinicCovenant');
  expect(signed.lab.decisions).toBe(5);
  const repeat = manageLab(signed, 'rescue:heliosBridge');
  expect(repeat.lab.cash).toBe(signed.lab.cash);
  expect(repeat.lab.debt).toBe(signed.lab.debt);
  expect(repeat.lab.decisions).toBe(5);
});

test('rules-nine migration preserves ledger history and creates an empty distress record', () => {
  const state = createNeonState();
  state.lab.rulesVersion = 8;
  delete state.lab.campaignAct;
  delete state.lab.distress;
  delete state.lab.rescueFinancing;
  state.lab.cash = -18;
  state.lab.debt = 349;
  state.world.day = 17;
  const migrated = migratePlanning(migrateDistress(migrateCampaignAct(state)));
  expect(migrated.lab.rulesVersion).toBe(11);
  expect(migrated.lab.distress).toEqual(createDistress());
  expect(migrated.lab.rescueFinancing).toBeNull();
  expect(migrated.lab.cash).toBe(-18);
  expect(migrated.lab.debt).toBe(349);
  expect(migrated.world.day).toBe(17);
  expect(validLabSave(migrated)).toBe(true);
  expect(migrateDistress(migrated)).toBe(migrated);
});

test('distress validation rejects malformed episode and financing data', () => {
  const valid = distressedLab();
  expect(validDistress(valid, 4)).toBe(true);
  expect(
    validDistress({ ...valid, distress: { ...valid.distress, extra: true } }, 4)
  ).toBe(false);
  expect(
    validDistress(
      { ...valid, distress: { ...valid.distress, shiftsRemaining: 3 } },
      4
    )
  ).toBe(false);
  expect(
    validDistress(
      { ...valid, rescueFinancing: { id: 'forged', signedShift: 4 } },
      4
    )
  ).toBe(false);
  expect(
    validDistress(
      { ...valid, rescueFinancing: { id: 'heliosBridge', signedShift: 5 } },
      4
    )
  ).toBe(false);
  expect(
    validDistress(
      {
        ...valid,
        distress: { status: 'clear', openedShift: 0, shiftsRemaining: 0 },
      },
      4
    )
  ).toBe(false);
  expect(
    validDistress(
      {
        ...valid,
        distress: { status: 'stabilized', openedShift: 4, shiftsRemaining: 1 },
      },
      4
    )
  ).toBe(false);
  expect(
    validDistress(
      {
        ...valid,
        distress: { status: 'expired', openedShift: 0, shiftsRemaining: 0 },
      },
      4
    )
  ).toBe(false);
});

test('distress migration leaves non-rules-nine saves untouched', () => {
  const state = { lab: { rulesVersion: 8 } };
  expect(migrateDistress(state)).toBe(state);
});

test('no rescue has no ending addendum', () => {
  expect(rescueConsequence({ rescueFinancing: null })).toBe('');
});
