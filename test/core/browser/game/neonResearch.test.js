import { LAB_CONTENT } from '../../../../src/core/browser/game/neon-covenant/content.js';
import {
  createLab,
  manageLab,
  endShift,
  forecast,
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
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  compareOrder,
  forecastShift,
  readableLabPages,
} from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  createPrograms,
  researchOptions,
  researchEffects,
  hostingCost,
  configureResearch,
  settleResearch,
  validPrograms,
  migratePrograms,
  researchPages,
} from '../../../../src/core/browser/game/neon-covenant/research.js';
import { wrapDialogueText } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { migrateEvaluations } from '../../../../src/core/browser/game/neon-covenant/evaluation.js';
import { migrateDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';
import { migrateRelationships } from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import { migrateContracts } from '../../../../src/core/browser/game/neon-covenant/contracts.js';

/**
 * Submit a discrete real controller input and release.
 * @param {object} state Current lab.
 * @param {string} button Eight-button press.
 * @returns {object} Updated campaign.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}

/**
 * Navigate a real menu without dispatching management commands directly.
 * @param {object} state Campaign with an open menu.
 * @param {string} command Authored visible operation.
 * @returns {object} Campaign after A confirms the selection.
 */
function choose(state, command) {
  const selected = labEntries(state).findIndex(
    ([, value]) => value === command
  );
  expect(selected).toBeGreaterThanOrEqual(0);
  let next = state;
  while (next.menu.selected !== selected) next = press(next, 'down');
  return press(next, 'a');
}

test('three programs have distinct milestones and substantive authored identities', () => {
  expect(LAB_CONTENT.projects.atlas.milestones).toEqual({
    prototype: 6,
    pilot: 20,
    release: 38,
  });
  expect(LAB_CONTENT.projects.ghost.milestones).toEqual({
    prototype: 12,
    pilot: 32,
    release: 64,
  });
  expect(LAB_CONTENT.projects.lumen.milestones).toEqual({
    prototype: 8,
    pilot: 24,
    release: 48,
  });
  expect(createLab().programs.atlas.settings.specialization).toBe('triage');
  expect(createLab().programs.ghost.settings.specialization).toBe('assistant');
  expect(createLab().programs.lumen.settings.specialization).toBe('civic');
  expect(researchOptions('atlas', 'missing')).toEqual({});
  expect(researchOptions('atlas', '__proto__')).toEqual({});
  expect(researchEffects(createLab())).toEqual({
    compute: 1,
    pace: 1,
    hazard: 0,
    fee: 0,
  });
  const lab = createLab();
  expect(createPrograms(lab)).toEqual(lab.programs);
  const original = structuredClone(lab);
  for (const id of Object.keys(LAB_CONTENT.projects)) {
    const nodes = readableLabPages(researchPages({ ...lab, focus: id }));
    expect(nodes[0].text).toContain(
      LAB_CONTENT.projects[id].identity.split(':')[0]
    );
    expect(nodes.map(node => node.text).join(' ')).toContain('none yet');
    for (const node of nodes)
      expect(wrapDialogueText(node.text).length).toBeLessThanOrEqual(6);
  }
  expect(lab).toEqual(original);
});

test('every bounded configuration discloses real costs and preserves unrelated checkpoints', () => {
  for (const focus of Object.keys(LAB_CONTENT.projects)) {
    for (const axis of ['size', 'hosting', 'specialization', 'oversight']) {
      for (const [value, definition] of Object.entries(
        researchOptions(focus, axis)
      )) {
        const state = createNeonState();
        state.lab.focus = focus;
        state.lab.evaluated = { atlas: 7, ghost: 8, lumen: 9 };
        const original = structuredClone(state);
        const command = `configure:${axis}:${value}`;
        const preview = compareOrder(state, command);
        const result = manageLab(state, command);
        expect(state).toEqual(original);
        if (original.lab.programs[focus].settings[axis] === value) {
          expect(preview.accepted).toBe(false);
          expect(result.lab).toEqual(state.lab);
        } else {
          expect(result.lab.cash).toBe(state.lab.cash - definition.cost);
          expect(result.lab.decisions).toBe(5);
          expect(result.lab.evaluated[focus]).toBe(0);
          Object.keys(LAB_CONTENT.projects)
            .filter(id => id !== focus)
            .forEach(id => {
              expect(result.lab.evaluated[id]).toBe(state.lab.evaluated[id]);
              expect(result.lab.programs[id]).toEqual(state.lab.programs[id]);
            });
          expect(result.lab.programs[focus].settings[axis]).toBe(value);
          expect(preview.cost).toBe(definition.cost);
          expect(preview.after.closingCash).toBe(endShift(result).lab.cash);
          expect(preview.after.researchGain).toBe(
            endShift(result).lab.research[focus] - result.lab.research[focus]
          );
        }
      }
    }
  }
});

test('changed programs produce genuinely different pace, hazard and persistent hosting bills', () => {
  let state = createNeonState();
  state.lab.cooling = 8;
  expect(forecast(state.lab).progress).toBe(7);
  const compact = manageLab(state, 'configure:size:compact');
  expect(forecast(compact.lab).progress).toBe(6);
  const safe = manageLab(state, 'configure:oversight:human');
  const risky = manageLab(state, 'configure:oversight:autonomous');
  expect(forecast(safe.lab).progress).toBeLessThan(
    forecast(risky.lab).progress
  );
  expect(endShift(safe).lab.risk).toBeLessThan(endShift(risky).lab.risk);
  state = manageLab(state, 'configure:hosting:district');
  expect(hostingCost(state.lab)).toBe(6);
  expect(forecastShift(state).hosting).toBe(6);
  expect(forecast(state.lab).demand).toBe(3);
  state = manageLab(state, 'focus:lumen');
  expect(forecast(state.lab).hosting).toBe(6);
  state = manageLab(state, 'configure:hosting:edge');
  expect(hostingCost(state.lab)).toBe(8);
  expect(endShift(state).lab.report.join(' ')).toContain('hosting 8k');
  const fees = endShift(state).lab.cash;
  const noFees = structuredClone(state);
  noFees.lab.programs.atlas.settings.hosting = 'local';
  noFees.lab.programs.lumen.settings.hosting = 'local';
  expect(fees).toBeLessThan(endShift(noFees).lab.cash);
});

test('rejected settings cost neither money nor attention and cannot forge a dimension', () => {
  for (const command of [
    'configure:missing:x',
    'configure:size:missing',
    'configure:__proto__:constructor',
    'configure:size:compact:extra',
  ]) {
    const lab = createLab();
    const original = structuredClone(lab);
    expect(configureResearch(lab, command)).toContain('rejected');
    expect(lab).toEqual(original);
  }
  const state = createNeonState();
  state.lab.cash = 0;
  expect(manageLab(state, 'configure:size:frontier').lab).toEqual(state.lab);
  state.lab.cash = 180;
  state.lab.decisions = 0;
  expect(manageLab(state, 'configure:size:frontier').lab).toEqual(state.lab);
});

test('milestones are earned once without deployment, including multiple thresholds in a shift', () => {
  const lab = createLab();
  lab.research = { atlas: 38, ghost: 64, lumen: 48 };
  const report = [];
  settleResearch(lab, report);
  expect(report).toHaveLength(9);
  expect(lab.deployed).toEqual([]);
  expect(validPrograms(lab)).toBe(true);
  const again = [];
  settleResearch(lab, again);
  expect(again).toEqual([]);
  expect(
    researchPages(lab)
      .map(node => node.text)
      .join(' ')
  ).toContain('Earned: prototype, pilot, release');
  const before = createNeonState();
  before.lab.research.atlas = 5;
  const after = endShift(before);
  expect(after.lab.programs.atlas.milestones).toEqual(['prototype']);
  expect(after.lab.report.join(' ')).toContain('prototype training milestone');
  expect(after.lab.evaluated.atlas).toBe(0);
});

test('program validation rejects corrupt settings, progress and invented milestones', () => {
  const good = createLab();
  const runtime = createNeonRuntime();
  const active = runtime.exportSave();
  expect(validPrograms(good)).toBe(true);
  for (const mutate of [
    lab => {
      delete lab.programs;
    },
    lab => {
      delete lab.programs.atlas;
    },
    lab => {
      lab.programs.atlas = null;
    },
    lab => {
      delete lab.programs.atlas.settings;
    },
    lab => {
      delete lab.programs.atlas.settings.size;
    },
    lab => {
      lab.programs.atlas.settings.size = 'missing';
    },
    lab => {
      lab.programs.atlas.settings.size = ['standard'];
    },
    lab => {
      lab.programs.atlas.settings.oversight = { toString: 'human' };
    },
    lab => {
      lab.programs.atlas.milestones = null;
    },
    lab => {
      lab.programs.atlas.milestones = ['release'];
    },
    lab => {
      lab.research = null;
    },
    lab => {
      lab.research.atlas = NaN;
    },
    lab => {
      lab.research.atlas = -1;
    },
  ]) {
    const broken = structuredClone(good);
    mutate(broken);
    expect(validPrograms(broken)).toBe(false);
    const state = { ...runtime.getSnapshot(), lab: broken };
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state })
      )
    ).toThrow();
    expect(runtime.exportSave()).toBe(active);
  }
});

test('rules-2 slot upgrades keep the exact first backup and isolate Mosslight saves', () => {
  const state = createNeonState();
  state.lab.rulesVersion = 2;
  delete state.lab.programs;
  const raw = JSON.stringify({
    game: 'neon-covenant',
    version: 2,
    slot: 2,
    state,
  });
  const key = 'neon-covenant-saves-v2';
  const mossKey = 'mosslight-valley-saves-v2';
  let data = {
    [key]: { slots: { 2: raw }, activeSlot: 2 },
    [mossKey]: { untouched: true },
  };
  const env = new Map([
    ['setLocalPermanentData', update => (data = { ...data, ...update })],
  ]);
  const runtime = createNeonRuntime(env);
  expect(runtime.getSnapshot().lab.rulesVersion).toBe(9);
  expect(data[key].migrationBackups[2]).toBe(raw);
  state.lab.cash = 130;
  runtime.importSave(
    JSON.stringify({ game: 'neon-covenant', version: 2, slot: 2, state })
  );
  runtime.save();
  expect(data[key].migrationBackups[2]).toBe(raw);
  expect(runtime.getSnapshot().lab.cash).toBe(130);
  expect(data[mossKey]).toEqual({ untouched: true });
  runtime.resetSave('confirmed-slot-reset');
  expect(data[key].migrationBackups[2]).toBeUndefined();
  expect(data[mossKey]).toEqual({ untouched: true });
});

test.each([
  { cash: 137 },
  { cash: 5, debt: 190 },
  { cash: 240, outcome: 'independent' },
])(
  'rules-2 migration preserves the real ledger and deterministic export/import: %p',
  changes => {
    const legacy = createNeonState();
    legacy.dialogue = null;
    Object.assign(legacy.lab, changes, {
      rulesVersion: 2,
      research: { atlas: 38, ghost: 12, lumen: 24 },
      evaluated: { atlas: 38, ghost: 0, lumen: 0 },
      deployed: ['atlas'],
    });
    legacy.world.day = 9;
    delete legacy.lab.programs;
    const original = structuredClone(legacy);
    const upgraded = migratePrograms(legacy);
    const { rulesVersion, programs, ...ledger } = upgraded.lab;
    const { rulesVersion: oldVersion, ...oldLedger } = original.lab;
    expect(rulesVersion).toBe(3);
    expect(oldVersion).toBe(2);
    expect(ledger).toEqual(oldLedger);
    expect(programs.atlas.milestones).toEqual([
      'prototype',
      'pilot',
      'release',
    ]);
    expect(
      validLabSave(
        migrateCampaignAct(
          migrateContracts(
            migrateInfrastructure(
              migrateRelationships(
                migrateDeployments(migrateEvaluations(upgraded))
              )
            )
          )
        )
      )
    ).toBe(true);
    expect(legacy).toEqual(original);
    expect(migratePrograms(upgraded)).toBe(upgraded);
    expect(migratePrograms({})).toEqual({});
    const runtime = createNeonRuntime();
    runtime.importSave(
      JSON.stringify({ game: 'neon-covenant', version: 2, state: legacy })
    );
    const serialized = runtime.exportSave();
    runtime.importSave(serialized);
    expect(runtime.exportSave()).toBe(serialized);
    expect(forecastShift(runtime.getSnapshot())).toEqual(
      forecastShift(
        migrateCampaignAct(
          migrateContracts(
            migrateInfrastructure(
              migrateRelationships(
                migrateDeployments(migrateEvaluations(upgraded))
              )
            )
          )
        )
      )
    );
  }
);

test('the controller previews, cancels and explicitly confirms without running time', () => {
  let state = press(createNeonState(), 'b');
  state = choose(press(state, 'x'), 'page:research');
  state = choose(state, 'page:program');
  expect(labMenuRows(state)).toHaveLength(7);
  const story = choose(state, 'program-story');
  expect(story.dialogue.lines.map(line => line.text).join(' ')).toContain(
    'Clinical reliability'
  );
  state = choose(state, 'page:setting:size');
  const original = structuredClone(state.lab);
  const alreadyActive = choose(state, 'setting:size:standard');
  expect(alreadyActive.dialogue.lines.at(-1).choices).toEqual([
    { label: 'Return to lab' },
  ]);
  expect(alreadyActive.lab).toEqual(original);
  let preview = choose(state, 'setting:size:compact');
  expect(preview.lab).toEqual(original);
  expect(preview.world.day).toBe(1);
  expect(press(preview, 'b').dialogue).toBeNull();
  const runtime = createNeonRuntime();
  runtime.setState(preview);
  const save = runtime.exportSave();
  runtime.importSave(save);
  while (!preview.dialogue.choices.length) preview = press(preview, 'a');
  expect(validLabSave(preview)).toBe(true);
  runtime.setState(preview);
  runtime.importSave(runtime.exportSave());
  const result = press(preview, 'a');
  expect(result.lab.cash).toBe(original.cash - 6);
  expect(result.lab.decisions).toBe(5);
  expect(result.lab.programs.atlas.settings.size).toBe('compact');
  expect(result.world.day).toBe(1);
  const poor = { ...state, lab: { ...state.lab, cash: 0 } };
  expect(
    choose(poor, 'setting:size:compact').dialogue.lines.at(-1).choices
  ).toEqual([{ label: 'Return to lab' }]);
  for (const command of [
    42,
    'configure:size:missing',
    'configure:size:compact:extra',
    'configure:size:compact:',
  ]) {
    const bad = structuredClone(preview);
    bad.dialogue.choices[0].command = command;
    expect(validLabSave(bad)).toBe(false);
    const before = runtime.exportSave();
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state: bad })
      )
    ).toThrow();
    expect(runtime.exportSave()).toBe(before);
  }
});
