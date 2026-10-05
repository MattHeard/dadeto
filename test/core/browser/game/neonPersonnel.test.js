import {
  createLab,
  manageLab,
  endShift,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import {
  createPersonnel,
  employeeThoughts,
  migratePersonnel,
  validPersonnel,
  personnelTeams,
} from '../../../../src/core/browser/game/neon-covenant/personnel.js';
import { labEntries } from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { migratePrograms } from '../../../../src/core/browser/game/neon-covenant/research.js';
import { migrateEvaluations } from '../../../../src/core/browser/game/neon-covenant/evaluation.js';
import { migrateRelationships } from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateContracts } from '../../../../src/core/browser/game/neon-covenant/contracts.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migrateDistress } from '../../../../src/core/browser/game/neon-covenant/distress.js';
import {
  createDeployments,
  migrateDeployments,
} from '../../../../src/core/browser/game/neon-covenant/operations.js';
import {
  createSaveAdapter,
  parseSave,
  serializeSave,
} from '../../../../src/core/browser/game/mosslight-valley/save.js';

/**
 * Obtain a genuine pre-versioned portable campaign for migration acceptance.
 * @param {object} changes Ledger changes for a specific historical run.
 * @returns {object} Unversioned campaign.
 */
function legacy(changes = {}) {
  const state = createNeonState();
  delete state.lab.rulesVersion;
  delete state.lab.programs;
  delete state.lab.evaluations;
  delete state.lab.testingBudget;
  delete state.lab.employees;
  delete state.lab.incidentChains;
  delete state.lab.incidentGrace;
  delete state.lab.lastIncidentCost;
  delete state.lab.relationships;
  delete state.lab.commitmentPolicies;
  delete state.lab.contractTerms;
  delete state.lab.stakeholderStanding;
  Object.assign(state.lab, changes);
  state.dialogue = null;
  return state;
}

/**
 * Create an isolated persistent store with the production Dadeto adapter shape.
 * @returns {object} Environment and inspectable current storage.
 */
function storage() {
  let data = {};
  const env = new Map([
    ['setLocalPermanentData', update => (data = { ...data, ...update })],
  ]);
  return { env, read: () => data };
}

test('named staffing preserves payroll and requires an explicit donor', () => {
  const state = { ...createNeonState(), dialogue: null };
  expect(createPersonnel().map(person => person.name)).toEqual([
    'Ada',
    'Jun',
    'Sable',
    'Ion',
  ]);
  expect(personnelTeams(state.lab.employees)).toEqual(state.lab.teams);
  expect(validPersonnel(state.lab)).toBe(true);
  expect(manageLab(state, 'team:service').lab).toEqual(state.lab);
  const assigned = manageLab(state, 'assign:jun:service');
  expect(assigned.lab.employees.find(person => person.id === 'jun').role).toBe(
    'service'
  );
  expect(assigned.lab.employees.find(person => person.id === 'ada').role).toBe(
    'research'
  );
  expect(assigned.lab.decisions).toBe(5);
  expect(validPersonnel(assigned.lab)).toBe(true);
  expect(manageLab(assigned, 'assign:jun:service').lab).toEqual(assigned.lab);
  for (const command of [
    'assign:missing:safety',
    'assign:ada:missing',
    'hire:ada',
    'hire:missing',
  ]) {
    expect(manageLab(state, command).lab).toEqual(state.lab);
  }
  const hired = manageLab(state, 'hire:tess');
  expect(hired.lab.cash).toBe(162);
  expect(hired.lab.teams.safety).toBe(2);
  expect(hired.lab.hired).toBe(5);
  expect(manageLab(hired, 'hire:tess').lab).toEqual(hired.lab);
  expect(
    manageLab({ ...state, lab: { ...state.lab, cash: 17 } }, 'hire:tess').lab
      .cash
  ).toBe(17);
});

test('employee concerns are causal and clear when their causes are addressed', () => {
  const lab = { ...createLab(), cooling: 8 };
  const person = lab.employees[0];
  expect(employeeThoughts(lab, person).join(' ')).toContain('room to breathe');
  const troubled = {
    ...lab,
    cooling: 4,
    data: 'scraped',
    teams: { research: 4, safety: 0, service: 0 },
    deployed: ['atlas'],
  };
  troubled.deployments = createDeployments(troubled);
  const thoughts = employeeThoughts(troubled, { ...person, fatigue: 50 });
  expect(thoughts).toHaveLength(5);
  expect(thoughts.join(' ')).toMatch(
    /recovery.*Cooling.*consented.*evaluating.*Support/s
  );
  expect(employeeThoughts(lab, person)).toHaveLength(1);
  const state = { ...createNeonState(), dialogue: null };
  const tired = endShift({ ...state, lab: { ...state.lab, policy: 'sprint' } });
  expect(tired.lab.employees[0].fatigue).toBe(10);
  expect(
    endShift({ ...tired, lab: { ...tired.lab, policy: 'careful' } }).lab
      .employees[0].fatigue
  ).toBe(2);
  expect(manageLab(tired, 'rest').lab.employees[0].fatigue).toBe(0);
});

test.each([
  {},
  {
    cash: 12,
    debt: 77,
    morale: 35,
    teams: { research: 0, safety: 0, service: 6 },
    hired: 6,
  },
  { cash: -10, incidents: 3, outcome: 'insolvent', promises: ['ada', 'mae'] },
  {
    cash: 250,
    research: { atlas: 38, ghost: 9, lumen: 20 },
    deployed: ['atlas'],
    contracts: ['clinic'],
    fulfilled: ['clinic'],
    expired: [],
    outcome: 'independent',
  },
])('migration preserves the historical ledger %p', changes => {
  const state = legacy(changes);
  delete state.lab.deployments;
  const before = structuredClone(state.lab);
  const migrated = migrateDistress(
    migrateCampaignAct(
      migrateContracts(
        migrateInfrastructure(
          migrateRelationships(
            migrateDeployments(
              migrateEvaluations(migratePrograms(migratePersonnel(state)))
            )
          )
        )
      )
    )
  );
  expect(state.lab).toEqual(before);
  expect(migrated.lab).toMatchObject(before);
  expect(migrated.lab.employees).toHaveLength(before.hired);
  expect(personnelTeams(migrated.lab.employees)).toEqual(before.teams);
  expect(
    migrated.lab.employees.every(
      person => person.morale === before.morale && person.wage === 3
    )
  ).toBe(true);
  expect(migrated.lab).toMatchObject({
    rulesVersion: 10,
    introductionComplete: true,
    remoteAdministration: true,
    incidentGrace: 2,
  });
  expect(validLabSave(migrated)).toBe(true);
  expect(migratePersonnel(migrated)).toBe(migrated);
});

test('invalid old and current rosters cannot be silently repaired on import', () => {
  for (const changes of [
    { teams: null },
    { teams: { research: -1, safety: 1, service: 1 } },
    { hired: 99 },
    { teams: { research: 101, safety: 0, service: 0 } },
  ]) {
    const state = legacy(changes);
    expect(migratePersonnel(state)).toBe(state);
    expect(validLabSave(state)).toBe(false);
  }
  const absent = legacy();
  delete absent.lab;
  expect(migratePersonnel(absent)).toBe(absent);
  const good = createLab();
  for (const employees of [
    null,
    [null],
    [good.employees[0], good.employees[0]],
    [{ ...good.employees[0], role: 'missing' }],
    [{ ...good.employees[0], wage: 2 }],
    [{ ...good.employees[0], fatigue: -1 }],
    [{ ...good.employees[0], fatigue: 101 }],
    [{ ...good.employees[0], morale: -1 }],
    [{ ...good.employees[0], morale: 101 }],
  ]) {
    expect(validPersonnel({ ...good, employees })).toBe(false);
  }
  expect(validPersonnel({ ...good, rulesVersion: 11 })).toBe(false);
  expect(validPersonnel({ ...good, hired: 9 })).toBe(false);
  expect(validPersonnel({ ...good, teams: null })).toBe(false);
  expect(
    validPersonnel({ ...good, teams: { research: 1, safety: 1, service: 2 } })
  ).toBe(false);
});

test('legacy slot migration keeps the first exact backup until explicit reset', () => {
  const store = storage();
  const key = 'neon-covenant-saves-v2';
  const raw = serializeSave(legacy(), 1, 'neon-covenant');
  store.env.get('setLocalPermanentData')({
    [key]: { slots: { 1: raw }, activeSlot: 1 },
  });
  const runtime = createNeonRuntime(store.env);
  expect(runtime.getSnapshot().lab.rulesVersion).toBe(10);
  expect(store.read()[key].migrationBackups[1]).toBe(raw);
  runtime.save();
  runtime.importSave(serializeSave(legacy({ cash: 160 }), 1, 'neon-covenant'));
  expect(store.read()[key].migrationBackups[1]).toBe(raw);
  expect(runtime.getSnapshot().lab.cash).toBe(160);
  const before = runtime.exportSave();
  expect(() =>
    runtime.importSave(
      serializeSave(legacy({ hired: 100 }), 1, 'neon-covenant')
    )
  ).toThrow();
  expect(runtime.exportSave()).toBe(before);
  runtime.resetSave('confirmed-reset');
  expect(store.read()[key].migrationBackups[1]).toBeUndefined();
  expect(runtime.getSnapshot().lab.cash).toBe(180);
  runtime.importSave(raw);
  runtime.resetSave();
  expect(store.read()[key].migrationBackups[1]).toBeUndefined();
  runtime.importSave(raw);
  runtime.setState({ ...runtime.getSnapshot(), controllerCommand: 'reset' });
  runtime.dispatch({ actions: [] });
  expect(store.read()[key].migrationBackups[1]).toBeUndefined();
});

test('migration runs before game validation and unchanged profiles retain their save contract', () => {
  const state = legacy();
  const raw = serializeSave(state, 0, 'neon-covenant');
  const profile = {
    game: 'neon-covenant',
    migrate: state =>
      migrateDistress(
        migrateCampaignAct(
          migrateContracts(
            migrateInfrastructure(
              migrateRelationships(
                migrateDeployments(
                  migrateEvaluations(migratePrograms(migratePersonnel(state)))
                )
              )
            )
          )
        )
      ),
    validate: validLabSave,
  };
  expect(parseSave(raw, profile).state.lab.employees).toHaveLength(4);
  expect(parseSave(raw, profile).originalSave).toBe(raw);
  expect(
    parseSave(serializeSave(createNeonState(), 0, 'neon-covenant'), profile)
      .originalSave
  ).toBeUndefined();
  expect(
    createSaveAdapter(undefined, profile).import(raw).state.lab.rulesVersion
  ).toBe(10);
  expect(parseSave(raw)).toBeNull();
});

test('the real eight-button menus expose individual roles and all six candidates', () => {
  let state = {
    ...createNeonState(),
    dialogue: null,
    menu: { page: 'recruitment', selected: 1 },
  };
  state = stepNeon(state, ['a']);
  expect(state.menu.page).toBe('employee:jun');
  state = stepNeon(state, []);
  state = stepNeon(state, ['down']);
  state = stepNeon(state, []);
  state = stepNeon(state, ['a']);
  expect(state.lab.employees[1].role).toBe('safety');
  expect(state.lab.decisions).toBe(5);
  const candidates = labEntries({
    ...state,
    menu: { page: 'candidates', selected: 0 },
  });
  expect(
    candidates.filter(([, command]) => command.startsWith('hire:'))
  ).toHaveLength(6);
  expect(
    labEntries({ ...state, menu: { page: 'inbox', selected: 0 } })
  ).toHaveLength(4);
  state = {
    ...state,
    lastActions: [],
    menu: { page: 'employee:ada', selected: 3 },
  };
  const before = state.lab.decisions;
  state = stepNeon(state, ['a']);
  expect(state.dialogue.lines[0].text).toContain(
    'Cooling cannot serve every rack'
  );
  expect(state.lab.decisions).toBe(before);
  expect(state.menu).toBeNull();
});
