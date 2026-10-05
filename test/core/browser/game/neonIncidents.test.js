import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  forecastShift,
  forecastPages,
} from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  createIncidentChains,
  validIncidentChains,
} from '../../../../src/core/browser/game/neon-covenant/incidents.js';
import {
  migratePersonnel,
  employeeThoughts,
} from '../../../../src/core/browser/game/neon-covenant/personnel.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateContracts } from '../../../../src/core/browser/game/neon-covenant/contracts.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migrateDistress } from '../../../../src/core/browser/game/neon-covenant/distress.js';
import {
  validLabSave,
  createNeonRuntime,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import { labEntries } from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { migratePrograms } from '../../../../src/core/browser/game/neon-covenant/research.js';
import { migrateEvaluations } from '../../../../src/core/browser/game/neon-covenant/evaluation.js';
import { migrateRelationships } from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import {
  createDeployments,
  migrateDeployments,
} from '../../../../src/core/browser/game/neon-covenant/operations.js';
import { serializeSave } from '../../../../src/core/browser/game/mosslight-valley/save.js';

/**
 * Create a solvent campaign exposing all four authored causes.
 * @returns {object} Hazardous but recoverable lab.
 */
function hazardous() {
  const state = createNeonState();
  Object.assign(state.lab, {
    cash: 800,
    cooling: 1,
    policy: 'sprint',
    data: 'scraped',
    deployed: ['atlas', 'ghost', 'lumen'],
    evaluated: { atlas: 0, ghost: 0, lumen: 0 },
    research: { atlas: 3, ghost: 0, lumen: 2 },
  });
  state.dialogue = null;
  state.lab.deployments = createDeployments(state.lab);
  return state;
}

test('all causes warn before charging once and persist across deterministic replay', () => {
  let state = hazardous();
  const original = structuredClone(state);
  state = endShift(state);
  expect(state.lab.incidents).toBe(0);
  expect(
    Object.values(state.lab.incidentChains).map(chain => chain.stage)
  ).toEqual(['warning', 'warning', 'warning', 'warning']);
  const preview = forecastShift(state);
  const settled = endShift(state);
  expect(preview.incidentCost).toBe(72);
  expect(preview.closingCash).toBe(settled.lab.cash);
  expect(settled.lab.incidents).toBe(4);
  expect(endShift(settled).lab.incidents).toBe(4);
  expect(endShift(settled).lab.lastIncidentCost).toBe(0);
  expect(endShift(endShift(original))).toEqual(settled);
  expect(validIncidentChains(settled.lab)).toBe(true);
});

test('interventions cost money and attention while triage cannot hide a persistent cause', () => {
  let state = endShift(hazardous());
  const before = structuredClone(state);
  expect(manageLab(state, 'incident:unknown').lab).toEqual(before.lab);
  expect(
    manageLab({ ...state, lab: { ...state.lab, cash: 0 } }, 'incident:heat').lab
      .cash
  ).toBe(0);
  expect(
    manageLab(
      {
        ...state,
        lab: { ...state.lab, teams: { research: 3, safety: 0, service: 1 } },
      },
      'incident:evaluation'
    ).toast
  ).toContain('Assign an evaluator');
  state = manageLab(state, 'incident:heat');
  expect(state.lab.cash).toBe(before.lab.cash - 20);
  expect(state.lab.decisions).toBe(5);
  expect(state.lab.cooling).toBe(5);
  expect(manageLab(state, 'incident:heat').lab).toEqual(state.lab);
  const pending = structuredClone(state.lab);
  state = manageLab(state, 'incident:evaluation');
  expect(state.lab).toEqual(pending);
  expect(state.toast).toContain('cannot grant release evidence');
  state = manageLab(state, 'incident:rights');
  expect(state.lab.data).toBe('licensed');
  state = manageLab(state, 'incident:support');
  expect(state.lab.incidentChains.support.stage).toBe('intervention');
  state = endShift(state);
  expect(state.lab.incidentChains.support.stage).toBe('warning');
  expect(state.lab.incidentChains.rights.stage).toBe('recovery');
  expect(manageLab(state, 'incident:rights').lab).toEqual(state.lab);
  state = endShift(state);
  expect(state.lab.incidentChains.rights.stage).toBe('clear');
  expect(state.lab.incidentChains.support.stage).toBe('incident');
  const charged = state.lab.incidents;
  state = endShift(manageLab(state, 'incident:support'));
  expect(state.lab.incidents).toBe(charged);
});

test('safe recovery clears episodes only after two safe settlements; relapse is not a second charge', () => {
  let state = endShift(endShift(hazardous()));
  state.lab.deployed = [];
  state.lab.data = 'licensed';
  state.lab.cooling = 32;
  state = endShift(state);
  expect(
    Object.values(state.lab.incidentChains).every(
      chain => chain.stage === 'recovery'
    )
  ).toBe(true);
  state.lab.deployed = ['atlas', 'ghost', 'lumen'];
  const relapsed = endShift(state);
  expect(relapsed.lab.incidentChains.support.stage).toBe('incident');
  expect(relapsed.lab.lastIncidentCost).toBe(0);
  state.lab.deployed = [];
  state = endShift(state);
  expect(
    Object.values(state.lab.incidentChains).every(
      chain => chain.stage === 'clear'
    )
  ).toBe(true);
  state.lab.deployed = ['atlas', 'ghost', 'lumen'];
  state = endShift(endShift(state));
  expect(state.lab.incidentChains.support.episodes).toBe(2);
});

test('migration protects two settlements without rerolling or changing historical accounting', () => {
  const old = hazardous();
  old.lab.rulesVersion = 1;
  delete old.lab.incidentChains;
  delete old.lab.incidentGrace;
  delete old.lab.lastIncidentCost;
  old.lab.incidents = 7;
  const migrated = migrateContracts(
    migrateInfrastructure(
      migrateRelationships(
        migrateDeployments(
          migrateEvaluations(migratePrograms(migratePersonnel(old)))
        )
      )
    )
  );
  expect(migrated.lab).toMatchObject({
    cash: 800,
    incidents: 7,
    rulesVersion: 8,
    incidentGrace: 2,
  });
  const current = migrateDistress(migrateCampaignAct(migrated));
  expect(validLabSave(current)).toBe(true);
  const one = endShift(current);
  const two = endShift(one);
  expect(two.lab.incidents).toBe(7);
  expect(two.lab.incidentGrace).toBe(0);
  expect(endShift(two).lab.incidents).toBe(11);
  expect(
    endShift({
      ...one,
      world: { ...one.world, day: 1 },
      lab: { ...one.lab, incidentGrace: 0 },
    }).lab.incidents
  ).toBe(7);
  const runtime = createNeonRuntime();
  runtime.start();
  runtime.importSave(serializeSave(two, 0, 'neon-covenant'));
  expect(runtime.getSnapshot().lab.incidentChains).toEqual(
    two.lab.incidentChains
  );
});

test('invalid chain imports cannot suppress incidents and valid states retain their authored keys', () => {
  const lab = hazardous().lab;
  expect(validIncidentChains({ ...lab, incidentChains: null })).toBe(false);
  expect(
    validIncidentChains({
      ...lab,
      incidentChains: { ...lab.incidentChains, fake: {} },
    })
  ).toBe(false);
  for (const change of [
    { stage: 'fake' },
    { charged: 1 },
    { warnedAt: -1 },
    { episodes: 0.5 },
  ]) {
    expect(
      validIncidentChains({
        ...lab,
        incidentChains: {
          ...lab.incidentChains,
          heat: { ...lab.incidentChains.heat, ...change },
        },
      })
    ).toBe(false);
  }
  for (const change of [
    { incidentGrace: -1 },
    { incidentGrace: 3 },
    { lastIncidentCost: -1 },
  ])
    expect(validIncidentChains({ ...lab, ...change })).toBe(false);
  expect(
    validIncidentChains({
      ...lab,
      incidentChains: { ...createIncidentChains(), heat: null },
    })
  ).toBe(false);
});

test('incident inspection uses real eight-button menus and leaves the shift untouched', () => {
  const state = {
    ...endShift(hazardous()),
    menu: { page: 'incidents', selected: 0 },
  };
  const entries = labEntries(state);
  expect(entries[0][1]).toBe('preview:incident:heat');
  const preview = stepNeon(state, ['a'], 0);
  expect(preview.world.day).toBe(state.world.day);
  expect(preview.lab).toEqual(state.lab);
  expect(
    forecastPages(state)
      .map(page => page.text)
      .join(' ')
  ).toContain('charged only once');
  expect(
    labEntries({ ...state, menu: { page: 'responses', selected: 0 } })[0][1]
  ).toBe('incident:heat');
});

test('responsible people follow the warning and recovery rather than inventing memories', () => {
  const state = endShift(hazardous());
  const ion = state.lab.employees.find(person => person.id === 'ion');
  expect(employeeThoughts(state.lab, ion).join(' ')).toContain(
    'Overheating: warning'
  );
  state.lab.cooling = 32;
  const recovered = endShift(state);
  expect(employeeThoughts(recovered.lab, ion).join(' ')).toContain(
    'Overheating: recovery'
  );
  expect(
    employeeThoughts(endShift(recovered).lab, ion).join(' ')
  ).not.toContain('Overheating:');
});

test('contradictory or future incident records are rejected before import', () => {
  const state = hazardous();
  for (const change of [
    { stage: 'clear', charged: true, episodes: 1 },
    { stage: 'incident', charged: false },
    { stage: 'intervention', charged: true, episodes: 0 },
  ]) {
    expect(
      validIncidentChains({
        ...state.lab,
        incidentChains: {
          ...state.lab.incidentChains,
          heat: { ...state.lab.incidentChains.heat, ...change },
        },
      })
    ).toBe(false);
  }
  state.lab.incidentChains.heat.warnedAt = 999;
  expect(validLabSave(state)).toBe(false);
});
