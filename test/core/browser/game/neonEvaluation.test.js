import { EVALUATION_CASES } from '../../../../src/core/browser/game/neon-covenant/evaluationContent.js';
import { migrateDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';
import { migrateRelationships } from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateContracts } from '../../../../src/core/browser/game/neon-covenant/contracts.js';
import { migrateCampaignAct } from '../../../../src/core/browser/game/neon-covenant/campaign.js';
import {
  createEvaluations,
  evaluationStatus,
  evaluationComplete,
  evaluationOrder,
  migrateEvaluations,
  validEvaluations,
  evaluationPages,
} from '../../../../src/core/browser/game/neon-covenant/evaluation.js';
import {
  createLab,
  manageLab,
  endShift,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import { createPrograms } from '../../../../src/core/browser/game/neon-covenant/research.js';
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

/**
 * Create a legitimately release-ready input fixture with untested evidence.
 * @param {string} focus Program under test.
 * @returns {object} Solvent lab with derived authored milestones.
 */
function ready(focus = 'atlas') {
  const state = createNeonState();
  state.dialogue = null;
  Object.assign(state.lab, {
    focus,
    cash: 900,
    research: { atlas: 38, ghost: 64, lumen: 48 },
  });
  state.lab.programs = createPrograms(state.lab);
  return state;
}

/**
 * Complete all representative probes through ordinary costed management rules.
 * @param {object} state Current campaign.
 * @returns {object} Campaign with explicit evidence for its active program.
 */
function tested(state) {
  return ['reliability', 'rights', 'oversight'].reduce(
    (next, id) => manageLab(next, `test:probe:${id}`),
    state
  );
}

/**
 * Press and release one of the actual eight controller inputs.
 * @param {object} state Campaign.
 * @param {string} button Input.
 * @returns {object} Updated state.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}

/**
 * Select a real visible menu row using directions and A, never a rule bypass.
 * @param {object} state Open menu.
 * @param {string} command Authored operation.
 * @returns {object} Result after confirmation.
 */
function choose(state, command) {
  const index = labEntries(state).findIndex(
    ([, operation]) => operation === command
  );
  expect(index).toBeGreaterThanOrEqual(0);
  while (state.menu.selected !== index) state = press(state, 'down');
  return press(state, 'a');
}

test.each(Object.keys(EVALUATION_CASES))(
  'Sable gates %s with three paid representative probes, not blanket signoff',
  project => {
    let state = ready(project);
    const before = structuredClone(state);
    expect(manageLab(state, 'evaluate').lab).toEqual(state.lab);
    expect(manageLab(state, 'deploy').lab).toEqual(state.lab);
    state = tested(state);
    expect(state.lab.cash).toBe(before.lab.cash - 6);
    expect(state.lab.decisions).toBe(3);
    expect(state.lab.testingBudget).toBe(0);
    expect(state.lab.evaluated[project]).toBe(state.lab.research[project]);
    expect(evaluationComplete(state.lab, project)).toBe(true);
    expect(manageLab(state, 'deploy').lab.deployed).toContain(project);
    expect(validLabSave(state)).toBe(true);
    expect(validEvaluations(state.lab)).toBe(true);
    expect(before).toEqual(ready(project));
  }
);

test('fresh evidence logs have independent project records', () => {
  const first = createEvaluations();
  first.atlas.rights = { status: 'finding' };
  expect(createEvaluations().atlas.rights).toBeNull();
  expect(first.ghost.rights).toBeNull();
});

test('portable input object ordering cannot invalidate representative evidence', () => {
  const state = tested(ready());
  const evidence = state.lab.evaluations.atlas.rights;
  evidence.inputs = Object.fromEntries(
    Object.entries(evidence.inputs).reverse()
  );
  expect(evaluationStatus(state.lab, 'atlas', 'rights')).toBe('pass');
  expect(evaluationComplete(state.lab, 'atlas')).toBe(true);
  const runtime = createNeonRuntime();
  runtime.importSave(
    JSON.stringify({ game: 'neon-covenant', version: 2, state })
  );
  expect(evaluationComplete(runtime.getSnapshot().lab, 'atlas')).toBe(true);
});

test('rules3 slot migration retains the exact original backup until reset without touching Mosslight', () => {
  const historical = ready();
  historical.lab.rulesVersion = 3;
  historical.lab.evaluated.atlas = 38;
  delete historical.lab.evaluations;
  delete historical.lab.testingBudget;
  const raw = JSON.stringify({
    game: 'neon-covenant',
    version: 2,
    slot: 1,
    state: historical,
  });
  const key = 'neon-covenant-saves-v2';
  const mossKey = 'mosslight-valley-saves-v2';
  let root = {
    [key]: { activeSlot: 1, slots: { 1: raw } },
    [mossKey]: { saved: 'untouched' },
  };
  const env = new Map([
    ['setLocalPermanentData', update => (root = { ...root, ...update })],
  ]);
  const runtime = createNeonRuntime(env);
  expect(runtime.getSnapshot().lab.rulesVersion).toBe(9);
  expect(root[key].migrationBackups[1]).toBe(raw);
  runtime.save();
  runtime.importSave(raw);
  runtime.save();
  expect(root[key].migrationBackups[1]).toBe(raw);
  expect(root[mossKey]).toEqual({ saved: 'untouched' });
  runtime.resetSave('confirmed-slot-reset');
  expect(root[key].migrationBackups[1]).toBeUndefined();
  expect(root[mossKey]).toEqual({ saved: 'untouched' });
});

test('training stales only checkpoint-specific calibration; unrelated work remains applicable', () => {
  let state = ready();
  state.lab.research.atlas = 20;
  state.lab.programs = createPrograms(state.lab);
  state = tested(state);
  const evidence = structuredClone(state.lab.evaluations.atlas);
  const settled = endShift(state);
  expect(settled.lab.testingBudget).toBe(6);
  expect(settled.lab.evaluations.atlas).toEqual(evidence);
  expect(evaluationStatus(settled.lab, 'atlas', 'reliability')).toBe('stale');
  expect(evaluationStatus(settled.lab, 'atlas', 'rights')).toBe('pass');
  expect(evaluationStatus(settled.lab, 'atlas', 'oversight')).toBe('pass');
  expect(evaluationComplete(settled.lab, 'atlas')).toBe(false);
  const refreshed = manageLab(settled, 'test:probe:reliability');
  expect(evaluationComplete(refreshed.lab, 'atlas')).toBe(true);
  expect(refreshed.lab.evaluated.atlas).toBe(refreshed.lab.research.atlas);
  expect(refreshed.lab.cash).toBe(settled.lab.cash - 2);
});

test.each([
  [
    'atlas',
    'reliability',
    state => {
      state.lab.research.atlas = 6;
    },
  ],
  [
    'atlas',
    'rights',
    state => {
      state.lab.data = 'scraped';
    },
  ],
  [
    'ghost',
    'oversight',
    state => {
      state.lab.programs.ghost.settings.specialization = 'autonomous';
    },
  ],
  [
    'lumen',
    'oversight',
    state => {
      state.lab.programs.lumen.settings.oversight = 'autonomous';
    },
  ],
])(
  '%s/%s findings require investigation, patch and retest with capacity constraints',
  (project, id, cause) => {
    let state = ready(project);
    cause(state);
    state.lab.programs = {
      ...createPrograms(state.lab),
      [project]: state.lab.programs[project],
    };
    const starting = state.lab.cash;
    state = manageLab(state, `test:probe:${id}`);
    expect(evaluationStatus(state.lab, project, id)).toBe('finding');
    expect(
      evaluationPages(state.lab, id)
        .map(page => page.text)
        .join(' ')
    ).toContain('Known unpatched result: finding');
    expect(manageLab(state, `test:fix:${id}`).lab).toEqual(state.lab);
    expect(manageLab(state, `test:probe:${id}`).lab).toEqual(state.lab);
    state = manageLab(state, `test:investigate:${id}`);
    expect(evaluationStatus(state.lab, project, id)).toBe('investigated');
    expect(manageLab(state, `test:investigate:${id}`).lab).toEqual(state.lab);
    state = manageLab(state, `test:fix:${id}`);
    expect(evaluationStatus(state.lab, project, id)).toBe('retest');
    expect(state.lab.cash).toBe(starting - 8);
    expect(state.lab.testingBudget).toBe(0);
    const exhausted = manageLab(state, `test:probe:${id}`);
    expect(exhausted.lab).toEqual(state.lab);
    expect(exhausted.toast).toContain('testing capacity');
    if (id === 'reliability') {
      state = manageLab(state, 'assign:ada:service');
      state = manageLab(state, 'assign:jun:service');
    }
    state = endShift(state);
    const retested = manageLab(state, `test:probe:${id}`);
    expect(evaluationStatus(retested.lab, project, id)).toBe('pass');
    expect(retested.lab.cash).toBe(state.lab.cash - 2);
    expect(validEvaluations(retested.lab)).toBe(true);
  }
);

test('relevant configuration changes invalidate fixes; another program and irrelevant hosting remain intact', () => {
  let state = tested(ready());
  const before = structuredClone(state.lab.evaluations);
  state = manageLab(state, 'configure:hosting:district');
  expect(evaluationComplete(state.lab, 'atlas')).toBe(true);
  expect(state.lab.evaluations).toEqual(before);
  state = manageLab(state, 'configure:size:compact');
  expect(evaluationStatus(state.lab, 'atlas', 'reliability')).toBe('stale');
  expect(evaluationStatus(state.lab, 'atlas', 'rights')).toBe('pass');
  expect(evaluationStatus(state.lab, 'atlas', 'oversight')).toBe('pass');
  const ghost = { ...state.lab, focus: 'ghost', testingBudget: 6 };
  expect(evaluationOrder(ghost, 'test:probe:rights')).toContain('pass');
  expect(evaluationStatus(ghost, 'atlas', 'rights')).toBe('pass');
  expect(
    evaluationPages(ghost, 'rights')
      .map(page => page.text)
      .join(' ')
  ).toContain('Recorded checkpoint: 64');
});

test('canonical commands, staff, checkpoint, money and attention reject without mutation', () => {
  for (const command of [
    'bad:probe:rights',
    'test:no:rights',
    'test:probe:constructor',
    'test:probe:unknown',
    'test:probe:rights:extra',
    'test:investigate:rights',
    'test:fix:rights',
  ]) {
    const state = ready();
    expect(manageLab(state, command).lab).toEqual(state.lab);
  }
  const lab = ready().lab;
  expect(evaluationOrder(lab, 'bad:probe:rights')).toContain('Unknown');
  for (const changes of [
    { cash: 0 },
    { teams: { research: 3, safety: 0, service: 1 } },
    { research: { atlas: 0, ghost: 64, lumen: 48 } },
    { decisions: 0 },
  ]) {
    const state = ready();
    Object.assign(state.lab, changes);
    expect(manageLab(state, 'test:probe:rights').lab).toEqual(state.lab);
  }
  expect(evaluationPages(createLab(), 'rights')[1].text).toContain('none');
});

test.each([{ cash: 5, debt: 190 }, { cash: 260, outcome: 'independent' }, {}])(
  'rules3 migration preserves all inherited fields and historical current signoffs: %p',
  changes => {
    const old = ready();
    old.lab = {
      ...old.lab,
      ...changes,
      rulesVersion: 3,
      evaluated: { atlas: 38, ghost: 20, lumen: 0 },
      deployed: ['atlas'],
    };
    delete old.lab.evaluations;
    delete old.lab.testingBudget;
    const original = structuredClone(old);
    const upgraded = migrateEvaluations(old);
    const { rulesVersion, evaluations, testingBudget, ...ledger } =
      upgraded.lab;
    const { rulesVersion: prior, ...oldLedger } = old.lab;
    expect(ledger).toEqual(oldLedger);
    expect(prior).toBe(3);
    expect(rulesVersion).toBe(4);
    expect(testingBudget).toBe(6);
    expect(evaluations.ghost.rights).toBeNull();
    expect(evaluationComplete(upgraded.lab, 'atlas')).toBe(true);
    expect(evaluationComplete(upgraded.lab, 'ghost')).toBe(false);
    expect(
      validLabSave(
        migrateCampaignAct(
          migrateContracts(
            migrateInfrastructure(
              migrateRelationships(migrateDeployments(upgraded))
            )
          )
        )
      )
    ).toBe(true);
    expect(old).toEqual(original);
    expect(migrateEvaluations(upgraded)).toBe(upgraded);
    const runtime = createNeonRuntime();
    runtime.importSave(
      JSON.stringify({ game: 'neon-covenant', version: 2, state: old })
    );
    const exported = runtime.exportSave();
    runtime.importSave(exported);
    expect(runtime.exportSave()).toBe(exported);
  }
);

test('malformed migrations are not repaired and malformed imports preserve the active campaign', () => {
  expect(migrateEvaluations({})).toEqual({});
  const old = ready();
  old.lab.rulesVersion = 3;
  old.lab.programs = null;
  expect(migrateEvaluations(old)).toBe(old);
  old.lab.programs = createPrograms(old.lab);
  old.lab.evaluated = null;
  expect(migrateEvaluations(old)).toBe(old);
  const runtime = createNeonRuntime();
  const snapshot = runtime.exportSave();
  const mutations = [
    lab => {
      lab.testingBudget = -1;
    },
    lab => {
      lab.testingBudget = 7;
    },
    lab => {
      lab.testingBudget = 1.5;
    },
    lab => {
      lab.evaluations = null;
    },
    lab => {
      delete lab.evaluations.atlas;
    },
    lab => {
      lab.evaluations.atlas = null;
    },
    lab => {
      delete lab.evaluations.atlas.rights;
    },
    lab => {
      lab.evaluations.atlas.rights = {};
    },
    lab => {
      lab.evaluations.atlas.rights = undefined;
    },
    lab => {
      lab.evaluations.atlas.rights.checkpoint = 0;
    },
    lab => {
      lab.evaluations.atlas.rights.checkpoint = 99;
    },
    lab => {
      lab.evaluations.atlas.rights.status = 'signed';
    },
    lab => {
      lab.evaluations.atlas.rights.inputs = null;
    },
    lab => {
      lab.evaluations.atlas.rights.inputs.extra = 'invented';
    },
    lab => {
      lab.evaluations.atlas.rights.inputs.data = 'stolen';
    },
    lab => {
      lab.evaluations.atlas.rights.inputs.specialization = 'constructor';
    },
    lab => {
      lab.evaluations.atlas.rights.inputs.specialization = 5;
    },
    lab => {
      lab.evaluations.atlas.reliability.inputs.progress = 3;
    },
    lab => {
      lab.evaluations.atlas.reliability.inputs.progress = NaN;
    },
  ];
  for (const mutate of mutations) {
    const state = tested(ready());
    mutate(state.lab);
    expect(validEvaluations(state.lab)).toBe(false);
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state })
      )
    ).toThrow();
    expect(runtime.exportSave()).toBe(snapshot);
  }
});

test('actual eight-button menus keep free case reading modal and persist tests without shift advancement', () => {
  let state = press(ready(), 'x');
  state = choose(state, 'page:incidents');
  const incidentView = structuredClone(state.lab);
  state = choose(state, 'page:tests');
  expect(state.lab).toEqual(incidentView);
  state = press(state, 'b');
  state = choose(state, 'page:research');
  state = choose(state, 'page:tests');
  expect(labMenuRows(state)).toHaveLength(7);
  state = choose(state, 'page:testcase:rights');
  const before = structuredClone(state.lab);
  state = choose(state, 'case:rights');
  expect(state.dialogue.actorId).toBe('sable');
  expect(state.lab).toEqual(before);
  expect(state.menu).toBeNull();
  state = press(state, 'b');
  state = press(state, 'x');
  state = choose(state, 'page:research');
  state = choose(state, 'page:tests');
  state = choose(state, 'page:testcase:rights');
  state = choose(state, 'test:probe:rights');
  expect(state.menu.page).toBe('testcase:rights');
  expect(labMenuRows(state).join(' ')).toContain('RIGHTS: pass');
  expect(labMenuRows(state)[3]).toContain('› Read case');
  expect(state.lab.cash).toBe(before.cash - 2);
  expect(state.lab.decisions).toBe(before.decisions - 1);
  expect(state.world.day).toBe(1);
  const runtime = createNeonRuntime();
  runtime.setState(state);
  runtime.importSave(runtime.exportSave());
  expect(runtime.getSnapshot().lab.evaluations).toEqual(state.lab.evaluations);
  expect(
    validLabSave({
      ...state,
      menu: { page: 'testcase:constructor', selected: 0 },
    })
  ).toBe(false);
  const exported = runtime.exportSave();
  expect(() =>
    runtime.importSave(
      JSON.stringify({
        game: 'neon-covenant',
        version: 2,
        state: {
          ...state,
          menu: { page: 'testcase:constructor', selected: 0 },
        },
      })
    )
  ).toThrow();
  expect(runtime.exportSave()).toBe(exported);
});
