import { jest } from '@jest/globals';
import { createDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import {
  LAB_CONTENT,
  ART,
} from '../../../../src/core/browser/game/neon-covenant/content.js';
import {
  createLab,
  forecast,
  manageLab,
  endShift,
  labEnding,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  createNeonState,
  stepNeon,
  labJournal,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  createNeonRuntime,
  neonCovenant,
  startNeonPage,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import { createMosslightRuntime } from '../../../../src/core/browser/game/mosslight-valley/runtime.js';
import { drawGameFrame } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { generateBlogKey } from '../../../../src/core/browser/toys/2026-02-21/generateBlogKey.js';

/**
 * Make a world-ready campaign with optional ledger overrides.
 * @param {object} overrides Management fixture overrides.
 * @returns {object} Campaign fixture.
 */
function campaign(overrides = {}) {
  const lab = { ...createLab(), cooling: 8, ...overrides };
  lab.deployments = createDeployments(lab);
  return {
    ...createNeonState(),
    dialogue: null,
    lab,
  };
}

/**
 * Submit an independent press and release through the actual simulation.
 * @param {object} state Current campaign.
 * @param {string} button Eight-button input.
 * @returns {object} Campaign after the press.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}

/**
 * Select a visible operation through the real eight-button menus.
 * @param {object} state Current campaign with an open menu.
 * @param {string} operation Visible row operation.
 * @returns {object} Result after confirmation.
 */
function choose(state, operation) {
  const entries = labEntries(state);
  const index = entries.findIndex(([, command]) => command === operation);
  expect(index).toBeGreaterThanOrEqual(0);
  let next = state;
  while (next.menu.selected !== index) next = press(next, 'down');
  return press(next, 'a');
}

test('authored rooms have traversable, reversible marked exits and original 12px sprites', () => {
  for (const [id, map] of Object.entries(LAB_CONTENT.maps)) {
    for (const exit of map.exits) {
      expect(map.blocked).not.toContain(`${exit.x},${exit.y}`);
      expect(
        LAB_CONTENT.maps[exit.map].exits.some(reverse => reverse.map === id)
      ).toBe(true);
      expect(LAB_CONTENT.maps[exit.map].blocked).not.toContain(
        exit.to.join(',')
      );
    }
  }
  for (const art of Object.values(ART)) {
    expect(art).toHaveLength(12);
    expect(art.every(row => row.length === 12)).toBe(true);
  }
});

test('NEON1 comes from the canonical blog key generator and links both presenters', () => {
  const blog = JSON.parse(readFileSync('src/build/blog.json', 'utf8'));
  const post = blog.posts.find(
    item => item.toy?.functionName === 'neonCovenant'
  );
  const keys = blog.posts.filter(item => item !== post).map(item => item.key);
  expect(
    JSON.parse(
      generateBlogKey(JSON.stringify({ title: post.title, existingKeys: keys }))
    )
  ).toBe(post.key);
  expect(post.content[0]).toContain('/neon-covenant/');
  expect(post.toy.defaultInputMethod).toBe('mosslight-keypad');
});

test('forecast makes compute, heat, morale, policy, data and income legible', () => {
  const lab = { ...createLab(), cooling: 8 };
  expect(forecast(lab)).toEqual({
    demand: 6,
    available: 8,
    throughput: 6,
    progress: 7,
    payroll: 12,
    power: 3,
    hosting: 0,
    service: 4,
    income: 0,
    inferenceAvailable: 2,
    inferenceDemand: 0,
    supportCapacity: 4,
    supportDemand: 0,
    operations: {
      consulting: 4,
      income: 0,
      inferenceAvailable: 2,
      inferenceDemand: 0,
      inferenceUsed: 0,
      projects: [],
      supportCapacity: 4,
      supportDemand: 0,
    },
  });
  const strained = {
    ...lab,
    policy: 'sprint',
    data: 'scraped',
    cooling: 4,
    morale: 20,
    deployed: ['atlas'],
    contracts: ['clinic', 'transit'],
    fulfilled: ['clinic'],
  };
  strained.deployments = createDeployments(strained);
  expect(forecast(strained)).toMatchObject({
    demand: 12,
    throughput: 4,
    progress: 3,
    income: 0,
  });
  expect(forecast(strained).operations.projects[0]).toMatchObject({
    maximumRevenue: 23,
    reliability: 0,
  });
  expect(forecast({ ...lab, policy: 'careful' }).progress).toBe(6);
});

test.each([
  ['focus:lumen', 'focus', 'lumen'],
  ['policy:careful', 'policy', 'careful'],
  ['data:scraped', 'data', 'scraped'],
  ['racks', 'compute', 12],
  ['cooling', 'cooling', 12],
  ['rest', 'morale', 93],
  ['audit', 'trust', 50],
  ['repay', 'debt', 100],
  ['hire:tess', 'hired', 5],
])(
  'management operation %s commits one point and preserves its source ledger',
  (command, field, expected) => {
    const state = campaign();
    const original = structuredClone(state);
    const result = manageLab(state, command);
    expect(state).toEqual(original);
    expect(result.lab[field]).toBe(expected);
    expect(result.lab.decisions).toBe(5);
  }
);

test('failed orders, repeated agreements and exhausted points do not consume money or decisions', () => {
  const poor = campaign({ cash: 0 });
  expect(manageLab(poor, 'racks').lab).toEqual(poor.lab);
  expect(manageLab(poor, 'evaluate').lab).toEqual(poor.lab);
  expect(
    manageLab(
      campaign({ teams: { research: 4, safety: 0, service: 0 } }),
      'test:probe:rights'
    ).toast
  ).toContain('safety specialist');
  expect(
    manageLab(
      campaign({ teams: { research: 4, safety: 0, service: 0 } }),
      'team:research'
    ).toast
  ).toContain('No staff');
  expect(manageLab(campaign({ decisions: 0 }), 'cooling').toast).toContain(
    'End shift'
  );
  expect(
    manageLab(campaign({ outcome: 'independent' }), 'cooling').toast
  ).toContain('Campaign finished');
  expect(manageLab(poor, 'unknown').lab).toEqual(poor.lab);
  const signed = manageLab(campaign(), 'contract:clinic');
  expect(signed.lab.cash).toBe(208);
  expect(manageLab(signed, 'contract:clinic').lab).toEqual(signed.lab);
  const promised = manageLab(campaign(), 'promise:ada');
  expect(promised.lab.morale).toBe(81);
  expect(manageLab(promised, 'promise:ada').lab).toEqual(promised.lab);
  expect(manageLab(campaign(), 'assign:ada:service').lab.teams).toEqual({
    research: 1,
    safety: 1,
    service: 2,
  });
  expect(manageLab(campaign({ debt: 7 }), 'repay').lab).toMatchObject({
    cash: 173,
    debt: 0,
  });
});

test('latest checkpoint evaluation and safety threshold gate deployment', () => {
  let state = campaign();
  expect(manageLab(state, 'deploy').toast).toContain('target');
  for (let shift = 0; shift < 6; shift++) state = endShift(state);
  expect(state.lab.research.atlas).toBe(38);
  expect(manageLab(state, 'deploy').toast).toContain('evaluate');
  for (const id of ['reliability', 'rights', 'oversight'])
    state = manageLab(state, `test:probe:${id}`);
  expect(state.lab.evaluated.atlas).toBe(38);
  expect(
    manageLab({ ...state, lab: { ...state.lab, risk: 36 } }, 'deploy').toast
  ).toContain('risk');
  state = manageLab(state, 'deploy');
  expect(state.lab.deployed).toEqual(['atlas']);
  expect(manageLab(state, 'deploy').lab).toEqual(state.lab);
  expect(forecast(state.lab).income).toBe(3);
  expect(forecast(state.lab).operations.projects[0].maximumRevenue).toBe(16);
  const partial = manageLab(endShift(campaign()), 'test:probe:reliability');
  const trained = endShift(partial);
  expect(trained.lab.evaluated.atlas).toBeLessThan(trained.lab.research.atlas);
});

test('shifts account for payroll, power, deadlines, commitments and remediation', () => {
  const first = endShift(campaign());
  expect(first.lab.cash).toBe(169);
  expect(first.world.day).toBe(2);
  expect(first.lab.history[0]).toEqual({
    shift: 1,
    cash: 169,
    risk: 4,
    progress: 7,
  });
  let missed = campaign({ contracts: ['clinic'], cash: 100 });
  missed.world.day = 12;
  missed = endShift(missed);
  expect(missed.lab.expired).toEqual(['clinic']);
  expect(missed.lab.cash).toBe(75);
  expect(endShift(missed).lab.report.join(' ')).not.toContain('clawback');
  let release = campaign({
    contracts: ['clinic'],
    deployed: ['atlas'],
    research: { atlas: 38, ghost: 0, lumen: 0 },
  });
  for (const id of ['reliability', 'rights', 'oversight'])
    release = manageLab(release, `test:probe:${id}`);
  const delivered = endShift(release);
  expect(delivered.lab.fulfilled).toEqual(['clinic']);
  expect(endShift(delivered).lab.cash).toBeGreaterThan(delivered.lab.cash);
  const hot = endShift(
    campaign({
      focus: 'ghost',
      policy: 'sprint',
      data: 'scraped',
      cooling: 1,
      risk: 65,
      scrutiny: 85,
      promises: ['ada', 'ion', 'mae', 'sable'],
      contracts: ['helios'],
      deployed: ['atlas'],
    })
  );
  expect(hot.lab.incidents).toBe(0);
  expect(hot.lab.report.join(' ')).toContain('Ion:');
  expect(hot.lab.report.join(' ')).toContain('Ada refuses');
  expect(hot.lab.scrutiny).toBe(91);
  expect(
    endShift(
      campaign({
        teams: { research: 0, safety: 2, service: 2 },
        policy: 'careful',
      })
    ).lab.risk
  ).toBe(0);
  expect(endShift(campaign({ outcome: 'quiet-lab' }))).toEqual(
    campaign({ outcome: 'quiet-lab' })
  );
});

test.each([
  [{ cash: -1 }, 'insolvent'],
  [{ cash: 10 }, 'acquired'],
  [{ cash: 200, trust: 24 }, 'gilded-cage'],
  [{ cash: 200, incidents: 3 }, 'gilded-cage'],
  [
    { cash: 200, deployed: ['atlas', 'lumen'], trust: 70, promises: ['mae'] },
    'city-covenant',
  ],
  [{ cash: 200, deployed: ['atlas'] }, 'independent'],
  [{ cash: 200 }, 'quiet-lab'],
])('resolution reflects actual ledger %p', (overrides, expected) => {
  expect(labEnding({ ...createLab(), ...overrides })).toBe(expected);
});

test.each([
  'main',
  'research',
  'infrastructure',
  'rack',
  'contracts',
  'recruitment',
  'evaluation',
  'community',
  'saves',
  'reset',
  'assign',
  'report',
  'archive',
  'ledger',
  'board',
  'dashboard',
  'paused',
])('terminal %s has bounded readable actionable rows', page => {
  const state = { ...campaign(), menu: { page, selected: 0 } };
  expect(labEntries(state).length).toBeGreaterThan(0);
  expect(labMenuRows(state).length).toBeLessThanOrEqual(10);
  expect(labMenuRows(state).at(-1)).toContain('X CLOSE');
});

test('intro and modal menus own input, with no invisible conversation consuming A', () => {
  let state = createNeonState();
  expect(stepNeon(state).dialogue.index).toBe(0);
  state = press(state, 'x');
  const suspended = state.dialogue.index;
  state = choose(state, 'page:dashboard');
  expect(state.dialogue.index).toBe(suspended);
  state = press(state, 'x');
  expect(state.menu).toBeNull();
  state = press(state, 'a');
  expect(state.dialogue.index).toBe(suspended + 1);
  expect(stepNeon(state, ['a']).dialogue.index).toBe(state.dialogue.index);
  state = press(state, 'b');
  expect(state.dialogue).toBeNull();
  state = press(state, 'a');
  expect(state.menu.page).toBe('ledger');
  expect(choose(state, 'shift').world.day).toBe(2);
});

test('walking is collision-aware and costs nothing; all rooms are reachable', () => {
  let state = campaign();
  const original = structuredClone(state.lab);
  for (let i = 0; i < 6; i++) state = press(state, 'right');
  state = press(state, 'up');
  expect(state.world.mapId).toBe('compute');
  expect(state.lab).toEqual(original);
  expect(press(state, 'left').world.mapId).toBe('office');
  const waiting = stepNeon(campaign(), ['right'], LAB_CONTENT, 1);
  expect(stepNeon(waiting, ['right'], LAB_CONTENT, 1).world.player.x).toBe(
    waiting.world.player.x
  );
  expect(
    stepNeon(campaign(), ['START', 'SELECT', 'farm']).world.player
  ).toEqual(campaign().world.player);
});

test('staff conversations persist promises and let the director decline', () => {
  for (const actor of LAB_CONTENT.npcs) {
    let state = campaign();
    state.world.mapId = actor.map;
    state.world.map = LAB_CONTENT.maps[actor.map];
    state.world.player = {
      ...state.world.player,
      x: actor.x,
      y: actor.y + 1,
      facing: 'up',
    };
    state = press(state, 'a');
    expect(state.dialogue.actorId).toBe(actor.id);
    const declined = press(press(state, 'down'), 'a');
    expect(declined.lab.promises).toEqual([]);
    const wrapped = press(state, 'up');
    expect(wrapped.dialogue.selected).toBe(1);
    const accepted = press(state, 'a');
    expect(accepted.lab.promises).toContain(actor.id);
  }
});

test('eight-button menus expose assignment, reports, saves, reset and page utilities', () => {
  let state = press(campaign(), 'y');
  state = choose(state, 'bind:research');
  expect(state.quickAction).toBe('research');
  state = press(state, 'b');
  expect(state.menu.page).toBe('research');
  state = press(state, 'b');
  expect(state.menu.page).toBe('main');
  state = press(state, 'b');
  expect(state.menu).toBeNull();
  state = press(state, 'x');
  state = press(state, 'y');
  expect(state.menu.page).toBe('assign');
  state = press(state, 'b');
  state = press(state, 'left');
  expect(state.menu.selected).toBe(labEntries(state).length - 1);
  state = press(state, 'right');
  expect(state.menu.selected).toBe(0);
  expect(choose(state, 'close').menu).toBeNull();
  const base = press(campaign(), 'x');
  expect(choose(base, 'guide').dialogue.actorId).toBe('intro');
  for (const command of [
    'save',
    'slot:0',
    'slot:1',
    'slot:2',
    'export',
    'import',
  ]) {
    expect(choose(choose(base, 'page:saves'), command).controllerCommand).toBe(
      command
    );
  }
  const reset = choose(choose(base, 'page:saves'), 'page:reset');
  expect(choose(reset, 'close').controllerCommand).toBeNull();
  expect(choose(reset, 'reset').controllerCommand).toBe('reset');
  expect(choose(base, 'fullscreen').controllerCommand).toBe('fullscreen');
  const report = {
    ...choose(base, 'page:report'),
    lab: { ...base.lab, report: ['1', '2', '3', '4'] },
  };
  expect(choose(report, 'report-next').menu.reportPage).toBe(1);
  expect(
    choose(choose(report, 'report-next'), 'report-next').menu.reportPage
  ).toBe(0);
  expect(choose(choose(base, 'page:ledger'), 'repay').lab.debt).toBe(100);
  const absent = campaign();
  absent.world.player.facing = 'left';
  expect(press(absent, 'a').toast).toContain('Face a person');
  expect(labMenuRows(campaign())).toEqual([]);
  expect(labJournal(campaign())).toHaveLength(7);
});

test.each([
  'insolvent',
  'acquired',
  'gilded-cage',
  'city-covenant',
  'independent',
  'quiet-lab',
])('final shift presents readable %s epilogue', outcome => {
  const overrides = { cash: 1000, debt: 0, deployed: [], trust: 50 };
  if (outcome === 'insolvent') overrides.cash = -100;
  if (outcome === 'acquired') overrides.debt = 2000;
  if (outcome === 'gilded-cage') overrides.trust = 10;
  if (outcome === 'independent') overrides.deployed = ['atlas'];
  if (outcome === 'city-covenant')
    Object.assign(overrides, {
      deployed: ['atlas', 'lumen'],
      trust: 80,
      promises: ['mae'],
    });
  let state = campaign(overrides);
  state.world.day = 28;
  state = choose(choose(press(state, 'x'), 'page:ledger'), 'shift');
  expect(state.lab.outcome).toBe(outcome);
  expect(state.dialogue.lines[1].text.length).toBeGreaterThan(40);
});

test('lab saves are isolated from Mosslight and embedded key events use identical rules', () => {
  let data = {};
  const env = new Map([
    ['setLocalPermanentData', update => (data = { ...data, ...update })],
  ]);
  const moss = createMosslightRuntime(env);
  moss.start();
  moss.dispatch('right');
  const before = moss.exportSave();
  const lab = createNeonRuntime(env);
  lab.start();
  lab.dispatch('b');
  lab.dispatch({ actions: [] });
  lab.dispatch('a');
  const save = lab.exportSave();
  expect(JSON.parse(save).game).toBe('neon-covenant');
  expect(() => lab.importSave(before)).toThrow();
  expect(() => moss.importSave(save)).toThrow();
  expect(createMosslightRuntime(env).exportSave()).toBe(before);
  expect(
    JSON.parse(neonCovenant('{"type":"keyup","key":"a"}', env)).menu.page
  ).toBe('ledger');
  lab.importSave(save);
  expect(lab.getSnapshot().menu.page).toBe('ledger');
  lab.loadSlot(1);
  expect(lab.getSnapshot().dialogue.actorId).toBe('intro');
  lab.resetSave();
  expect(lab.getSnapshot().lab.cash).toBe(180);
  expect(JSON.parse(neonCovenant('bad json', new Map())).width).toBe(160);
  expect(
    JSON.parse(neonCovenant(`{"save":${JSON.stringify(save)}}`, env)).menu.page
  ).toBe('ledger');
  expect(
    JSON.parse(
      neonCovenant('{"reset":true,"confirmed":true,"resetId":"receipt"}', env)
    ).dialogue.actorId
  ).toBe('intro');
  expect(lab.isRunning()).toBe(true);
});

test('save contract rejects partial or nonnumeric ledgers before replacement', () => {
  const runtime = createNeonRuntime();
  const good = runtime.getSnapshot();
  expect(validLabSave(good)).toBe(true);
  const invalid = [
    s => {
      delete s.lab;
    },
    s => {
      s.world.mapId = 'missing';
    },
    s => {
      s.world.npcs = null;
    },
    s => {
      s.lastActions = null;
    },
    s => {
      s.world.flags = null;
    },
    s => {
      s.world.relationships = null;
    },
    s => {
      s.world.player.x = null;
    },
    s => {
      s.world.player.y = null;
    },
    s => {
      s.world.day = 1.5;
    },
    s => {
      s.world.day = 0;
    },
    s => {
      s.lab.cash = null;
    },
    s => {
      s.lab.policy = 'invalid';
    },
    s => {
      s.lab.data = 'invalid';
    },
    s => {
      s.lab.focus = 'missing';
    },
    s => {
      s.lab.focus = 42;
    },
    s => {
      s.lab.teams = null;
    },
    s => {
      s.lab.teams.safety = -1;
    },
    s => {
      s.lab.research = null;
    },
    s => {
      s.lab.evaluated = null;
    },
    s => {
      s.lab.deployed = null;
    },
    s => {
      s.lab.deployed = ['missing'];
    },
    s => {
      s.lab.contracts = ['missing'];
    },
    s => {
      s.dialogue.lines = null;
    },
    s => {
      s.dialogue.choices = null;
    },
    s => {
      s.menu = { page: 42, selected: 0 };
    },
    s => {
      s.menu = { page: 'main', selected: null };
    },
  ];
  for (const corrupt of invalid) {
    const state = structuredClone(good);
    corrupt(state);
    expect(validLabSave(state)).toBe(false);
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state })
      )
    ).toThrow();
    expect(runtime.getSnapshot()).toBe(good);
  }
  const noOverlay = campaign();
  expect(validLabSave(noOverlay)).toBe(true);
  expect(
    validLabSave({ ...noOverlay, menu: { page: 'main', selected: 0 } })
  ).toBe(true);
  const conversation = press(
    {
      ...noOverlay,
      world: {
        ...noOverlay.world,
        mapId: 'clinic',
        map: LAB_CONTENT.maps.clinic,
        player: { ...noOverlay.world.player, x: 4, y: 5 },
      },
    },
    'a'
  );
  expect(validLabSave(conversation)).toBe(true);
  const moreInvalid = [
    s => {
      s.world.flags.ending = 'gentle';
    },
    s => {
      s.world.player.x = -1;
    },
    s => {
      s.world.player.x = 13;
    },
    s => {
      s.world.player.y = -1;
    },
    s => {
      s.world.player.y = 9;
    },
    s => {
      s.world.player.facing = 'missing';
    },
    s => {
      s.lab.decisions = -1;
    },
    s => {
      s.lab.decisions = 7;
    },
    s => {
      s.menu = { page: 'main', selected: -1 };
    },
    s => {
      s.dialogue.lines = [null];
    },
    s => {
      s.dialogue.choices = [null];
    },
    s => {
      s.dialogue.choices = [{ label: 'Bad order', command: 'focus:missing' }];
    },
  ];
  for (const corrupt of moreInvalid) {
    const state = structuredClone(conversation);
    corrupt(state);
    expect(validLabSave(state)).toBe(false);
  }
  const envelope = JSON.parse(runtime.exportSave());
  envelope.state.world.map = null;
  envelope.state.presentation = { palette: null, menuRows: ['spoofed'] };
  runtime.importSave(JSON.stringify(envelope));
  expect(runtime.getSnapshot().world.map).toEqual(LAB_CONTENT.maps.office);
  expect(runtime.frame().palette).toEqual([
    '#111426',
    '#243344',
    '#52a7bc',
    '#f482ca',
  ]);
});

test('standalone page registers independent live agent tools, draws and disposes shared lifecycle', () => {
  const dom = new JSDOM(
    readFileSync('src/content/pages/neon-covenant/index.html', 'utf8'),
    { url: 'https://example.test/neon-covenant/' }
  );
  const { document } = dom.window;
  const context = {
    fillRect: jest.fn(),
    measureText: () => ({ width: 1 }),
    strokeRect: jest.fn(),
  };
  document.querySelector('canvas').getContext = () => context;
  const tools = new Map();
  document.modelContext = {
    registerTool: tool => tools.set(tool.name, tool),
    unregisterTool: name => tools.delete(name),
  };
  const callbacks = [];
  const cancelFrame = jest.fn();
  const dispose = startNeonPage({
    documentObj: document,
    windowObj: dom.window,
    navigatorObj: {},
    requestFrame: callback => (callbacks.push(callback), callbacks.length),
    cancelFrame,
  });
  expect([...tools.keys()]).toEqual([
    'neon_observe',
    'neon_act',
    'neon_export_save',
    'neon_import_save',
  ]);
  expect(context.fillRect).toHaveBeenCalled();
  const observe = () =>
    JSON.parse(tools.get('neon_observe').execute().content[0].text);
  expect(observe().state.lab.cash).toBe(180);
  tools.get('neon_act').execute({ actions: ['b', 'a'] });
  expect(observe().state.menu.page).toBe('ledger');
  const frame = createNeonRuntime().frame();
  drawGameFrame(context, frame);
  expect(context.imageSmoothingEnabled).toBe(false);
  callbacks[0](125);
  dispose();
  expect(tools.size).toBe(0);
  expect(cancelFrame).toHaveBeenCalled();
  dom.window.close();
});
