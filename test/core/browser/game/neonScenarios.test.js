import {
  createNeonState,
  menuCommand,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import {
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  SCENARIOS,
  settleScenario,
  startScenario,
  validScenario,
} from '../../../../src/core/browser/game/neon-covenant/scenarios.js';

/**
 *
 * @param id
 */
/**
 * Construct a world-ready state with one authored scenario active.
 * @param {string} id Authored short-campaign identifier.
 * @returns {Record<string, any>} Independent scenario campaign.
 */
function scenarioState(id) {
  const state = createNeonState();
  return { ...state, lab: startScenario(state.lab, id) };
}

/**
 * Prove a completed scenario round-trips through the canonical save boundary.
 * @param {Record<string, any>} state Finished campaign snapshot.
 * @returns {void}
 */
function expectScenarioSaveRoundTrip(state) {
  const expected = state.lab.scenario;
  const runtime = createNeonRuntime(new Map());
  runtime.setState(state);
  const exported = runtime.exportSave();
  runtime.setState(createNeonState());
  runtime.importSave(exported);
  expect(runtime.getSnapshot().lab.scenario).toEqual(expected);
  expect(validLabSave(runtime.getSnapshot())).toBe(true);
  expect(runtime.exportSave()).toBe(exported);
}

describe('Neon Covenant short scenarios', () => {
  test('controller offers three scenarios, discloses slot replacement, and starts only the confirmed choice', () => {
    const state = createNeonState();
    state.menu = { page: 'scenarios', selected: 0 };
    expect(labEntries(state)).toHaveLength(4);
    expect(labEntries(state)[0][1]).toBe('scenario:brief:clinicLaunch');
    expect(labMenuRows(state).join(' ')).toContain('START REPLACES THIS SLOT');
    state.menu.selected = 3;
    expect(labMenuRows(state).join(' ')).toContain(
      'Choose an authored scenario.'
    );
    state.menu = { page: 'dashboard', selected: 0 };
    expect(labMenuRows(state).join(' ')).not.toContain('SCENARIO');
    const briefing = menuCommand(state, 'scenario:brief:clinicLaunch');
    expect(briefing.dialogue.lines[0].text).toContain(
      'currently selected save slot'
    );
    const wrongStage = menuCommand(briefing, 'scenario:other:clinicLaunch');
    expect(wrongStage.dialogue).toBe(briefing.dialogue);
    const declined = menuCommand(briefing, 'scenario:brief:missing');
    expect(declined.dialogue).toBe(briefing.dialogue);
    expect(declined.lab).toBe(briefing.lab);
    const started = menuCommand(briefing, 'scenario:start:clinicLaunch');
    expect(started.lab.scenario.id).toBe('clinicLaunch');
    expect(started.dialogue.lines[0].text).toContain('OBJECTIVE');
    expect(validLabSave(started)).toBe(true);
    for (const command of [
      2,
      'scenario:missing:clinicLaunch',
      'scenario:brief:missing',
      'scenario:brief:clinicLaunch:extra',
    ]) {
      const malformed = {
        ...started,
        dialogue: {
          ...started.dialogue,
          choices: [{ label: 'Forged', command }],
        },
      };
      expect(validLabSave(malformed)).toBe(false);
    }
    state.menu = { page: 'scenarios', selected: 0 };
    const active = scenarioState('clinicLaunch');
    active.menu = { page: 'dashboard', selected: 0 };
    expect(labMenuRows(active).join(' ')).toContain('SCENARIO ACTIVE');
    const runtime = createNeonRuntime(new Map());
    runtime.setState(started);
    const exported = runtime.exportSave();
    runtime.importSave(exported);
    expect(runtime.getSnapshot().lab.scenario).toEqual(started.lab.scenario);
    expect(runtime.exportSave()).toBe(exported);
    const controllerStart = stepNeon(
      stepNeon(stepNeon({ ...state, lastActions: [] }, ['a']), []),
      ['a']
    );
    expect(controllerStart.lab.scenario.id).toBe('clinicLaunch');
  });

  test('clinic launch succeeds at the real Atlas pilot milestone while solvent', () => {
    const settled = endShift(scenarioState('clinicLaunch'));

    expect(settled.lab.research.atlas).toBeGreaterThanOrEqual(20);
    expect(settled.lab.cash).toBeGreaterThan(0);
    expect(settled.lab.scenario.status).toBe('success');
    expect(settled.lab.report.at(-1)).toContain('SCENARIO SUCCESS');
    expectScenarioSaveRoundTrip(settled);
  });

  test('bounded autonomy route records current Ghost evidence without advancing its checkpoint', () => {
    let state = endShift(scenarioState('autonomyPilot'));
    expect(state.lab.research.ghost).toBeGreaterThanOrEqual(32);
    state = manageLab(state, 'assign:ada:service');
    state = manageLab(state, 'assign:jun:service');
    for (const probe of ['reliability', 'rights', 'oversight'])
      state = manageLab(state, `test:probe:${probe}`);

    expect(state.lab.evaluated.ghost).toBe(state.lab.research.ghost);
    state = endShift(state);
    expect(state.lab.research.ghost).toBe(state.lab.evaluated.ghost);
    expect(state.lab.scenario.status).toBe('success');
    expect(state.lab.cash).toBeGreaterThan(0);
    expectScenarioSaveRoundTrip(state);
  });

  test('brownout recovery requires the cooling repair and two safe settlements', () => {
    let state = scenarioState('brownoutRecovery');
    state = manageLab(state, 'cooling');
    state = endShift(state);
    expect(state.lab.incidentChains.heat.stage).toBe('recovery');
    expect(state.lab.scenario.status).toBe('active');
    state = endShift(state);

    expect(state.lab.incidentChains.heat.stage).toBe('clear');
    expect(state.lab.incidents).toBe(0);
    expect(state.lab.scenario.status).toBe('success');
    expectScenarioSaveRoundTrip(state);
  });

  test('scenario definitions, unknown starts, invalid saves, and deadline failures are guarded', () => {
    const original = createNeonState().lab;
    expect(Object.keys(SCENARIOS)).toHaveLength(3);
    expect(startScenario(original, 'missing')).toBe(original);
    expect(validScenario(original)).toBe(true);
    expect(validScenario({ ...original, scenario: null })).toBe(false);
    expect(
      validScenario({
        ...original,
        scenario: {
          id: 'clinicLaunch',
          status: 'active',
          settled: 0,
          startedAt: 1,
          objective: 'forged',
        },
      })
    ).toBe(false);
    const initial = startScenario(original, 'clinicLaunch');
    const failed = settleScenario(
      {
        ...initial,
        cash: -1,
        scenario: { ...initial.scenario, settled: 7 },
      },
      8
    );
    expect(failed.scenario.status).toBe('failed');
    expect(settleScenario(original, 1)).toBe(original);
  });
});
