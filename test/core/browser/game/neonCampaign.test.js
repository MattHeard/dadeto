import {
  actForShift,
  advanceCampaignAct,
  availableChapterScenes,
  chapterSceneLabel,
  createCampaignAct,
  migrateCampaignAct,
  validCampaignAct,
} from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import {
  createLab,
  endShift,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonState,
  menuCommand,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import { migrateDistress } from '../../../../src/core/browser/game/neon-covenant/distress.js';
import { migratePlanning } from '../../../../src/core/browser/game/neon-covenant/planning.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { LAB_CONTENT } from '../../../../src/core/browser/game/neon-covenant/content.js';

/**
 * Open the campaign board on a fresh world with a chosen calendar shift.
 * @param {number} day Campaign shift.
 * @returns {Record<string, any>} Controller state.
 */
function campaignPage(day = 1) {
  const state = createNeonState();
  return {
    ...state,
    dialogue: null,
    world: { ...state.world, day },
    menu: { page: 'campaign', selected: 0 },
  };
}

test('four authored acts cover every campaign boundary and clamp epilogue dates', () => {
  expect(
    [1, 6, 7, 13, 14, 21, 22, 28, 29].map(day => actForShift(day).id)
  ).toEqual([
    'survival',
    'survival',
    'launch',
    'launch',
    'expansion',
    'expansion',
    'ownership',
    'ownership',
    'ownership',
  ]);
  expect(createCampaignAct(21)).toEqual({ id: 'expansion', enteredShift: 14 });
  expect(actForShift(0).id).toBe('survival');
  const authoredActs = LAB_CONTENT.acts;
  LAB_CONTENT.acts = [];
  expect(actForShift(1)).toBeUndefined();
  LAB_CONTENT.acts = authoredActs;
});

test('calendar boundary transitions are deterministic and do not repeat within an act', () => {
  const lab = { ...createLab() };
  expect(advanceCampaignAct(lab, 6)).toEqual({
    campaignAct: { id: 'survival', enteredShift: 1 },
    act: actForShift(6),
    changed: false,
  });
  expect(advanceCampaignAct(lab, 7)).toEqual({
    campaignAct: { id: 'launch', enteredShift: 7 },
    act: actForShift(7),
    changed: true,
  });
});

test('chapter discoveries unlock only from earned prototypes, deployment and public delivery', () => {
  const lab = createLab();
  expect(availableChapterScenes(lab, 1)).toEqual([]);
  lab.programs.atlas.milestones.push('prototype');
  expect(availableChapterScenes(lab, 1)).toEqual(['prototype']);
  lab.deployed.push('atlas');
  expect(availableChapterScenes(lab, 14)).toEqual(['prototype', 'users']);
  lab.fulfilled.push('clinic');
  expect(availableChapterScenes(lab, 14)).toEqual([
    'prototype',
    'users',
    'sharedRecord',
  ]);
  expect(availableChapterScenes(lab, 13)).toEqual(['prototype', 'users']);
  expect(chapterSceneLabel('prototype')).toBe('Ada / first prototype');
  expect(chapterSceneLabel('unknown')).toBe('Unknown chapter scene');
});

test('campaign controller paginates current pressure and milestone-unlocked story', () => {
  const state = campaignPage(7);
  expect(labEntries(state)).toEqual([
    ['Current act briefing', 'campaign-story:act'],
    ['Back to lab', 'page:main'],
  ]);
  expect(labMenuRows(state)).toEqual(
    expect.arrayContaining([
      'ACT / FIRST PUBLIC USE',
      'SHIFT 7 / 7-13',
      expect.stringContaining('A trained model is not a service'),
    ])
  );
  state.lab.programs.atlas.milestones.push('prototype');
  expect(labEntries(state)).toContainEqual([
    'Ada / first prototype',
    'campaign-story:prototype',
  ]);
});

test('act briefings and only earned archive scenes open through modal ownership', () => {
  let state = campaignPage(14);
  state = stepNeon(state, ['a']);
  expect(state.dialogue.actorId).toBe('campaign');
  expect(state.dialogue.lines[0].text).toContain('New partners arrive');
  state = { ...state, dialogue: null, menu: { page: 'campaign', selected: 1 } };
  expect(menuCommand(state, 'campaign-story:prototype')).toBe(state);
  state = campaignPage(14);
  state.lab.programs.atlas.milestones.push('prototype');
  state.lab.deployed.push('atlas');
  state.lab.fulfilled.push('clinic');
  state.menu.selected = 1;
  state = stepNeon(state, ['a']);
  expect(state.dialogue.lines[0].text).toContain('Ada pins the first useful');
  state = {
    ...state,
    dialogue: null,
    menu: { page: 'campaign', selected: 3 },
    lastActions: [],
  };
  expect(stepNeon(state, ['a']).dialogue.lines[0].text).toContain(
    'ownership register open'
  );
});

test('settlement records the next act in the saved ledger and its report', () => {
  const state = createNeonState();
  const atBoundary = {
    ...state,
    dialogue: null,
    world: { ...state.world, day: 6 },
  };
  const settled = endShift(atBoundary);
  expect(settled.lab.campaignAct).toEqual({ id: 'launch', enteredShift: 7 });
  expect(settled.lab.report.at(-1)).toContain('ACT FIRST PUBLIC USE');
  expect(settled.world.day).toBe(7);
});

test('rules-eight migration derives the current act without rewriting the ledger', () => {
  const source = createNeonState();
  source.lab.rulesVersion = 8;
  delete source.lab.campaignAct;
  source.lab.cash = 7;
  source.lab.debt = 311;
  source.world.day = 21;
  const campaign = migrateCampaignAct(source);
  expect(campaign.lab.rulesVersion).toBe(9);
  expect(campaign.lab.campaignAct).toEqual({
    id: 'expansion',
    enteredShift: 14,
  });
  expect(campaign.lab.cash).toBe(7);
  expect(campaign.lab.debt).toBe(311);
  expect(campaign.world.day).toBe(21);
  const migrated = migratePlanning(migrateDistress(campaign));
  expect(migrated.lab.rulesVersion).toBe(11);
  expect(validLabSave(migrated)).toBe(true);
  expect(migrateDistress(migrated)).toBe(migrated);
});

test('invalid campaign markers and migration dates fail closed', () => {
  const current = createNeonState();
  expect(validCampaignAct(current.lab, 1)).toBe(true);
  expect(
    validCampaignAct(
      { ...current.lab, campaignAct: { id: 'launch', enteredShift: 7 } },
      1
    )
  ).toBe(false);
  expect(
    validCampaignAct(
      {
        ...current.lab,
        campaignAct: { ...current.lab.campaignAct, extra: true },
      },
      1
    )
  ).toBe(false);
  const corrupt = structuredClone(current);
  corrupt.lab.campaignAct.id = 'launch';
  expect(validLabSave(corrupt)).toBe(false);
  for (const day of [0, 30, 1.5]) {
    const invalid = {
      ...current,
      world: { ...current.world, day },
      lab: { ...current.lab, rulesVersion: 8 },
    };
    expect(migrateCampaignAct(invalid)).toBe(invalid);
  }
  expect(
    migrateCampaignAct({ lab: { rulesVersion: 7 } }).lab.rulesVersion
  ).toBe(7);
});

test('saving and restoring keeps the act marker and unlocks the same chapters', () => {
  const runtime = createNeonRuntime({ env: new Map() });
  runtime.start();
  const before = runtime.getSnapshot();
  before.dialogue = null;
  before.lab.campaignAct = { id: 'launch', enteredShift: 7 };
  before.world.day = 8;
  before.lab.research.atlas = 6;
  before.lab.programs.atlas.milestones = ['prototype'];
  expect(validLabSave(before)).toBe(true);
  const imported = JSON.parse(runtime.exportSave());
  imported.state = before;
  runtime.importSave(JSON.stringify(imported));
  const after = runtime.getSnapshot();
  expect(after.lab.campaignAct).toEqual({ id: 'launch', enteredShift: 7 });
  after.menu = { page: 'campaign', selected: 0 };
  expect(labEntries(after)).toContainEqual([
    'Ada / first prototype',
    'campaign-story:prototype',
  ]);
});
