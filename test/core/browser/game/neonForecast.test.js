import {
  createNeonState,
  stepNeon,
  renderNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import { createDeployments } from '../../../../src/core/browser/game/neon-covenant/operations.js';
import {
  endShift,
  manageLab,
} from '../../../../src/core/browser/game/neon-covenant/management.js';
import {
  forecastShift,
  compareOrder,
  forecastPages,
  comparisonPages,
} from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import { wrapDialogueText } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { createNeonRuntime } from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';

/**
 * Prepare a genuine current campaign with a controlled economic condition.
 * @param {object} overrides Ledger condition.
 * @param {number} day Explicit settlement date.
 * @returns {object} Independent current campaign.
 */
function fixture(overrides = {}, day = 1) {
  const state = createNeonState();
  const lab = { ...state.lab, cooling: 8, ...overrides };
  lab.deployments = createDeployments(lab);
  return {
    ...state,
    dialogue: null,
    lab,
    world: { ...state.world, day },
  };
}

/**
 * Select an actual menu row through an independent controller press.
 * @param {object} state Current campaign.
 * @param {string} page Named menu.
 * @param {string} command Actual row operation.
 * @returns {object} State after the controller selection.
 */
function choose(state, page, command) {
  const menuState = { ...state, menu: { page, selected: 0 }, lastActions: [] };
  const selected = labEntries(menuState).findIndex(
    ([, operation]) => operation === command
  );
  expect(selected).toBeGreaterThanOrEqual(0);
  return stepNeon({ ...menuState, menu: { page, selected } }, ['a']);
}

test.each([
  [{}, 1],
  [{ contracts: ['clinic'] }, 12],
  [{ contracts: ['clinic'], deployed: ['atlas'] }, 12],
  [{ contracts: ['clinic'], fulfilled: ['clinic'], deployed: ['atlas'] }, 13],
  [
    { risk: 80, scrutiny: 90, policy: 'sprint', data: 'scraped', cooling: 1 },
    8,
  ],
  [{ cash: 1 }, 7],
  [{ research: { atlas: 37, ghost: 0, lumen: 0 } }, 6],
  [{ research: { atlas: 38, ghost: 0, lumen: 0 } }, 10],
  [{ cash: 500, debt: 0, deployed: ['atlas'] }, 28],
  [{ cash: 500, outcome: 'independent' }, 29],
])(
  'preview equals actual settlement without changing the source: %p, shift %s',
  (changes, day) => {
    const state = fixture(changes, day);
    const original = structuredClone(state);
    const preview = forecastShift(state);
    const settled = endShift(state);
    expect(state).toEqual(original);
    expect(preview.closingCash).toBe(settled.lab.cash);
    expect(preview.cashChange).toBe(settled.lab.cash - state.lab.cash);
    expect(preview.researchGain).toBe(
      settled.lab.research[state.lab.focus] -
        state.lab.research[state.lab.focus]
    );
    expect(preview.closingRisk).toBe(settled.lab.risk);
    expect(preview.closingMorale).toBe(settled.lab.morale);
    expect(preview.closingTrust).toBe(settled.lab.trust);
    expect(preview.report).toEqual(settled.lab.report);
    expect(preview.outcome).toBe(settled.lab.outcome);
    for (const person of preview.employees) {
      expect(person.fatigue).toBe(
        settled.lab.employees.find(employee => employee.id === person.id)
          .fatigue
      );
    }
    expect(forecastShift(state)).toEqual(preview);
  }
);

test.each([
  [{ research: { atlas: 38, ghost: 0, lumen: 0 } }, 'checkpoint', 'Evaluate'],
  [
    { teams: { research: 0, safety: 2, service: 2 } },
    'staffing',
    'named employee',
  ],
  [{ cooling: 4 }, 'cooling', 'Repair cooling'],
  [{ compute: 4 }, 'compute', 'More racks'],
  [{ morale: 40 }, 'morale', 'recovery'],
  [{}, 'demand', 'Extra hardware alone'],
])('forecast names actionable constraint %s', (changes, kind, advice) => {
  const preview = forecastShift(fixture(changes));
  expect(preview.bottleneck.kind).toBe(kind);
  expect(preview.bottleneck.advice).toContain(advice);
});

test('comparisons expose order costs and reject hardware that cannot fix cooling', () => {
  const state = fixture({ cooling: 4 });
  const original = structuredClone(state);
  const compute = compareOrder(state, 'racks');
  expect(compute).toMatchObject({
    accepted: true,
    cost: 30,
    attention: 1,
    progressChange: 0,
    closingCashChange: -30,
  });
  const cooling = compareOrder(state, 'cooling');
  expect(cooling.progressChange).toBeGreaterThan(0);
  expect(cooling.after.closingCash).toBe(
    endShift(manageLab(state, 'cooling')).lab.cash
  );
  expect(state).toEqual(original);
  const poor = compareOrder(fixture({ cash: 0 }), 'racks');
  expect(poor).toMatchObject({
    accepted: false,
    cost: 0,
    attention: 0,
    progressChange: 0,
    closingCashChange: 0,
  });
  expect(
    comparisonPages(fixture({ cash: 0 }), 'racks')
      .map(page => page.text)
      .join(' ')
  ).toContain('NO ORDER COMMITTED');
  expect(compareOrder(fixture({ decisions: 0 }), 'cooling').accepted).toBe(
    false
  );
  expect(
    compareOrder(fixture({ outcome: 'independent' }), 'cooling').accepted
  ).toBe(false);
});

test('all warnings, deadline exposure and epilogues remain inside readable dialogue bounds', () => {
  const samples = [
    fixture(),
    endShift(fixture({ cooling: 1, policy: 'sprint' })),
    fixture({ contracts: ['clinic'] }, 12),
    fixture(
      {
        contracts: ['clinic'],
        deployed: ['atlas'],
        research: { atlas: 38, ghost: 0, lumen: 0 },
      },
      12
    ),
    fixture({ contracts: ['clinic'] }, 8),
    fixture({ cash: 1 }),
    fixture({ contracts: ['clinic'], expired: ['clinic'] }, 13),
  ];
  const prose = samples
    .flatMap(forecastPages)
    .map(page => page.text)
    .join(' ');
  expect(prose).toContain('20k incident remediation');
  expect(prose).toContain('deadline expires this shift');
  expect(prose).toContain('following settlement');
  expect(prose).toContain('4 shifts until');
  expect(prose).toContain('resolution at this settlement: insolvent');
  for (const page of [
    ...samples.flatMap(forecastPages),
    ...comparisonPages(fixture(), 'racks'),
  ]) {
    expect(wrapDialogueText(page.text).length).toBeLessThanOrEqual(6);
  }
  expect(
    forecastShift(fixture({ contracts: ['clinic'], expired: ['clinic'] }, 13))
      .deadlines
  ).toEqual([]);
});

test('training near or beyond a legacy target never invents progress or loses progress', () => {
  const near = endShift(
    fixture({ research: { atlas: 37, ghost: 0, lumen: 0 } })
  );
  expect(near.lab.report[0]).toContain('Research +1');
  const over = fixture({ research: { atlas: 45, ghost: 0, lumen: 0 } });
  expect(forecastShift(over).researchGain).toBe(0);
  expect(endShift(over).lab.research.atlas).toBe(45);
});

test('actual controller previews own input and cost no attention, money or time', () => {
  const state = fixture();
  const forecastMenu = choose(state, 'ledger', 'page:forecast');
  expect(labMenuRows(forecastMenu)).toHaveLength(7);
  expect(labMenuRows(forecastMenu).join(' ')).toContain('CLOSE 169k');
  const preview = choose(forecastMenu, 'forecast', 'preview-shift');
  expect(preview.dialogue.actorId).toBe('forecast');
  expect(preview.lab).toEqual(state.lab);
  expect(preview.world.day).toBe(1);
  const comparison = choose(
    choose(forecastMenu, 'forecast', 'page:comparisons'),
    'comparisons',
    'preview:cooling'
  );
  expect(comparison.dialogue.lines.map(line => line.text).join(' ')).toContain(
    'PREVIEW ONLY'
  );
  expect(comparison.lab).toEqual(state.lab);
  expect(stepNeon(stepNeon(comparison, []), ['b']).dialogue).toBeNull();
  const scrolled = {
    ...forecastMenu,
    menu: { page: 'comparisons', selected: 4 },
  };
  expect(labMenuRows(scrolled).join(' ')).toContain('› Back to forecast');
  expect(choose(forecastMenu, 'forecast', 'page:ledger').menu.page).toBe(
    'ledger'
  );
});

test('standalone runtime, embedded frame and save replay expose one deterministic forecast', () => {
  const runtime = createNeonRuntime();
  const expected = forecastShift(runtime.getSnapshot());
  expect(runtime.frame().presentation.forecast).toEqual(expected);
  expect(renderNeon(runtime.getSnapshot()).presentation.forecast).toEqual(
    expected
  );
  const saved = runtime.exportSave();
  runtime.importSave(saved);
  expect(runtime.frame().presentation.forecast).toEqual(expected);
  expect(runtime.exportSave()).toBe(saved);
});
