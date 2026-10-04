import {
  createNeonState,
  stepNeon,
} from '../../../../src/core/browser/game/neon-covenant/simulation.js';
import {
  labEntries,
  labMenuRows,
} from '../../../../src/core/browser/game/neon-covenant/controls.js';
import {
  orientationStage,
  orientationOrder,
} from '../../../../src/core/browser/game/neon-covenant/orientation.js';
import {
  forecastShift,
  labReportLines,
} from '../../../../src/core/browser/game/neon-covenant/forecast.js';
import {
  createNeonRuntime,
  validLabSave,
} from '../../../../src/core/browser/game/neon-covenant/neonCovenant.js';

/**
 * Submit a distinct controller press without held-button repeats.
 * @param {object} state Current campaign.
 * @param {string} key One of the eight buttons.
 * @returns {object} Actual simulation result.
 */
function tap(state, key) {
  return stepNeon(stepNeon(state, []), [key]);
}

/**
 * Enter the guide through the player's actual lab menu.
 * @param {object} state Current campaign.
 * @returns {object} Campaign with the curriculum open.
 */
function guide(state) {
  let next = tap(state, 'x');
  if (!next.menu) next = tap(next, 'x');
  while (labEntries(next)[next.menu.selected][1] !== 'page:orientation')
    next = tap(next, 'down');
  return tap(next, 'a');
}

/**
 * Choose a real visible row, never dispatch an unrestricted management operation.
 * @param {object} state Open menu.
 * @param {string} command Desired authored choice.
 * @returns {object} Result of the actual A button.
 */
function choose(state, command) {
  let next = state;
  expect(labEntries(next).some(([, value]) => value === command)).toBe(true);
  while (labEntries(next)[next.menu.selected][1] !== command)
    next = tap(next, 'down');
  return tap(next, 'a');
}

test.each([true, false])(
  'first shift uses real accounting with cooling repaired: %s',
  repair => {
    let state = createNeonState();
    expect(state.lab).toMatchObject({
      cash: 180,
      debt: 120,
      compute: 8,
      cooling: 4,
    });
    expect(forecastShift(state).researchGain).toBe(5);
    state = guide(tap(state, 'b'));
    const initial = structuredClone(state.lab);
    state = choose(state, 'lesson:terms');
    const terms = state.dialogue.lines.map(line => line.text).join(' ');
    expect(terms).toContain('28k advance');
    expect(terms).toContain('14k clawback');
    expect(state.lab).toEqual(initial);
    state = choose(guide(tap(state, 'b')), 'lesson:clinic');
    expect(state.lab).toMatchObject({
      cash: 208,
      decisions: 5,
      contracts: ['clinic'],
      firstShiftGuide: 1,
    });
    const beforeComparison = structuredClone(state.lab);
    state = choose(state, 'lesson:forecast');
    expect(state.dialogue.lines.map(line => line.text).join(' ')).toContain(
      'from 5 to 7'
    );
    expect(state.lab).toEqual(beforeComparison);
    state = choose(
      guide(tap(state, 'b')),
      repair ? 'lesson:cooling' : 'lesson:decline'
    );
    expect(state.lab.cooling).toBe(repair ? 8 : 4);
    expect(state.lab.cash).toBe(repair ? 188 : 208);
    expect(state.lab.decisions).toBe(repair ? 4 : 5);
    state = choose(state, 'page:recruitment');
    expect(
      labEntries(state)
        .map(([label]) => label)
        .join(' ')
    ).toContain('Jun / research');
    state = choose(guide(state), 'lesson:decline');
    state = choose(state, 'lesson:forecast');
    expect(state.lab.firstShiftGuide).toBe(4);
    const projected = forecastShift(state);
    state = choose(guide(tap(state, 'b')), 'shift');
    expect(state.world.day).toBe(2);
    expect(state.lab.cash).toBe(projected.closingCash);
    expect(state.lab.research.atlas).toBe(repair ? 7 : 5);
    expect(state.lab.deployed).toEqual([]);
    expect(state.lab.evaluated.atlas).toBe(0);
    expect(orientationStage(state)).toBe(5);
    expect(labMenuRows(guide(state)).join(' ')).toContain(
      'NO RELEASE WITHOUT TESTS'
    );
  }
);

test('the introduction offers the playable guide and the player may decline the clinic', () => {
  let state = createNeonState();
  while (!state.dialogue.choices.length) state = tap(state, 'a');
  expect(validLabSave(state)).toBe(true);
  state = tap(state, 'a');
  expect(state.menu.page).toBe('orientation');
  state = choose(state, 'lesson:decline');
  expect(state.lab.contracts).toEqual([]);
  expect(state.lab.cash).toBe(180);
  expect(state.lab.decisions).toBe(6);
  expect(state.lab.firstShiftGuide).toBe(1);
});

test('rejected repairs do not advance the curriculum or consume money or attention', () => {
  const state = createNeonState();
  state.lab.firstShiftGuide = 1;
  for (const condition of [
    { cash: 2 },
    { decisions: 0 },
    { outcome: 'quiet-lab' },
  ]) {
    const blocked = { ...state, lab: { ...state.lab, ...condition } };
    const next = orientationOrder(blocked, 'lesson:cooling');
    expect(next.lab).toEqual(blocked.lab);
    expect(orientationStage(next)).toBe(1);
  }
});

test('older saves are not forced into the new curriculum and invalid lesson indices are rejected', () => {
  const state = createNeonState();
  delete state.lab.firstShiftGuide;
  expect(orientationStage(state)).toBe(5);
  expect(validLabSave(state)).toBe(true);
  for (const value of [-1, 5, 1.5, '2', null])
    expect(
      validLabSave({ ...state, lab: { ...state.lab, firstShiftGuide: value } })
    ).toBe(false);
});

test('each lesson is bounded and repeated inspection at settlement is free', () => {
  const state = createNeonState();
  for (let index = 0; index < 5; index++) {
    const lesson = {
      ...state,
      lab: { ...state.lab, firstShiftGuide: index },
      menu: { page: 'orientation', selected: 1 },
    };
    const rows = labMenuRows(lesson);
    expect(rows).toHaveLength(7);
    expect(rows.every(row => row.length <= 28)).toBe(true);
    expect(rows[4]).toMatch(/^>/);
  }
  state.lab.firstShiftGuide = 4;
  const inspected = choose(guide(tap(state, 'b')), 'lesson:forecast');
  expect(inspected.lab).toEqual(state.lab);
  expect(inspected.world.day).toBe(1);
});

test('the first-shift guide survives export and import with its actual balance', () => {
  const runtime = createNeonRuntime();
  const state = choose(guide(tap(createNeonState(), 'b')), 'lesson:clinic');
  const envelope = JSON.parse(runtime.exportSave());
  envelope.state = state;
  runtime.importSave(JSON.stringify(envelope));
  const restored = runtime.getSnapshot();
  expect(restored.lab).toEqual(state.lab);
  expect(orientationStage(restored)).toBe(1);
  expect(forecastShift(restored)).toEqual(forecastShift(state));
});

test('settlement explanations wrap and paginate without clipping away financial details', () => {
  let state = createNeonState();
  state = choose(guide(tap(state, 'b')), 'lesson:decline');
  state = choose(state, 'lesson:decline');
  state = choose(state, 'lesson:decline');
  state = choose(state, 'lesson:forecast');
  state = choose(guide(tap(state, 'b')), 'shift');
  const wrapped = labReportLines(state.lab.report);
  expect(wrapped.every(row => row.length <= 28)).toBe(true);
  expect(wrapped.join(' ')).toBe(state.lab.report.join(' '));
  const visible = [];
  for (let page = 0; page < Math.ceil(wrapped.length / 3); page++) {
    const rows = labMenuRows(state);
    visible.push(...rows.slice(1, 1 + Math.min(3, wrapped.length - page * 3)));
    state = choose(state, 'report-next');
  }
  expect(visible).toEqual(wrapped);
  expect(state.menu.reportPage).toBe(0);
});
