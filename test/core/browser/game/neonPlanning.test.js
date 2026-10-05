import {
  applyPlanningOrder,
  clearPlanningOrders,
  createPlanning,
  migratePlanning,
  undoPlanningOrder,
  validPlanning,
} from '../../../../src/core/browser/game/neon-covenant/planning.js';
import {
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
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import {
  createPrograms,
  researchOptions,
} from '../../../../src/core/browser/game/neon-covenant/research.js';
import { serializeSave } from '../../../../src/core/browser/game/mosslight-valley/save.js';

/**
 * Create a campaign with presentation overlays closed for direct controller use.
 * @param {Record<string, any>} [changes] Optional ledger changes.
 * @returns {Record<string, any>} Current world and lab state.
 */
function readyState(changes = {}) {
  const state = createNeonState();
  return {
    ...state,
    dialogue: null,
    menu: null,
    lab: { ...state.lab, ...changes },
  };
}

test('new games start with an empty bounded planning ledger and a discoverable desk', () => {
  const state = readyState();
  expect(createPlanning()).toEqual({ orders: [] });
  expect(state.lab.rulesVersion).toBe(11);
  expect(validPlanning(state.lab)).toBe(true);
  state.menu = { page: 'main', selected: 0 };
  expect(labEntries(state)).toContainEqual([
    'Planning Desk / undo drafts',
    'page:planning',
  ]);
  state.menu = { page: 'planning', selected: 0 };
  expect(labEntries(state)).toEqual([
    ['Undo latest / 0', 'plan:undo'],
    ['Clear draft / 0', 'plan:clear'],
    ['Back to lab', 'page:main'],
  ]);
  expect(labMenuRows(state)).toEqual(
    expect.arrayContaining([
      'DRAFT 0/6 / ASSIGN, PROGRAM, INFRA',
      'UNDO RETURNS PRICE AND 1 AP',
      'SHIFT / CONTRACT / PROMISE / DATA ARE FINAL',
    ])
  );
});

test('assignment undo refunds attention and preserves an interleaved permanent purchase', () => {
  let state = menuCommand(readyState(), 'assign:ada:service');
  expect(state.lab.teams).toEqual({ research: 1, safety: 1, service: 2 });
  expect(state.lab.planning.orders).toEqual([
    { kind: 'assignment', employee: 'ada', from: 'research', to: 'service' },
  ]);
  state = manageLab(state, 'rest');
  expect(state.lab.cash).toBe(172);
  const undone = menuCommand(state, 'plan:undo');
  expect(undone.lab.teams).toEqual({ research: 2, safety: 1, service: 1 });
  expect(undone.lab.cash).toBe(172);
  expect(undone.lab.morale).toBe(93);
  expect(undone.lab.decisions).toBe(5);
  expect(undone.lab.planning.orders).toEqual([]);
  expect(validPlanning(undone.lab)).toBe(true);
});

test('the eight-button controller stages an assignment and reaches undo through the Planning Desk', () => {
  let state = readyState();
  state.menu = { page: 'employee:ada', selected: 0 };
  state = stepNeon(stepNeon(state, []), ['down']);
  state = stepNeon(stepNeon(state, []), ['down']);
  state = stepNeon(stepNeon(state, []), ['a']);
  expect(state.lab.employees[0].role).toBe('service');
  expect(state.lab.planning.orders).toHaveLength(1);
  state.menu = { page: 'main', selected: 0 };
  state = stepNeon(stepNeon(state, []), ['down']);
  state = stepNeon(stepNeon(state, []), ['down']);
  state = stepNeon(stepNeon(state, []), ['a']);
  expect(state.menu.page).toBe('planning');
  state = stepNeon(stepNeon(state, []), ['a']);
  expect(state.lab.employees[0].role).toBe('research');
  expect(state.lab.planning.orders).toEqual([]);
  expect(state.lab.decisions).toBe(6);
});

test('research settings undo restores the setting and exact paid cost in LIFO order', () => {
  let state = readyState({ evaluated: { atlas: 19, ghost: 0, lumen: 0 } });
  state = menuCommand(state, 'configure:size:compact');
  state = menuCommand(state, 'configure:size:frontier');
  expect(state.lab.cash).toBe(156);
  expect(state.lab.planning.orders).toEqual([
    expect.objectContaining({
      kind: 'configuration',
      from: 'standard',
      to: 'compact',
    }),
    expect.objectContaining({
      kind: 'configuration',
      from: 'compact',
      to: 'frontier',
    }),
  ]);
  state = undoPlanningOrder(state);
  expect(state.lab.programs.atlas.settings.size).toBe('compact');
  expect(state.lab.cash).toBe(174);
  state = undoPlanningOrder(state);
  expect(state.lab.programs.atlas.settings.size).toBe('standard');
  expect(state.lab.evaluated.atlas).toBe(19);
  expect(state.lab.cash).toBe(180);
  expect(state.lab.decisions).toBe(6);
});

test('configuration undo does not overwrite later evaluation changes', () => {
  let state = readyState({ evaluated: { atlas: 14, ghost: 0, lumen: 0 } });
  state = menuCommand(state, 'configure:size:frontier');
  state.lab.evaluated.atlas = 3;
  state = undoPlanningOrder(state);
  expect(state.lab.programs.atlas.settings.size).toBe('standard');
  expect(state.lab.evaluated.atlas).toBe(3);
});

test('infrastructure undo reverses only its equipment deltas and refunds the authored price', () => {
  let state = menuCommand(readyState(), 'infra:backupPower');
  expect(state.lab.cash).toBe(164);
  expect(state.lab.infrastructure.backupPower).toBe(1);
  state.lab.compute += 2;
  state.lab.cooling += 1;
  state = menuCommand(state, 'plan:undo');
  expect(state.lab.cash).toBe(180);
  expect(state.lab.infrastructure.backupPower).toBe(0);
  expect(state.lab.compute).toBe(10);
  expect(state.lab.cooling).toBe(5);
  expect(state.lab.decisions).toBe(6);
});

test('rejected, unaffordable, unchanged and unrelated actions never enter the draft', () => {
  const base = readyState();
  expect(undoPlanningOrder(base).toast).toContain('No draft order');
  const unchanged = menuCommand(base, 'assign:ada:research');
  expect(unchanged.lab.planning.orders).toEqual([]);
  expect(unchanged.lab.decisions).toBe(6);
  const poor = menuCommand(readyState({ cash: 1 }), 'configure:size:frontier');
  expect(poor.lab.cash).toBe(1);
  expect(poor.lab.decisions).toBe(6);
  expect(poor.lab.planning.orders).toEqual([]);
  const invalid = menuCommand(base, 'infra:missing');
  expect(invalid.lab.planning.orders).toEqual([]);
  expect(
    menuCommand(base, 'assign:missing:service').lab.planning.orders
  ).toEqual([]);
  expect(menuCommand(base, 'assign:ada:unknown').lab.planning.orders).toEqual(
    []
  );
  expect(
    menuCommand(base, 'configure:size:standard').lab.planning.orders
  ).toEqual([]);
  const committed = menuCommand(base, 'promise:ada');
  expect(committed.lab.planning.orders).toEqual([]);
  expect(menuCommand(base, 'plan:unknown').toast).toContain(
    'Unknown Planning Desk'
  );
  const clearedFromController = menuCommand(
    menuCommand(base, 'assign:ada:service'),
    'plan:clear'
  );
  expect(clearedFromController.lab.employees[0].role).toBe('research');
  expect(clearedFromController.lab.planning.orders).toEqual([]);
  const fallback = applyPlanningOrder(base, 'unknown-operation', manageLab);
  expect(fallback.lab.planning.orders).toEqual([]);
});

test('clearing a plan rolls back all drafts but leaves unrelated actions and limits attention', () => {
  let state = menuCommand(readyState(), 'assign:ada:service');
  state = menuCommand(state, 'infra:backupPower');
  state = manageLab(state, 'rest');
  state.lab.decisions = 0;
  state = clearPlanningOrders(state);
  expect(state.lab.cash).toBe(172);
  expect(state.lab.teams).toEqual({ research: 2, safety: 1, service: 1 });
  expect(state.lab.infrastructure.backupPower).toBe(0);
  expect(state.lab.decisions).toBe(2);
  expect(state.lab.planning.orders).toEqual([]);
  expect(clearPlanningOrders(state).toast).toContain('draft is empty');
});

test('failed or forged planning history is rejected without changing the campaign', () => {
  const state = menuCommand(readyState(), 'assign:ada:service');
  const badEntries = [
    null,
    { kind: 'unknown' },
    { ...state.lab.planning.orders[0], extra: true },
    { ...state.lab.planning.orders[0], to: 'research' },
    { ...state.lab.planning.orders[0], from: 'unknown' },
  ];
  for (const entry of badEntries)
    expect(validPlanning({ ...state.lab, planning: { orders: [entry] } })).toBe(
      false
    );
  expect(
    validPlanning({
      ...state.lab,
      planning: { orders: Array(7).fill(state.lab.planning.orders[0]) },
    })
  ).toBe(false);
  expect(
    validPlanning({ ...state.lab, planning: { orders: [], extra: true } })
  ).toBe(false);
  expect(validPlanning({ ...state.lab, programs: null })).toBe(false);
  expect(validPlanning({ ...state.lab, infrastructure: null })).toBe(false);
  expect(validPlanning({ ...state.lab, employees: null })).toBe(false);
  expect(validPlanning({ ...readyState().lab, programs: null })).toBe(true);
  const unchanged = undoPlanningOrder({
    ...state,
    lab: { ...state.lab, planning: { orders: [{ kind: 'unknown' }] } },
  });
  expect(unchanged.lab.planning.orders).toEqual([{ kind: 'unknown' }]);
  expect(unchanged.toast).toContain('invalid');
  const cleared = clearPlanningOrders({
    ...state,
    lab: { ...state.lab, planning: { orders: [{ kind: 'unknown' }] } },
  });
  expect(cleared.lab.planning.orders).toEqual([{ kind: 'unknown' }]);
  expect(cleared.toast).toContain('invalid');
});

test('configuration and infrastructure inverses reject stale target values and bad references', () => {
  const changed = menuCommand(readyState(), 'configure:size:compact');
  const inverse = changed.lab.planning.orders[0];
  expect(
    validPlanning({
      ...changed.lab,
      planning: { orders: [{ ...inverse, project: 'unknown' }] },
    })
  ).toBe(false);
  expect(
    validPlanning({
      ...changed.lab,
      planning: { orders: [{ ...inverse, axis: 'unknown' }] },
    })
  ).toBe(false);
  expect(
    validPlanning({
      ...changed.lab,
      planning: { orders: [{ ...inverse, to: 'standard' }] },
    })
  ).toBe(false);
  const missingProgram = structuredClone(changed.lab);
  delete missingProgram.programs.atlas;
  expect(validPlanning(missingProgram)).toBe(false);
  const installed = menuCommand(readyState(), 'infra:backupPower');
  const infraInverse = installed.lab.planning.orders[0];
  expect(
    validPlanning({
      ...installed.lab,
      planning: { orders: [{ ...infraInverse, id: 'unknown' }] },
    })
  ).toBe(false);
  expect(
    validPlanning({
      ...installed.lab,
      planning: { orders: [{ ...infraInverse, countBefore: 1 }] },
    })
  ).toBe(false);
  expect(Object.keys(researchOptions('atlas', 'size'))).toEqual([
    'standard',
    'compact',
    'frontier',
  ]);
});

test('settlement clears undo history and the ledger advertises its irreversible boundary', () => {
  const state = menuCommand(readyState(), 'infra:backupPower');
  const ended = endShift(state);
  expect(ended.lab.planning.orders).toEqual([]);
  expect(ended.world.day).toBe(2);
  const ledger = { ...state, menu: { page: 'ledger', selected: 0 } };
  expect(labMenuRows(ledger)).toEqual(
    expect.arrayContaining([
      'SETTLEMENT IS PERMANENT',
      'ALL DRAFT UNDO EXPIRES',
    ])
  );
  expect(labEntries(ledger)[0][0]).toContain('permanent');
});

test('legacy rules-ten saves receive an empty rules-eleven planning record', () => {
  const state = readyState({
    cash: 73,
    debt: 40,
    research: { atlas: 9, ghost: 2, lumen: 0 },
  });
  state.lab.programs = createPrograms(state.lab);
  state.lab.rulesVersion = 10;
  delete state.lab.planning;
  const upgraded = migratePlanning(state);
  expect(upgraded.lab).toMatchObject({
    rulesVersion: 11,
    planning: { orders: [] },
    cash: 73,
    debt: 40,
    research: { atlas: 9, ghost: 2, lumen: 0 },
  });
  expect(validLabSave(upgraded)).toBe(true);
  expect(migratePlanning(upgraded)).toBe(upgraded);
  expect(migratePlanning({ lab: { rulesVersion: 9 } })).toEqual({
    lab: { rulesVersion: 9 },
  });
});

test('data disclosure asks first and remains outside the reversible order stack', () => {
  let state = readyState();
  state = menuCommand(state, 'data:scraped');
  expect(state.lab.data).toBe('licensed');
  expect(state.dialogue.lines[0].text).toContain('permanent disclosure');
  expect(state.dialogue.choices[0].label).toContain('permanent');
  state = menuCommand({ ...state, dialogue: null }, 'disclose:scraped');
  expect(state.lab.data).toBe('scraped');
  expect(state.lab.planning.orders).toEqual([]);
  const forged = menuCommand(readyState(), 'data:scraped');
  forged.lab.data = 'scraped';
  expect(validLabSave(forged)).toBe(false);
});

test('malformed undo history cannot replace the active imported save', () => {
  const runtime = createNeonRuntime();
  runtime.start();
  const before = runtime.getSnapshot();
  const envelope = JSON.parse(runtime.exportSave());
  envelope.state.lab.planning.orders = [
    {
      kind: 'assignment',
      employee: 'ada',
      from: 'research',
      to: 'service',
      extra: true,
    },
  ];
  expect(() => runtime.importSave(JSON.stringify(envelope))).toThrow();
  expect(runtime.getSnapshot()).toBe(before);
});

test('pending undo history survives save export and import', () => {
  const staged = menuCommand(readyState(), 'infra:backupPower');
  const serialized = serializeSave(staged, 0, 'neon-covenant');
  const first = createNeonRuntime();
  first.start();
  first.importSave(serialized);
  const second = createNeonRuntime();
  second.importSave(first.exportSave());
  expect(second.getSnapshot().lab).toEqual(first.getSnapshot().lab);
  expect(second.getSnapshot().world).toEqual(first.getSnapshot().world);
  expect(second.getSnapshot().lab.planning.orders).toHaveLength(1);
});
