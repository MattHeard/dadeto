import {
  availableContractPackages,
  contractOversightSatisfied,
  contractTerms,
  createContractLedger,
  migrateContracts,
  negotiateContract,
  settleStakeholders,
  validContractLedger,
} from '../../../../src/core/browser/game/neon-covenant/contracts.js';
import {
  createLab,
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import { createPrograms } from '../../../../src/core/browser/game/neon-covenant/research.js';
import { forecastShift } from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migrateDistress } from '../../../../src/core/browser/game/neon-covenant/distress.js';
import { migratePlanning } from '../../../../src/core/browser/game/neon-covenant/planning.js';

/**
 * Make a convenient isolated lab campaign.
 * @param {Record<string, any>} [overrides] Ledger fields to override.
 * @returns {Record<string, any>} Campaign with a test controller open.
 */
function stateWith(overrides = {}) {
  const state = createNeonState();
  return {
    ...state,
    dialogue: null,
    menu: { page: 'contracts', selected: 0 },
    lab: { ...state.lab, ...overrides },
  };
}

/**
 * Deliver a fresh released button to the simulation.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string} action Button name.
 * @returns {Record<string, any>} Transitioned campaign state.
 */
function press(state, action) {
  return stepNeon(stepNeon(state, []), [action]);
}

/**
 * Select an authored operation through directional input.
 * @param {Record<string, any>} state Current controller state.
 * @param {string} command Visible row operation.
 * @returns {Record<string, any>} State after the A confirmation.
 */
function choose(state, command) {
  const index = labEntries(state).findIndex(([, value]) => value === command);
  expect(index).toBeGreaterThanOrEqual(0);
  let next = state;
  while (next.menu.selected !== index) next = press(next, 'down');
  return press(next, 'a');
}

test('authored offers disclose finance, exclusivity, protection, oversight and affected parties', () => {
  let state = manageLab(stateWith(), 'promise:mae');
  state = choose(state, 'page:contract:clinic');
  expect(labMenuRows(state)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('PROJECT ATLAS'),
      expect.stringContaining('SELECT TERMS'),
    ])
  );
  state = choose(state, 'contract-offer:clinic:community');
  state = press(state, 'a');
  expect(state.dialogue.lines[1].text).toContain(
    'Attribution is contractually protected'
  );
  expect(state.dialogue.lines[1].text).toContain('Night Clinic +8 at signing');
  expect(state.dialogue.choices.map(choice => choice.label)).toEqual([
    'Sign these terms',
    'Return to offers',
  ]);
});

test('stakeholder controller lists expose each authored constituency and its standing', () => {
  const state = stateWith();
  state.menu = { page: 'stakeholders', selected: 0 };
  expect(labEntries(state)).toEqual([
    ['Workforce / 52', 'page:stakeholder:workforce'],
    ['Night Clinic / 50', 'page:stakeholder:clinic'],
    ['Transit Union / 48', 'page:stakeholder:transit'],
    ['Regulator / 50', 'page:stakeholder:regulator'],
    ['Investor / 45', 'page:stakeholder:investor'],
    ['Back to lab', 'page:main'],
  ]);
  expect(labMenuRows(state)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('WHO THE LAB AFFECTS'),
      expect.stringContaining('WF 52 CL 50 TU 48'),
    ])
  );
  state.menu.page = 'stakeholder:unknown';
  expect(validLabSave(state)).toBe(false);
});

test('forged contract and stakeholder dialogue commands fail closed', () => {
  const hiddenOffer = stateWith();
  hiddenOffer.dialogue = {
    actorId: 'contract',
    lines: [],
    index: 0,
    choices: [{ label: 'Sign', command: 'contract-offer:clinic:community' }],
  };
  hiddenOffer.menu = null;
  const rejectedOffer = press(hiddenOffer, 'a');
  expect(rejectedOffer.dialogue).toBeNull();
  expect(rejectedOffer.menu).toEqual({ page: 'contract:clinic', selected: 0 });
  expect(rejectedOffer.lab.cash).toBe(hiddenOffer.lab.cash);
  expect(rejectedOffer.lab.decisions).toBe(hiddenOffer.lab.decisions);

  const unknownOffer = stateWith();
  unknownOffer.dialogue = {
    actorId: 'contract',
    lines: [],
    index: 0,
    choices: [{ label: 'Sign', command: 'contract-offer:clinic:invented' }],
  };
  expect(press(unknownOffer, 'a').menu).toEqual({
    page: 'contract:clinic',
    selected: 0,
  });

  const duplicateOffer = stateWith();
  duplicateOffer.lab.contracts.push('clinic');
  duplicateOffer.lab.contractTerms.clinic = 'balanced';
  duplicateOffer.dialogue = {
    actorId: 'contract',
    lines: [],
    index: 0,
    choices: [{ label: 'Sign', command: 'contract-offer:clinic:balanced' }],
  };
  expect(press(duplicateOffer, 'a').menu).toEqual({
    page: 'contract:clinic',
    selected: 0,
  });

  const unknownStory = stateWith();
  unknownStory.dialogue = {
    actorId: 'contract',
    lines: [],
    index: 0,
    choices: [{ label: 'Listen', command: 'stakeholder-story:unknown' }],
  };
  unknownStory.menu = null;
  expect(press(unknownStory, 'a').dialogue).toBeNull();
});

test('exclusive priority offer discloses that competing contracts must wait', () => {
  let state = stateWith({
    stakeholderStanding: {
      ...createContractLedger().stakeholderStanding,
      investor: 60,
    },
  });
  state.menu.page = 'contract:clinic';
  state = choose(state, 'contract-offer:clinic:priority');
  expect(state.dialogue.actorId).toBe('contract');
  expect(state.dialogue.lines[0].text).toContain('Exclusive: no other deal');
});

test('accepted package uses disclosed terms and changes only named standings', () => {
  const before = createLab();
  const proposal = manageLab(stateWith(), 'promise:mae');
  const result = manageLab(proposal, 'contract:clinic:community');
  expect(result.lab.contractTerms.clinic).toBe('community');
  expect(result.lab.cash).toBe(before.cash + 20);
  expect(result.lab.commitmentPolicies.attribution).toBe(true);
  expect(result.lab.stakeholderStanding).toEqual({
    ...before.stakeholderStanding,
    workforce: 55,
    clinic: 58,
    regulator: 54,
    investor: 42,
  });
  expect(result.lab.decisions).toBe(4);
});

test('exclusive terms block another live deal and rejected orders preserve the complete ledger', () => {
  const state = stateWith({
    stakeholderStanding: {
      ...createContractLedger().stakeholderStanding,
      investor: 60,
    },
  });
  const signed = manageLab(state, 'contract:clinic:priority');
  const snapshot = structuredClone(signed.lab);
  const rejected = manageLab(signed, 'contract:transit:balanced');
  expect(rejected.lab).toEqual(snapshot);
  expect(rejected.toast).toContain('exclusive agreement');
  expect(signed.lab.decisions).toBe(5);
});

test('relationship or delivery history unlocks priority terms, never a forged package', () => {
  const lab = createLab();
  expect(availableContractPackages(lab, 'unknown')).toEqual([]);
  lab.stakeholderStanding.investor = 0;
  expect(availableContractPackages(lab, 'clinic')).not.toContain('priority');
  expect(availableContractPackages(lab, 'clinic')).toEqual(['balanced']);
  expect(negotiateContract(lab, 'clinic', 'priority')).toContain('leverage');
  lab.promises.push('mae');
  expect(availableContractPackages(lab, 'clinic')).toContain('community');
  lab.stakeholderStanding.investor = 55;
  expect(availableContractPackages(lab, 'clinic')).toContain('priority');
  const before = structuredClone(lab);
  expect(negotiateContract(lab, 'clinic', 'invented')).toContain(
    'Unknown offer'
  );
  expect(lab).toEqual(before);
});

test('forecasted settlement charges signed service obligations and enforces delivery clauses', () => {
  const base = stateWith();
  const protectedDeal = manageLab(
    manageLab(base, 'promise:mae'),
    'contract:clinic:community'
  );
  const preview = endShift(protectedDeal);
  expect(preview.lab.cash).toBe(
    endShift({
      ...protectedDeal,
      lab: { ...protectedDeal.lab, contracts: [] },
    }).lab.cash - 1
  );
  expect(preview.lab.stakeholderStanding.workforce).toBeGreaterThanOrEqual(0);
  expect(preview.lab.stakeholderStanding.workforce).toBeLessThanOrEqual(100);
  const oversightMismatch = {
    ...protectedDeal,
    lab: {
      ...protectedDeal.lab,
      research: { ...protectedDeal.lab.research, atlas: 38 },
      deployed: ['atlas'],
      evaluated: { ...protectedDeal.lab.evaluated, atlas: 38 },
    },
  };
  expect(endShift(oversightMismatch).lab.fulfilled).not.toContain('clinic');
  const deadline = {
    ...protectedDeal,
    world: { ...protectedDeal.world, day: 15 },
  };
  const settled = endShift(deadline);
  expect(settled.lab.expired).toContain('clinic');
  expect(forecastShift(deadline).closingCash).toBe(settled.lab.cash);
});

test('actual menus negotiate by A, return to the contract page, and persist a save', () => {
  let state = manageLab(stateWith(), 'promise:mae');
  state = choose(state, 'page:contract:clinic');
  state = choose(state, 'contract-offer:clinic:balanced');
  state = press(state, 'a');
  expect(state.dialogue.actorId).toBe('contract');
  expect(validLabSave(state)).toBe(true);
  const confirmation = createNeonRuntime();
  confirmation.importSave(
    JSON.stringify({ game: 'neon-covenant', version: 2, state })
  );
  state = confirmation.getSnapshot();
  state = press(state, 'a');
  expect(state.lab.contractTerms.clinic).toBe('balanced');
  expect(state.menu.page).toBe('contract:clinic');
  expect(state.menu.selected).toBe(0);
  expect(labEntries(state)).toEqual([['All agreements', 'page:contracts']]);
  expect(validLabSave(state)).toBe(true);
  const runtime = createNeonRuntime();
  runtime.importSave(
    JSON.stringify({ game: 'neon-covenant', version: 2, state })
  );
  const exported = runtime.exportSave();
  runtime.importSave(exported);
  expect(runtime.exportSave()).toBe(exported);
  const broken = JSON.parse(exported);
  broken.state.lab.contractTerms.clinic = 'forged';
  expect(() => runtime.importSave(JSON.stringify(broken))).toThrow();
  expect(runtime.exportSave()).toBe(exported);
});

test('rules-seven migration preserves historic finances and outcomes without replay', () => {
  const state = createNeonState();
  Object.assign(state.lab, {
    rulesVersion: 7,
    cash: 77,
    debt: 91,
    contracts: ['clinic'],
    fulfilled: ['clinic'],
    expired: [],
  });
  delete state.lab.contractTerms;
  delete state.lab.stakeholderStanding;
  const original = structuredClone(state);
  const migrated = migrateContracts(state);
  expect(state).toEqual(original);
  expect(migrated.lab).toMatchObject({
    rulesVersion: 8,
    cash: 77,
    debt: 91,
    contracts: ['clinic'],
    fulfilled: ['clinic'],
    contractTerms: { clinic: 'balanced' },
  });
  expect(validContractLedger(migrated.lab)).toBe(true);
  expect(
    validLabSave(migratePlanning(migrateDistress(migrateCampaignAct(migrated))))
  ).toBe(true);
  expect(migrateContracts(migrated)).toBe(migrated);
  expect(migrateContracts({ lab: { rulesVersion: 6 } })).toEqual({
    lab: { rulesVersion: 6 },
  });
});

test('stakeholder standings respond deterministically and reject corrupt saved packages', () => {
  const lab = createLab();
  const original = structuredClone(lab.stakeholderStanding);
  settleStakeholders(lab, 10);
  expect(lab.stakeholderStanding.workforce).toBe(original.workforce + 1 - 2);
  const saved = stateWith();
  saved.lab.stakeholderStanding.regulator = 101;
  expect(validLabSave(saved)).toBe(false);
  const unknownPackage = stateWith();
  unknownPackage.lab.contracts = ['clinic'];
  unknownPackage.lab.contractTerms = { clinic: 'invented' };
  expect(validLabSave(unknownPackage)).toBe(false);
  expect(contractTerms(createLab(), 'clinic').advance).toBe(28);
  let state = stateWith({
    stakeholderStanding: {
      workforce: 100,
      clinic: 100,
      transit: 100,
      regulator: 100,
      investor: 100,
    },
  });
  state = stepNeon(state, []);
  expect(state.presentation.status).toContain('WF100');
  expect(state.presentation.status.length).toBeLessThanOrEqual(30);
  state.menu.page = 'stakeholder:clinic';
  const unchanged = structuredClone(state.lab);
  state = choose(state, 'stakeholder-story:clinic');
  expect(state.dialogue.lines[0].text).toContain(
    'licensed, human-reviewed care'
  );
  expect(state.lab).toEqual(unchanged);
  expect(state.world.day).toBe(1);
});

test('default, duplicate, exclusive and competing agreement orders have exact ledger semantics', () => {
  const defaultTerms = createLab();
  expect(negotiateContract(defaultTerms, 'clinic')).toContain(
    'Balanced service'
  );
  expect(defaultTerms.contractTerms.clinic).toBe('balanced');
  const existing = structuredClone(defaultTerms);
  expect(negotiateContract(existing, 'clinic')).toContain('already signed');
  expect(existing.cash).toBe(defaultTerms.cash);

  const exclusive = createLab();
  exclusive.stakeholderStanding.investor = 60;
  negotiateContract(exclusive, 'clinic', 'priority');
  expect(negotiateContract(exclusive, 'transit')).toContain(
    'exclusive agreement'
  );

  const competing = createLab();
  negotiateContract(competing, 'clinic');
  competing.stakeholderStanding.investor = 60;
  expect(negotiateContract(competing, 'transit', 'priority')).toContain(
    'exclusive agreement'
  );
});

test('oversight clauses accept only their disclosed authored setting', () => {
  const lab = createLab();
  lab.contracts = ['helios'];
  lab.contractTerms = { helios: 'balanced' };
  expect(contractOversightSatisfied(lab, 'helios')).toBe(true);
  lab.contractTerms.helios = 'community';
  expect(contractOversightSatisfied(lab, 'helios')).toBe(true);
  lab.programs.ghost.settings.oversight = 'autonomous';
  expect(contractOversightSatisfied(lab, 'helios')).toBe(false);
  lab.contractTerms.helios = 'priority';
  expect(contractOversightSatisfied(lab, 'helios')).toBe(true);
  lab.programs.ghost.settings.oversight = 'assisted';
  expect(contractOversightSatisfied(lab, 'helios')).toBe(false);
});

test('settlement standings reflect actual service, current evidence, incidents and runway', () => {
  const game = createNeonState();
  game.lab.cash = 900;
  game.lab.research.atlas = 38;
  game.lab.programs = createPrograms(game.lab);
  let evaluated = game;
  for (const id of ['reliability', 'rights', 'oversight'])
    evaluated = manageLab(evaluated, `test:probe:${id}`);
  const lab = evaluated.lab;
  const operations = {
    projects: [
      { id: 'atlas', adoption: 20, reliability: 70 },
      { id: 'lumen', adoption: 20, reliability: 69 },
    ],
  };
  lab.fulfilled = ['clinic', 'transit'];
  lab.deployed = ['atlas'];
  lab.research = { atlas: 38, ghost: 0, lumen: 48 };
  lab.programs = createPrograms(lab);
  lab.risk = 20;
  lab.commitmentPolicies.register = true;
  lab.cash = 300;
  lab.debt = 100;
  settleStakeholders(lab, 0, operations);
  expect(lab.stakeholderStanding.clinic).toBe(51);
  expect(lab.stakeholderStanding.transit).toBe(46);
  expect(lab.stakeholderStanding.regulator).toBe(51);
  expect(lab.stakeholderStanding.investor).toBe(46);

  lab.expired = ['clinic', 'transit'];
  lab.morale = 30;
  lab.cash = 20;
  lab.risk = 60;
  lab.data = 'scraped';
  settleStakeholders(lab, 3, operations);
  expect(lab.stakeholderStanding.workforce).toBe(49);
  expect(lab.stakeholderStanding.clinic).toBe(50);
  expect(lab.stakeholderStanding.transit).toBe(45);
  expect(lab.stakeholderStanding.regulator).toBe(49);
  expect(lab.stakeholderStanding.investor).toBe(45);

  lab.cash = 50;
  settleStakeholders(lab, 0, operations);
  expect(lab.stakeholderStanding.investor).toBe(44);

  lab.expired = [];
  lab.stakeholderStanding = Object.fromEntries(
    Object.keys(lab.stakeholderStanding).map(id => [id, 100])
  );
  lab.morale = 90;
  lab.cash = 100;
  lab.debt = 100;
  settleStakeholders(lab, 0, operations);
  expect(Object.values(lab.stakeholderStanding)).toEqual([
    100, 100, 98, 98, 100,
  ]);
});

test('rules-seven migration rejects malformed ledgers without repairing them', () => {
  const base = createNeonState();
  const malformed = [
    { rulesVersion: 6 },
    { infrastructure: null },
    { contracts: null },
    { contracts: ['clinic', 'clinic'] },
    { contracts: ['unknown'] },
    { fulfilled: null },
    { expired: null },
    { trust: NaN },
    { morale: NaN },
    { risk: NaN },
    { cash: NaN },
    { debt: NaN },
  ];
  for (const changes of malformed) {
    const candidate = {
      ...base,
      lab: {
        ...base.lab,
        rulesVersion: 7,
        ...changes,
        infrastructure:
          changes.infrastructure === null ? null : base.lab.infrastructure,
      },
    };
    const original = structuredClone(candidate);
    expect(migrateContracts(candidate)).toBe(candidate);
    expect(candidate).toEqual(original);
  }
});

test('rules-seven migration preserves active, fulfilled, expired and distressed deals', () => {
  const state = createNeonState();
  Object.assign(state.lab, {
    rulesVersion: 7,
    cash: -15,
    debt: 240,
    contracts: ['clinic', 'transit', 'helios'],
    fulfilled: ['clinic'],
    expired: ['transit'],
    outcome: 'insolvent',
    history: [{ shift: 12, cash: -15, risk: 8, progress: 3 }],
  });
  delete state.lab.contractTerms;
  delete state.lab.stakeholderStanding;
  const migrated = migrateContracts(state);
  expect(migrated.lab).toMatchObject({
    cash: -15,
    debt: 240,
    outcome: 'insolvent',
    contracts: ['clinic', 'transit', 'helios'],
    fulfilled: ['clinic'],
    expired: ['transit'],
    history: [{ shift: 12, cash: -15, risk: 8, progress: 3 }],
    contractTerms: {
      clinic: 'balanced',
      transit: 'balanced',
      helios: 'balanced',
    },
  });
  expect(migrated.world.day).toBe(state.world.day);
  expect(state.lab.contractTerms).toBeUndefined();
});
