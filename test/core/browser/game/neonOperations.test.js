import {
  DEPLOYMENT_PROFILES,
  OPERATING_RULES,
} from '../../../../src/core/browser/game/neon-covenant/operationsContent.js';
import {
  createDeployments,
  launchDeployment,
  deploymentForecast,
  deploymentDelivers,
  settleDeployments,
  deploymentOrder,
  validDeployments,
  migrateDeployments,
  deploymentPages,
} from '../../../../src/core/browser/game/neon-covenant/operations.js';
import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  createLab,
  manageLab,
  forecast,
  endShift,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import { createPrograms } from '../../../../src/core/browser/game/neon-covenant/research.js';
import { migrateInfrastructure } from '../../../../src/core/browser/game/neon-covenant/infrastructure.js';
import { migrateEvaluations } from '../../../../src/core/browser/game/neon-covenant/evaluation.js';
import { migrateRelationships } from '../../../../src/core/browser/game/neon-covenant/relationships.js';
import {
  forecastShift,
  compareOrder,
} from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  validLabSave,
  createNeonRuntime,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';

/**
 * Reconstruct a genuinely signed-off historical service under the new rules.
 * @param {string[]} deployed Existing release identities.
 * @param {object} changes Controlled starting operating conditions.
 * @returns {object} Rules-five campaign with trusted evidence and program records.
 */
function active(deployed = ['atlas'], changes = {}) {
  const state = createNeonState();
  state.dialogue = null;
  Object.assign(state.lab, {
    rulesVersion: 3,
    deployed,
    cooling: 12,
    compute: 12,
    cash: 900,
    research: { atlas: 38, ghost: 64, lumen: 48 },
    evaluated: { atlas: 38, ghost: 64, lumen: 48 },
    ...changes,
  });
  state.lab.programs = createPrograms(state.lab);
  return migrateDeployments(migrateEvaluations(state));
}

/**
 * Press and release one real controller button.
 * @param {object} state Campaign.
 * @param {string} button Eight-button input.
 * @returns {object} Result.
 */
function press(state, button) {
  return stepNeon(stepNeon(state, []), [button]);
}

/**
 * Navigate real menu rows without injecting management operations.
 * @param {object} state Open menu.
 * @param {string} command Visible operation.
 * @returns {object} Confirmed campaign.
 */
function choose(state, command) {
  const index = labEntries(state).findIndex(
    ([, operation]) => operation === command
  );
  expect(index).toBeGreaterThanOrEqual(0);
  while (state.menu.selected !== index) state = press(state, 'down');
  return press(state, 'a');
}

test('idle labs retain opening costs and independent unopened service records', () => {
  const lab = createLab();
  expect(validDeployments(lab)).toBe(true);
  const records = createDeployments(lab);
  records.atlas.maintenance = 20;
  expect(lab.deployments.atlas.maintenance).toBe(100);
  const flow = deploymentForecast(lab);
  expect(flow.projects).toEqual([]);
  expect(flow.consulting).toBe(4);
  expect(flow.income).toBe(0);
  expect(forecast(lab).power).toBe(2);
  expect(deploymentDelivers(flow, 'atlas')).toBe(false);
  expect(
    deploymentPages(lab, 4)
      .map(page => page.text)
      .join(' ')
  ).toContain('0 inference units requested');
});

test.each(Object.keys(DEPLOYMENT_PROFILES))(
  '%s launches with a real cohort, grows only after settlement and never exceeds contracted maxima',
  id => {
    const state = active([id]);
    launchDeployment(state.lab, id);
    const original = structuredClone(state);
    const projected = forecastShift(state);
    const row = projected.operations.projects[0];
    expect(row.adoption).toBe(DEPLOYMENT_PROFILES[id].start);
    expect(row.users).toBe(
      (DEPLOYMENT_PROFILES[id].users * row.adoption) / 100
    );
    expect(row.revenue).toBeLessThan(row.maximumRevenue);
    expect(row.bottleneck.kind).toBe('adoption');
    const next = endShift(state);
    expect(next.lab.cash).toBe(projected.closingCash);
    expect(next.lab.deployments).toEqual(projected.deployments);
    expect(next.lab.deployments[id].adoption).toBe(
      row.adoption + DEPLOYMENT_PROFILES[id].growth
    );
    expect(state).toEqual(original);
    for (let shift = 0; shift < 5; shift++) {
      const f = deploymentForecast(state.lab);
      settleDeployments(state.lab, f, []);
      expect(f.projects[0].revenue).toBeLessThanOrEqual(
        f.projects[0].maximumRevenue
      );
    }
  }
);

test('shared inference and support allocation is proportional and counts consulting time once', () => {
  const state = active(['atlas', 'ghost', 'lumen']);
  const all = deploymentForecast(state.lab);
  expect(all.inferenceDemand).toBe(12);
  expect(all.supportDemand).toBe(9);
  expect(all.supportCapacity).toBe(4);
  expect(all.consulting).toBe(0);
  expect(
    all.projects.every(
      row => row.reliability === 44 && row.bottleneck.kind === 'support'
    )
  ).toBe(true);
  const staffed = manageLab(
    manageLab(state, 'assign:ada:service'),
    'assign:jun:service'
  );
  const full = deploymentForecast(staffed.lab);
  expect(
    full.projects.every(
      row => row.reliability === 100 && row.bottleneck.kind === 'none'
    )
  ).toBe(true);
  expect(full.income).toBe(66);
  expect(full.consulting).toBe(3);
  staffed.lab.cooling = 6;
  const limited = deploymentForecast(staffed.lab);
  expect(
    limited.projects.every(
      row => row.reliability === 50 && row.bottleneck.kind === 'inference'
    )
  ).toBe(true);
  expect(limited.inferenceUsed).toBe(6);
  expect(limited.income).toBeLessThan(full.income);
  expect(deploymentDelivers(limited, 'atlas')).toBe(false);
  const original = structuredClone(staffed);
  const preview = forecastShift(staffed);
  expect(preview.bottleneck.kind).toBe('inference');
  expect(endShift(staffed).lab.cash).toBe(preview.closingCash);
  expect(staffed).toEqual(original);
});

test('training competes with services until complete and hardware/configuration comparisons explain exact invoices', () => {
  const state = active();
  state.lab.focus = 'ghost';
  state.lab.research.ghost = 0;
  state.lab.programs = createPrograms(state.lab);
  const competing = forecast(state.lab);
  expect(competing.throughput).toBe(10);
  expect(competing.inferenceAvailable).toBe(2);
  expect(competing.operations.projects[0].bottleneck.kind).toBe('inference');
  const physical = active();
  physical.lab.compute = 2;
  physical.lab.cooling = 2;
  expect(
    compareOrder(physical, 'cooling').after.operations.projects[0].revenue
  ).toBe(10);
  expect(
    compareOrder(physical, 'racks').after.operations.projects[0].revenue
  ).toBe(10);
  const configured = manageLab(physical, 'configure:size:compact');
  expect(forecast(configured.lab).inferenceDemand).toBe(3);
  const hosted = manageLab(physical, 'configure:hosting:edge');
  expect(forecast(hosted.lab).inferenceDemand).toBe(2);
  expect(forecast(hosted.lab).operations.projects[0].revenue).toBe(16);
  expect(forecast(hosted.lab).hosting).toBe(2);
  expect(forecast(active().lab).throughput).toBe(0);
});

test('queues and maintenance affect real users; paid recovery never invents a release or advances time', () => {
  let state = active();
  state.lab.deployments.atlas.maintenance = 30;
  state.lab.deployments.atlas.backlog = 20;
  const worn = deploymentForecast(state.lab);
  expect(worn.projects[0].bottleneck.kind).toBe('maintenance');
  expect(worn.projects[0].reliability).toBe(50);
  const declining = endShift(state);
  expect(declining.lab.deployments.atlas.adoption).toBe(90);
  expect(declining.lab.deployments.atlas.maintenance).toBe(26);
  const before = structuredClone(state);
  state = manageLab(state, 'service:maintain:atlas');
  expect(state.lab.cash).toBe(before.lab.cash - 6);
  expect(state.lab.decisions).toBe(5);
  expect(state.lab.deployments.atlas.maintenance).toBe(100);
  expect(state.world.day).toBe(before.world.day);
  expect(forecastShift(state).bottleneck.kind).toBe('support');
  const queue = state.lab.deployments.atlas.backlog;
  const preview = compareOrder(state, 'service:triage:atlas');
  state = manageLab(state, 'service:triage:atlas');
  expect(state.lab.deployments.atlas.backlog).toBe(queue - 12);
  expect(state.lab.cash).toBe(before.lab.cash - 10);
  expect(state.lab.decisions).toBe(4);
  expect(preview.after.closingCash).toBe(endShift(state).lab.cash);
  expect(before.lab.deployments.atlas.backlog).toBe(20);
});

test('resource-free and abandoned services cannot grow users from idle zero-demand ratios', () => {
  const state = active(['atlas']);
  state.lab.deployments.atlas.adoption = 0;
  state.lab.compute = 0;
  state.lab.teams.service = 0;
  const f = deploymentForecast(state.lab);
  expect(f.consulting).toBe(0);
  expect(f.projects[0].reliability).toBe(0);
  settleDeployments(state.lab, f, []);
  expect(state.lab.deployments.atlas.adoption).toBe(0);
  state.lab.deployments.atlas.maintenance = 1;
  state.lab.deployments.atlas.backlog = OPERATING_RULES.backlogLimit;
  state.lab.deployments.atlas.adoption = 100;
  settleDeployments(state.lab, deploymentForecast(state.lab), []);
  expect(state.lab.deployments.atlas.maintenance).toBe(0);
  expect(state.lab.deployments.atlas.backlog).toBe(30);
});

test('contract delivery requires operating adoption and reliability, and paid daily terms are caps', () => {
  const state = active();
  state.lab.contracts = ['clinic'];
  launchDeployment(state.lab, 'atlas');
  expect(deploymentDelivers(deploymentForecast(state.lab), 'atlas')).toBe(true);
  const first = endShift(state);
  expect(first.lab.fulfilled).toEqual(['clinic']);
  expect(first.lab.report.join(' ')).toContain('3k of 16k maximum');
  expect(forecast(first.lab).operations.projects[0]).toMatchObject({
    maximumRevenue: 23,
    adoption: 40,
    revenue: 9,
  });
  const ghost = active(['ghost']);
  launchDeployment(ghost.lab, 'ghost');
  expect(deploymentDelivers(deploymentForecast(ghost.lab), 'ghost')).toBe(
    false
  );
  const deadline = active();
  deadline.lab.contracts = ['clinic'];
  deadline.world.day = 12;
  deadline.lab.cooling = 0;
  const preview = forecastShift(deadline);
  expect(preview.deadlines[0].missed).toBe(true);
  expect(endShift(deadline).lab.cash).toBe(preview.closingCash);
});

test('rejected and no-op service orders charge neither credits nor attention', () => {
  for (const command of [
    'bad:maintain:atlas',
    'service:wrong:atlas',
    'service:maintain:constructor',
    'service:triage:atlas:extra',
    'service:maintain:ghost',
    'service:maintain:atlas',
    'service:triage:atlas',
  ]) {
    const state = active();
    expect(manageLab(state, command).lab).toEqual(state.lab);
  }
  const poor = active(['atlas'], { cash: 0 });
  poor.lab.deployments.atlas.maintenance = 20;
  expect(manageLab(poor, 'service:maintain:atlas').lab).toEqual(poor.lab);
  const none = active(['atlas'], { decisions: 0 });
  none.lab.deployments.atlas.maintenance = 20;
  expect(manageLab(none, 'service:maintain:atlas').lab).toEqual(none.lab);
  const queued = active();
  queued.lab.deployments.atlas.backlog = 5;
  expect(deploymentOrder(queued.lab, 'service:triage:atlas')).toContain(
    'completed'
  );
  expect(queued.lab.deployments.atlas.backlog).toBe(0);
});

test.each([{ cash: 5, debt: 200 }, { outcome: 'independent', cash: 240 }, {}])(
  'rules4 migration preserves every historical field and deterministic export/import: %p',
  changes => {
    const old = active(['atlas', 'lumen']);
    Object.assign(old.lab, changes, { rulesVersion: 4 });
    delete old.lab.deployments;
    old.world.day = 13;
    const original = structuredClone(old);
    const migrated = migrateDeployments(old);
    const { rulesVersion, deployments, ...ledger } = migrated.lab;
    const { rulesVersion: prior, ...oldLedger } = old.lab;
    expect(prior).toBe(4);
    expect(rulesVersion).toBe(5);
    expect(ledger).toEqual(oldLedger);
    expect(deployments.atlas).toEqual({
      adoption: 100,
      maintenance: 100,
      backlog: 0,
    });
    expect(deployments.ghost.adoption).toBe(0);
    expect(
      validLabSave(migrateInfrastructure(migrateRelationships(migrated)))
    ).toBe(true);
    expect(old).toEqual(original);
    expect(migrateDeployments(migrated)).toBe(migrated);
    const runtime = createNeonRuntime();
    runtime.importSave(
      JSON.stringify({ game: 'neon-covenant', version: 2, state: old })
    );
    const exported = runtime.exportSave();
    runtime.importSave(exported);
    expect(runtime.exportSave()).toBe(exported);
    expect(forecastShift(runtime.getSnapshot())).toEqual(
      forecastShift(migrated)
    );
  }
);

test('corrupt current operating records and invalid old candidates cannot replace a campaign', () => {
  expect(migrateDeployments({})).toEqual({});
  for (const changes of [
    { programs: null },
    { evaluations: null },
    { deployed: null },
    { deployed: ['constructor'] },
    { deployed: ['atlas', 'atlas'] },
  ]) {
    const state = active();
    Object.assign(state.lab, changes, { rulesVersion: 4 });
    expect(migrateDeployments(state)).toBe(state);
  }
  const runtime = createNeonRuntime();
  const unchanged = runtime.exportSave();
  for (const mutate of [
    lab => {
      lab.deployments = null;
    },
    lab => {
      delete lab.deployments.atlas;
    },
    lab => {
      lab.deployments.atlas = null;
    },
    lab => {
      lab.deployments.atlas.adoption = -1;
    },
    lab => {
      lab.deployments.atlas.adoption = 101;
    },
    lab => {
      lab.deployments.atlas.adoption = 2.5;
    },
    lab => {
      lab.deployments.atlas.maintenance = 101;
    },
    lab => {
      lab.deployments.atlas.backlog = 31;
    },
    lab => {
      lab.deployments.ghost.adoption = 1;
    },
    lab => {
      lab.deployments.ghost.maintenance = 50;
    },
    lab => {
      lab.deployments.ghost.backlog = 2;
    },
    lab => {
      lab.deployed.push('atlas');
    },
    lab => {
      lab.deployed = [5];
    },
  ]) {
    const state = active();
    mutate(state.lab);
    expect(validDeployments(state.lab)).toBe(false);
    expect(() =>
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state })
      )
    ).toThrow();
    expect(runtime.exportSave()).toBe(unchanged);
  }
});

test('actual controller operations keep inspection free and repairs paid, readable and modal', () => {
  let state = active();
  state.lab.deployments.atlas.maintenance = 40;
  state = press(state, 'x');
  state = choose(state, 'page:operations');
  expect(labMenuRows(state)).toHaveLength(7);
  state = choose(state, 'page:deployment:atlas');
  const before = structuredClone(state.lab);
  expect(labMenuRows(state).join(' ')).toContain('HEALTH 40%');
  state = choose(state, 'operations-story');
  expect(state.lab).toEqual(before);
  expect(state.menu).toBeNull();
  expect(state.dialogue.actorId).toBe('ion');
  state = press(state, 'b');
  state = press(state, 'x');
  state = choose(state, 'page:operations');
  state = choose(state, 'page:deployment:atlas');
  state = choose(state, 'service:maintain:atlas');
  expect(state.menu.page).toBe('deployment:atlas');
  expect(state.lab.cash).toBe(before.cash - 6);
  expect(state.lab.deployments.atlas.maintenance).toBe(100);
  expect(state.world.day).toBe(1);
  const runtime = createNeonRuntime();
  runtime.setState(state);
  runtime.importSave(runtime.exportSave());
  expect(runtime.getSnapshot().lab.deployments).toEqual(state.lab.deployments);
  const bad = {
    ...state,
    menu: { page: 'deployment:constructor', selected: 0 },
  };
  expect(validLabSave(bad)).toBe(false);
});

/**
 * Earn a release from the opening using ordinary menus and paid evaluation.
 * @param {string} route Local or district configuration.
 * @returns {object} Actual progressed campaign, not an injected checkpoint.
 */
function launchCampaign(route) {
  let state = press(createNeonState(), 'b');
  state = choose(press(state, 'x'), 'page:orientation');
  state = choose(
    state,
    route === 'district' ? 'lesson:clinic' : 'lesson:decline'
  );
  state = choose(
    state,
    route === 'district' ? 'lesson:decline' : 'lesson:cooling'
  );
  state = press(state, 'x');
  if (route === 'district') {
    state = choose(press(state, 'x'), 'page:research');
    state = choose(choose(state, 'page:program'), 'page:setting:hosting');
    state = choose(state, 'setting:hosting:district');
    while (!state.dialogue.choices.length) state = press(state, 'a');
    state = press(state, 'a');
  }
  for (let shift = 0; shift < 6; shift++) {
    state = choose(press(state, 'x'), 'page:ledger');
    state = press(choose(state, 'shift'), 'x');
  }
  state = choose(press(state, 'x'), 'page:research');
  state = choose(state, 'page:tests');
  for (const id of ['reliability', 'rights', 'oversight']) {
    state = choose(state, `page:testcase:${id}`);
    state = choose(choose(state, `test:probe:${id}`), 'page:tests');
  }
  state = choose(press(state, 'b'), 'page:research');
  return choose(state, 'deploy');
}

test.each([
  ['local', 135, 2],
  ['migrated', 164, 2],
  ['district', 175, 1],
])(
  'a real %s controller campaign pays for sustainable service',
  (route, cash, repairs) => {
    let state = launchCampaign(route);
    if (route === 'migrated') {
      const historical = structuredClone(state);
      historical.lab.rulesVersion = 1;
      for (const key of [
        'programs',
        'evaluations',
        'testingBudget',
        'incidentChains',
        'incidentGrace',
        'lastIncidentCost',
        'deployments',
      ])
        delete historical.lab[key];
      const runtime = createNeonRuntime();
      runtime.importSave(
        JSON.stringify({ game: 'neon-covenant', version: 2, state: historical })
      );
      state = runtime.getSnapshot();
      expect(state.lab.cash).toBe(historical.lab.cash);
      expect(state.world.day).toBe(historical.world.day);
    }
    let maintained = 0;
    for (let shift = 6; shift < 28; shift++) {
      state = press(state, 'x');
      if (state.lab.deployments.atlas.maintenance <= 64) {
        state = choose(
          choose(state, 'page:operations'),
          'page:deployment:atlas'
        );
        const before = structuredClone(state);
        state = choose(state, 'service:maintain:atlas');
        expect(state.lab.cash).toBe(before.lab.cash - 6);
        expect(state.lab.decisions).toBe(before.lab.decisions - 1);
        expect(state.world.day).toBe(before.world.day);
        maintained++;
        state = press(state, 'b');
      }
      state = choose(state, 'page:ledger');
      const prediction = forecastShift(state);
      state = choose(state, 'shift');
      expect(state.lab.cash).toBe(prediction.closingCash);
      if (!state.lab.outcome) state = press(state, 'x');
    }
    expect(maintained).toBe(repairs);
    expect(state.lab).toMatchObject({
      cash,
      debt: 120,
      outcome: 'independent',
      incidents: 0,
    });
    expect(state.lab.deployments.atlas.adoption).toBe(100);
    expect(validLabSave(state)).toBe(true);
  }
);
