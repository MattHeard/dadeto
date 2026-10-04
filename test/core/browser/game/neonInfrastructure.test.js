import { describe, expect, test } from '@jest/globals';
import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import { createDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  createInfrastructure,
  infrastructureEffects,
  infrastructureOrder,
  validInfrastructure,
  migrateInfrastructure,
} from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import {
  forecast,
  endShift,
} from '../../../../src/core/browser/game/neon-covenant/management.js';

/**
 * Create a current rules ledger with the requested equipment configuration.
 * @param {Record<string, number>} [infrastructure] Installed equipment.
 * @returns {Record<string, any>} Independent lab fixture.
 */
function labWith(infrastructure = createInfrastructure()) {
  const lab = { ...createNeonState().lab, infrastructure };
  lab.deployments = createDeployments(lab);
  return lab;
}

/**
 * Submit one released then pressed controller action to the shared runtime.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} button Eight-button action.
 * @returns {Record<string, any>} Updated campaign.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}

/**
 * Navigate to and confirm a visible management-menu choice.
 * @param {Record<string, any>} state Open menu state.
 * @param {string} command Expected authored choice.
 * @returns {Record<string, any>} Resulting campaign.
 */
function chooseMenuCommand(state, command) {
  const target = labEntries(state).findIndex(([, entry]) => entry === command);
  for (let selected = state.menu.selected; selected < target; selected++)
    state = press(state, 'down');
  return press(state, 'a');
}

describe('alternative lab infrastructure', () => {
  test('starts empty and combines disclosed reliability, bill and power effects', () => {
    expect(infrastructureEffects(labWith())).toEqual({
      recurring: 0,
      reliability: 0,
      power: 0,
    });
    const installed = createInfrastructure();
    installed.refurbished = 2;
    installed.accelerator = 1;
    installed.leased = 1;
    installed.backupPower = 1;
    installed.heatRecovery = 1;
    expect(infrastructureEffects(labWith(installed))).toEqual({
      recurring: 9,
      reliability: -11,
      power: -4,
    });
  });

  test.each([
    ['refurbished', 18, 2, 0],
    ['accelerator', 36, 4, 0],
    ['leased', 8, 4, 0],
    ['backupPower', 16, 0, 0],
    ['heatRecovery', 22, 0, 3],
  ])(
    'installs %s with its unique price and capacity',
    (id, cost, compute, cooling) => {
      const lab = labWith();
      const originalCash = lab.cash;
      expect(infrastructureOrder(lab, id)).toContain('installed');
      expect(lab.cash).toBe(originalCash - cost);
      expect(lab.compute).toBe(8 + compute);
      expect(lab.cooling).toBe(4 + cooling);
      expect(lab.infrastructure[id]).toBe(1);
    }
  );

  test('limits duplicates, rejects unknown and unaffordable orders atomically', () => {
    const lab = labWith();
    expect(infrastructureOrder(lab, 'not-authored')).toContain('Unknown');
    lab.cash = 0;
    const before = structuredClone(lab);
    expect(infrastructureOrder(lab, 'leased')).toContain('Need 8k');
    expect(lab).toEqual(before);
    lab.cash = 100;
    expect(infrastructureOrder(lab, 'backupPower')).toContain('installed');
    const afterFirst = structuredClone(lab);
    expect(infrastructureOrder(lab, 'backupPower')).toContain('limit reached');
    expect(lab).toEqual(afterFirst);
  });

  test('validates exact authored equipment counters', () => {
    expect(validInfrastructure(labWith())).toBe(true);
    expect(validInfrastructure({})).toBe(false);
    const malformed = labWith();
    malformed.infrastructure.extra = 0;
    expect(validInfrastructure(malformed)).toBe(false);
    delete malformed.infrastructure.extra;
    malformed.infrastructure.refurbished = -1;
    expect(validInfrastructure(malformed)).toBe(false);
    malformed.infrastructure.refurbished = 3;
    expect(validInfrastructure(malformed)).toBe(false);
  });

  test('upgrades a rules-six save without changing its historical ledger', () => {
    const state = createNeonState();
    state.lab.rulesVersion = 6;
    delete state.lab.infrastructure;
    state.lab.cash = 73;
    state.lab.debt = 94;
    state.lab.research.atlas = 17;
    const original = structuredClone(state.lab);
    const upgraded = migrateInfrastructure(state);
    expect(upgraded.lab).toMatchObject({
      ...original,
      rulesVersion: 7,
      infrastructure: createInfrastructure(),
    });
    expect(upgraded.lab.cash).toBe(73);
    expect(upgraded.lab.debt).toBe(94);
    expect(upgraded.lab.research.atlas).toBe(17);
    expect(migrateInfrastructure(upgraded)).toBe(upgraded);
    expect(migrateInfrastructure({ lab: { rulesVersion: 5 } })).toEqual({
      lab: { rulesVersion: 5 },
    });
  });

  test('forecast and settlement include equipment bills and power savings exactly', () => {
    const lab = labWith();
    infrastructureOrder(lab, 'accelerator');
    infrastructureOrder(lab, 'backupPower');
    infrastructureOrder(lab, 'leased');
    const current = { ...createNeonState(), dialogue: null, lab };
    const projection = forecast(lab);
    const settled = endShift(current);
    expect(projection.infrastructure).toBe(9);
    expect(projection.power).toBe(0);
    expect(settled.lab.cash).toBe(
      lab.cash +
        projection.income +
        projection.service -
        projection.payroll -
        projection.power -
        projection.hosting -
        projection.infrastructure
    );
    expect(settled.lab.report[1]).toContain('infrastructure 9k');
  });

  test('Ion menu previews each order and charges only after explicit confirmation', () => {
    let state = {
      ...createNeonState(),
      dialogue: null,
      menu: { page: 'infrastructure', selected: 0 },
    };
    const commands = labEntries(state).map(([, command]) => command);
    expect(commands).toContain('infra-choice:heatRecovery');
    expect(labMenuRows(state).some(row => row.includes('› Add compute'))).toBe(
      true
    );
    const cash = state.lab.cash;
    const decisions = state.lab.decisions;
    state = chooseMenuCommand(state, 'infra-choice:heatRecovery');
    expect(state.dialogue.actorId).toBe('ion');
    expect(state.lab.cash).toBe(cash);
    expect(state.lab.decisions).toBe(decisions);
    while (!state.dialogue.choices.length) state = press(state, 'a');
    state = press(state, 'a');
    expect(state.lab.infrastructure.heatRecovery).toBe(1);
    expect(state.lab.cooling).toBe(7);
    expect(state.lab.cash).toBe(cash - 22);
    expect(state.lab.decisions).toBe(decisions - 1);
  });

  test('an unaffordable install explains the blocker and preserves money and attention', () => {
    const initial = createNeonState();
    let state = {
      ...initial,
      dialogue: null,
      menu: { page: 'infrastructure', selected: 0 },
      lab: { ...initial.lab, cash: 0 },
    };
    const before = structuredClone(state.lab);
    state = chooseMenuCommand(state, 'infra-choice:leased');
    while (!state.dialogue.choices.length) state = press(state, 'a');
    expect(state.dialogue.choices).toHaveLength(1);
    expect(state.dialogue.lines.at(-1).text).toContain('No order is available');
    state = press(state, 'a');
    expect(state.lab).toEqual(before);
    expect(state.lab.decisions).toBe(6);
    expect(state.world.day).toBe(1);
  });
});
