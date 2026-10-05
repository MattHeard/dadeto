import {
  createNeonState,
  stepNeon,
  labJournal,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  manageLab,
  endShift,
  forecast,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { forecastShift } from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  createRelationships,
  createCommitmentPolicies,
  relationshipConditions,
  relationshipOrder,
  settleRelationships,
  relationshipBonds,
  relationshipPages,
  validRelationships,
  migrateRelationships,
} from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateContracts } from '../../../../src/core/browser/game/neon-covenant/contracts.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migrateDistress } from '../../../../src/core/browser/game/neon-covenant/distress.js';
import { RELATIONSHIP_CONTENT } from '../../../../src/core/browser/game/neon-covenant/relationshipContent.js';
import { createDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';

/**
 * Create a solvent fixture without changing any commitment or operating proof.
 * @returns {object} Independent campaign ready for rule-level operations.
 */
function campaign() {
  const state = createNeonState();
  state.dialogue = null;
  state.lab.cash = 500;
  return state;
}
/**
 * Submit a fresh controller press after releasing the previous button.
 * @param {object} state Current simulation state.
 * @param {string} button One of the eight supported buttons.
 * @returns {object} State after an ordinary controller transition.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}
/**
 * Reach an authored operation through actual menu navigation and confirmation.
 * @param {object} state Campaign with an open controller menu.
 * @param {string} command Authored operation to select.
 * @returns {object} Campaign after the selected operation.
 */
function choose(state, command) {
  const index = labEntries(state).findIndex(row => row[1] === command);
  expect(index).toBeGreaterThanOrEqual(0);
  while (state.menu.selected !== index) state = press(state, 'down');
  return press(state, 'a');
}

test('acceptance grants no instant reward and actual proof earns protections that permit Helios', () => {
  let state = campaign();
  const before = structuredClone(state);
  state = manageLab(state, 'promise:ada');
  expect(state.lab.morale).toBe(before.lab.morale);
  expect(state.lab.relationships.ada).toMatchObject({
    stage: 'active',
    score: 0,
    fulfillments: 0,
  });
  expect(state.lab.decisions).toBe(5);
  expect(before.lab.promises).toEqual([]);
  expect(manageLab(state, 'promise:ada').lab).toEqual(state.lab);
  state = endShift(state);
  const projected = forecastShift(state);
  const copy = structuredClone(state);
  state = endShift(state);
  expect(copy.lab.relationships.ada.fulfillments).toBe(0);
  expect(state.lab.cash).toBe(projected.closingCash);
  expect(state.lab.relationships.ada).toMatchObject({
    stage: 'fulfilled',
    score: 8,
    fulfillments: 1,
  });
  state = manageLab(state, 'arc:protect:ada');
  expect(state.lab.cash).toBe(projected.closingCash - 8);
  state = manageLab(state, 'contract:helios');
  expect(relationshipConditions(state.lab, forecast(state.lab)).ada).toBe(
    'good'
  );
  expect(state.lab.cash).toBe(projected.closingCash - 8 + 70);
  state = endShift(state);
  expect(state.lab.relationships.ada.breaches).toBe(0);
});

test('human-approval breaches warn, charge once and retain disagreement and repair history', () => {
  let state = endShift(endShift(manageLab(campaign(), 'promise:ada')));
  state = manageLab(manageLab(state, 'arc:protect:ada'), 'contract:helios');
  state = endShift(state);
  state = manageLab(state, 'focus:ghost');
  state = manageLab(state, 'configure:oversight:autonomous');
  state = endShift(state);
  expect(state.lab.relationships.ada.stage).toBe('warning');
  expect(state.lab.relationships.ada.score).toBe(8);
  state = endShift(state);
  expect(state.lab.relationships.ada).toMatchObject({
    stage: 'breached',
    breaches: 1,
    score: -4,
  });
  const rejected = manageLab(state, 'arc:repair:ada');
  expect(rejected.lab).toEqual(state.lab);
  expect(rejected.world).toEqual(state.world);
  state = endShift(state);
  expect(state.lab.relationships.ada.score).toBe(-4);
  state = manageLab(state, 'configure:oversight:assisted');
  state = manageLab(state, 'arc:repair:ada');
  expect(state.lab.relationships.ada.stage).toBe('repairing');
  state = endShift(endShift(state));
  expect(state.lab.relationships.ada).toMatchObject({
    stage: 'repaired',
    score: 2,
    breaches: 1,
    repairs: 1,
    fulfillments: 1,
  });
  state = manageLab(state, 'arc:disagree:ada');
  expect(state.lab.relationships.ada.disagreements).toBe(1);
  expect(state.lab.relationships.ada.breaches).toBe(1);
  expect(manageLab(state, 'arc:disagree:ada').lab).toEqual(state.lab);
  expect(
    relationshipPages(state.lab, 'ada', forecast(state.lab))[0].text
  ).toContain('scar');
  expect(
    labJournal(state).find(row => row.title === 'Ada / repaired').status
  ).toContain('breaches 1');
  expect(validLabSave(state)).toBe(true);
  state = endShift(state);
  expect(state.lab.relationships.ada.stage).toBe('repaired');
  expect(state.lab.relationships.ada.repairs).toBe(1);
});

test('Ion requires actual safe work, Sable requires a published register, and pending Mae is not a breach', () => {
  let state = campaign();
  for (const id of ['ion', 'sable', 'mae'])
    state = manageLab(state, `promise:${id}`);
  state = endShift(state);
  expect(state.lab.relationships.ion.stage).toBe('warning');
  expect(state.lab.relationships.sable.stage).toBe('warning');
  expect(state.lab.relationships.mae).toMatchObject({
    stage: 'active',
    streak: 0,
    breaches: 0,
  });
  state = manageLab(state, 'cooling');
  state = manageLab(state, 'audit');
  state = endShift(endShift(state));
  expect(state.lab.relationships.ion.stage).toBe('fulfilled');
  expect(state.lab.relationships.sable.stage).toBe('fulfilled');
  expect(state.lab.relationships.mae.stage).toBe('active');
  const lab = structuredClone(state.lab);
  lab.teams.research = 0;
  expect(relationshipConditions(lab, forecast(lab)).ion).toBe('pending');
  lab.teams.safety = 0;
  expect(relationshipConditions(lab, forecast(lab)).sable).toBe('bad');
});

test('Mae reviews relevant terms only; unsigned or unsafe reviews and repeated orders spend nothing', () => {
  let state = campaign();
  state = manageLab(state, 'arc:consult:atlas');
  const review = structuredClone(
    state.lab.commitmentPolicies.consultations.atlas
  );
  expect(manageLab(state, 'arc:consult:atlas').lab).toEqual(state.lab);
  state.lab.programs.atlas.settings.hosting = 'district';
  expect(manageLab(state, 'arc:consult:atlas').lab).toEqual(state.lab);
  expect(state.lab.commitmentPolicies.consultations.atlas).toEqual(review);
  for (const command of [
    'arc:consult:ghost',
    'arc:repair:mae',
    'arc:fake:ada',
    'arc:disagree:unknown',
    'arc:bad',
    'promise:unknown',
  ])
    expect(manageLab(state, command).lab).toEqual(state.lab);
  const unsafe = structuredClone(state);
  unsafe.lab.data = 'scraped';
  expect(manageLab(unsafe, 'arc:consult:lumen').lab).toEqual(unsafe.lab);
  unsafe.lab.data = 'licensed';
  unsafe.lab.programs.lumen.settings.oversight = 'autonomous';
  expect(manageLab(unsafe, 'arc:consult:lumen').lab).toEqual(unsafe.lab);
  expect(manageLab(campaign(), 'arc:protect:ada').lab).toEqual(campaign().lab);
});

test.each(Object.keys(RELATIONSHIP_CONTENT))(
  'controller %s arc inspection is free, paginated and exposes only actual accounted actions',
  id => {
    let state = press(campaign(), 'x');
    state = choose(state, 'page:relationships');
    state = choose(state, `page:relationship:${id}`);
    const lab = structuredClone(state.lab);
    const day = state.world.day;
    const rows = labMenuRows(state);
    expect(rows).toHaveLength(7);
    state = choose(state, `arc-story:${id}`);
    for (const line of state.dialogue.lines)
      expect(line.text.length).toBeGreaterThan(0);
    while (state.dialogue) state = press(state, 'a');
    expect(state.lab).toEqual(lab);
    expect(state.world.day).toBe(day);
    state = choose(
      choose(
        choose(press(state, 'x'), 'page:relationships'),
        `page:relationship:${id}`
      ),
      `arc:disagree:${id}`
    );
    expect(state.menu.page).toBe(`relationship:${id}`);
    expect(state.lab.decisions).toBe(5);
    expect(state.lab.relationships[id].stage).toBe('none');
    expect(relationshipPages(state.lab, id, forecast(state.lab))[0].text).toBe(
      RELATIONSHIP_CONTENT[id].scenes.disagreement
    );
    expect(validLabSave(state)).toBe(true);
  }
);

test.each([
  {},
  { cash: 4, debt: 220, incidents: 7 },
  { outcome: 'independent', cash: 260 },
])(
  'rules5 migration preserves history and money without inventing proof: %p',
  changes => {
    const old = campaign();
    old.world.day = 13;
    old.world.relationships.ada = 17;
    Object.assign(old.lab, changes, {
      rulesVersion: 5,
      promises: ['ada', 'mae'],
    });
    delete old.lab.relationships;
    delete old.lab.commitmentPolicies;
    const original = structuredClone(old);
    const relationshipUpgrade = migrateRelationships(old);
    expect(old).toEqual(original);
    expect(relationshipUpgrade.lab).toMatchObject({
      ...old.lab,
      rulesVersion: 6,
    });
    const upgraded = migrateDistress(
      migrateCampaignAct(
        migrateContracts(migrateInfrastructure(relationshipUpgrade))
      )
    );
    expect(upgraded.lab.rulesVersion).toBe(10);
    expect(upgraded.lab.relationships.ada).toMatchObject({
      stage: 'active',
      score: 17,
      breaches: 0,
      fulfillments: 0,
      events: [],
    });
    expect(upgraded.lab.relationships.mae.stage).toBe('active');
    expect(validLabSave(upgraded)).toBe(true);
    expect(migrateInfrastructure(upgraded)).toBe(upgraded);
    const runtime = createNeonRuntime();
    runtime.importSave(
      JSON.stringify({ game: 'neon-covenant', version: 2, state: old })
    );
    expect(runtime.getSnapshot().lab).toEqual(upgraded.lab);
    const exported = runtime.exportSave();
    runtime.importSave(exported);
    expect(runtime.exportSave()).toBe(exported);
  }
);

test('malformed personal memories and forged consultation leave active campaign unchanged', () => {
  const runtime = createNeonRuntime();
  const exported = runtime.exportSave();
  for (const mutate of [
    lab => {
      lab.relationships.ada.stage = 'repaired';
    },
    lab => {
      lab.relationships.ada.events = [{ type: 'breached', day: 100 }];
    },
    lab => {
      lab.relationships.ada.score = NaN;
    },
    lab => {
      lab.promises = ['ada', 'ada'];
    },
    lab => {
      lab.commitmentPolicies.consultations.atlas = {
        data: 'scraped',
        oversight: 'supervised',
        specialization: 'general',
      };
    },
  ]) {
    const state = campaign();
    mutate(state.lab);
    expect(validRelationships(state.lab, 1)).toBe(false);
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state })
      )
    ).toThrow();
    expect(runtime.exportSave()).toBe(exported);
  }
  const lab = campaign().lab;
  lab.employees[0].relationship = 7;
  expect(createRelationships(lab).ada.score).toBe(7);
  expect(createCommitmentPolicies()).toEqual(lab.commitmentPolicies);
  expect(relationshipBonds(lab).ada).toBe(0);
  const report = [];
  settleRelationships(lab, forecast(lab), 1, report);
  expect(report).toEqual([]);
  expect(relationshipOrder(lab, 'invalid', 1, forecast(lab))).toContain(
    'authored'
  );
});

test('reviewed public releases must really deliver; relevant changes invalidate consent but unrelated hosting does not', () => {
  let state = campaign();
  state.lab.compute = 32;
  state.lab.cooling = 32;
  state = manageLab(
    manageLab(state, 'assign:ada:service'),
    'assign:jun:service'
  );
  state = manageLab(state, 'promise:mae');
  state.lab.deployed = ['atlas', 'lumen'];
  state.lab.deployments = createDeployments(state.lab);
  expect(relationshipConditions(state.lab, forecast(state.lab)).mae).toBe(
    'bad'
  );
  state = manageLab(manageLab(state, 'arc:consult:atlas'), 'arc:consult:lumen');
  expect(relationshipConditions(state.lab, forecast(state.lab)).mae).toBe(
    'good'
  );
  state = endShift(endShift(state));
  expect(state.lab.relationships.mae.stage).toBe('fulfilled');
  state.lab.programs.atlas.settings.hosting = 'edge';
  expect(relationshipConditions(state.lab, forecast(state.lab)).mae).toBe(
    'good'
  );
  state.lab.programs.atlas.settings.oversight = 'human';
  expect(relationshipConditions(state.lab, forecast(state.lab)).mae).toBe(
    'bad'
  );
  state = manageLab(state, 'arc:consult:atlas');
  expect(relationshipConditions(state.lab, forecast(state.lab)).mae).toBe(
    'good'
  );
  state.lab.commitmentPolicies.register = true;
  expect(relationshipConditions(state.lab, forecast(state.lab)).sable).toBe(
    'bad'
  );
  state.lab.deployments.atlas.maintenance = 50;
  expect(relationshipConditions(state.lab, forecast(state.lab)).ion).toBe(
    'bad'
  );
});

test('repair pauses without charging a second breach and insolvent negotiations do not mutate the ledger', () => {
  let state = manageLab(campaign(), 'promise:ada');
  state.lab.data = 'scraped';
  state = endShift(endShift(state));
  state.lab.data = 'licensed';
  const poor = structuredClone(state);
  poor.lab.cash = 0;
  expect(manageLab(poor, 'arc:repair:ada').lab).toEqual(poor.lab);
  state = manageLab(state, 'arc:repair:ada');
  state.lab.data = 'scraped';
  const paused = endShift(state);
  expect(paused.lab.relationships.ada.breaches).toBe(1);
  expect(paused.lab.relationships.ada.events.at(-1).type).toBe('repair-paused');
  expect(paused.lab.report.join(' ')).toContain('no second breach penalty');
  const corrected = structuredClone(paused);
  corrected.lab.data = 'licensed';
  expect(endShift(corrected).lab.relationships.ada.stage).toBe('breached');
  const negotiated = manageLab(
    endShift(endShift(manageLab(campaign(), 'promise:ada'))),
    'arc:protect:ada'
  );
  expect(manageLab(negotiated, 'arc:protect:ada').lab).toEqual(negotiated.lab);
  negotiated.lab.commitmentPolicies.attribution = false;
  negotiated.lab.cash = 0;
  expect(manageLab(negotiated, 'arc:protect:ada').lab).toEqual(negotiated.lab);
});

test('a warning cannot become a charged breach twice within the same settlement and imported review choices remain authored', () => {
  const state = manageLab(campaign(), 'promise:ada');
  state.lab.data = 'scraped';
  settleRelationships(state.lab, forecast(state.lab), 1, []);
  settleRelationships(state.lab, forecast(state.lab), 1, []);
  expect(state.lab.relationships.ada.stage).toBe('warning');
  expect(state.lab.relationships.ada.breaches).toBe(0);
  for (const terms of [
    { data: 'licensed', oversight: 'autonomous', specialization: 'general' },
    { data: 'licensed', oversight: 'fake', specialization: 'general' },
    { data: 'licensed', oversight: 'assisted', specialization: 'fake' },
    { data: 'licensed', oversight: 'assisted', specialization: 'triage' },
  ]) {
    const lab = campaign().lab;
    lab.commitmentPolicies.consultations.atlas = terms;
    const expected = terms.specialization === 'triage';
    expect(validRelationships(lab, 1)).toBe(expected);
  }
  const old = campaign();
  old.lab.rulesVersion = 5;
  old.lab.promises = ['unknown'];
  expect(migrateRelationships(old)).toBe(old);
});

test('a community consultation through controller menus returns to Mae without granting release or fulfillment', () => {
  let state = choose(
    choose(press(campaign(), 'x'), 'page:relationships'),
    'page:relationship:mae'
  );
  state = choose(state, 'arc:consult:atlas');
  expect(state.menu.page).toBe('relationship:mae');
  expect(state.lab.decisions).toBe(5);
  expect(state.lab.deployed).toEqual([]);
  expect(state.lab.relationships.mae.fulfillments).toBe(0);
  expect(validLabSave(state)).toBe(true);
});
