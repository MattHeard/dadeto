import { commonsToy } from '../../../../src/core/browser/game/the-commons-of-tomorrow/commonsToy.js';
import {
  createCommonsRuntime,
  restoreCommonsState,
  validCommonsState,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/runtime.js';
import { startCommonsPage } from '../../../../src/core/browser/game/the-commons-of-tomorrow/page.js';
import {
  drawCommonsFrame,
  renderCommons,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/renderer.js';
import {
  createCommonsState,
  stepCommons,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/simulation.js';

/**
 *
 */
/** @returns {{env: Map<string, Function>, read: () => Record<string, any>}} Storage fixtures. */
function storageEnv() {
  let data = {};
  const env = new Map([
    ['setLocalPermanentData', update => (data = { ...data, ...update })],
  ]);
  return { env, read: () => data };
}

describe('Commons runtime, frame and independent saves', () => {
  test('produces the same 160x144 world frame through runtime and toy adapter', () => {
    const { env } = storageEnv();
    const embedded = JSON.parse(
      commonsToy(JSON.stringify({ actions: ['right'] }), env)
    );
    const runtime = createCommonsRuntime(new Map());
    runtime.start();
    const standalone = runtime.dispatch('right');
    expect(embedded.type).toBe('the-commons-of-tomorrow');
    expect(embedded).toMatchObject({
      width: 160,
      height: 144,
      pixelated: true,
    });
    expect(embedded.world.player).toEqual(standalone.world.player);
    expect(embedded.world.mapId).toBe(standalone.world.mapId);
  });

  test('saves, loads, exports, and imports only the Commons save identity', () => {
    const { env, read } = storageEnv();
    const runtime = createCommonsRuntime({ env, slot: 1 });
    runtime.start();
    runtime.dispatch('right');
    runtime.save();
    const serialized = runtime.exportSave();
    expect(JSON.parse(serialized).game).toBe('the-commons-of-tomorrow');
    expect(runtime.getSlot()).toBe(1);
    expect(runtime.listSaves()).toContain(1);
    const restored = createCommonsRuntime({ env, slot: 1 });
    expect(restored.getSnapshot().world.player.x).toBe(
      runtime.getSnapshot().world.player.x
    );
    const parsed = JSON.parse(serialized);
    expect(validCommonsState(parsed.state)).toBe(true);
    expect(() =>
      runtime.importSave(
        JSON.stringify({ ...parsed, game: 'mosslight-valley' })
      )
    ).toThrow('Invalid The Commons of Tomorrow save data.');
    expect(runtime.getSnapshot().world.player.x).toBe(
      JSON.parse(read()['the-commons-of-tomorrow-saves-v1'].slots[1]).state
        .world.player.x
    );
  });

  test('rejects malformed puzzle and foreign-map state without accepting it', () => {
    const state = createCommonsState();
    expect(validCommonsState(state)).toBe(true);
    const completeRecords = {
      ...state,
      agreements: [
        {
          choice: 'restore-crossing',
          terms: 'A reviewed crossing.',
          valuesProtected: ['shared-belonging'],
        },
      ],
      charter: { id: 'restore-crossing', text: 'Recorded terms.' },
    };
    expect(validCommonsState(completeRecords)).toBe(true);
    expect(
      validCommonsState({
        ...state,
        agreements: [
          {
            choice: 'restore-crossing',
            terms: 'A reviewed crossing.',
            valuesProtected: 'not-an-array',
          },
        ],
      })
    ).toBe(false);
    expect(
      validCommonsState({
        ...state,
        world: { ...state.world, mapId: 'unknown' },
      })
    ).toBe(false);
    expect(
      validCommonsState({
        ...state,
        puzzle: {
          ...state.puzzle,
          fluid: { ...state.puzzle.fluid, volume: [2] },
        },
      })
    ).toBe(false);
    expect(validCommonsState({ ...state, evidence: ['invented'] })).toBe(false);
    expect(validCommonsState({ world: {} })).toBe(false);
    expect(validCommonsState({ ...state, agreements: undefined })).toBe(false);
    expect(
      validCommonsState({
        ...state,
        puzzle: { ...state.puzzle, route: 'ocean' },
      })
    ).toBe(false);
    expect(
      validCommonsState({ ...state, world: { ...state.world, player: {} } })
    ).toBe(false);
    for (const invalid of [
      { ...state, inventory: [] },
      { ...state, evidence: undefined },
      { ...state, practices: undefined },
      { ...state, journal: undefined },
      { ...state, puzzle: undefined },
      { ...state, puzzle: { ...state.puzzle, fluid: undefined } },
      {
        ...state,
        puzzle: {
          ...state.puzzle,
          fluid: { ...state.puzzle.fluid, solids: [true] },
        },
      },
      {
        ...state,
        puzzle: {
          ...state.puzzle,
          fluid: { ...state.puzzle.fluid, volume: [2, ...Array(19).fill(0)] },
        },
      },
      { ...state, agreements: [{ choice: 'unknown', terms: 'x' }] },
      { ...state, agreements: [{ choice: 'restore-crossing', terms: 'x' }] },
      { ...state, practices: ['unknown'] },
      { ...state, charter: { id: 'unknown', text: 'x' } },
      { ...state, mode: 'battle' },
    ])
      expect(validCommonsState(invalid)).toBe(false);
    expect(restoreCommonsState(state).world.map).toBe(state.world.map);
  });

  test('runs fixed lifecycle methods and mounts the page with Commons settings', () => {
    const runtime = createCommonsRuntime();
    expect(runtime.isRunning()).toBe(false);
    runtime.start();
    expect(runtime.isRunning()).toBe(true);
    runtime.pause();
    expect(runtime.isRunning()).toBe(false);
    runtime.resume();
    runtime.step(250, ['right']);
    expect(runtime.getSnapshot().world.player.x).toBe(7);
    expect(runtime.getJournal()[0].status).toBe('active');
    runtime.setState(createCommonsState());
    expect(runtime.getSnapshot().world.player.x).toBe(6);
    expect(runtime.resetSave()).toMatchObject({
      type: 'the-commons-of-tomorrow',
    });

    const listeners = {};
    const element = () => ({
      value: '',
      textContent: '',
      files: [],
      dataset: {},
      addEventListener(type, callback) {
        (this.listeners ||= {})[type] = callback;
      },
      removeEventListener() {},
      click() {},
      getContext: () => ({ fillRect() {}, fillText() {}, strokeRect() {} }),
    });
    const selectors = Object.fromEntries(
      [
        '#game-screen',
        '#game-status',
        '#save-slot',
        '#import-game',
        '#save-game',
        '#reset-game',
        '#export-game',
        '#import-button',
        '#pause-game',
        '#resume-game',
        '#fullscreen-game',
      ].map(selector => [selector, element()])
    );
    const documentObj = {
      hidden: false,
      querySelector: selector => selectors[selector],
      querySelectorAll: () => [],
      addEventListener(type, callback) {
        listeners[`document:${type}`] = callback;
      },
      removeEventListener() {},
      documentElement: { requestFullscreen: () => Promise.resolve() },
    };
    const windowObj = {
      localStorage: { getItem: () => null, setItem() {} },
      confirm: () => false,
      addEventListener(type, callback) {
        listeners[`window:${type}`] = callback;
      },
      removeEventListener() {},
    };
    const dispose = startCommonsPage({
      documentObj,
      windowObj,
      navigatorObj: { getGamepads: () => [] },
      requestFrame: callback => ((listeners.frame = callback), 1),
      cancelFrame() {},
      registerTools: () => () => {},
    });
    expect(typeof dispose).toBe('function');
    expect(typeof listeners.frame).toBe('function');
    expect(selectors['#game-status'].textContent).toContain('Canopy Commons');
    dispose();
  });

  test('rejects a malformed Commons envelope and exposes slot and reset lifecycle', () => {
    const runtime = createCommonsRuntime(new Map());
    runtime.start();
    const envelope = JSON.parse(runtime.exportSave());
    expect(() =>
      runtime.importSave(JSON.stringify({ ...envelope, state: { world: {} } }))
    ).toThrow('Invalid The Commons of Tomorrow save data.');
    runtime.loadSlot(2);
    expect(runtime.getSlot()).toBe(2);
    runtime.resetSave('reset-once');
    const state = runtime.getSnapshot();
    runtime.resetSave('reset-once');
    expect(runtime.getSnapshot()).toEqual(state);
    expect(runtime.frame().type).toBe('the-commons-of-tomorrow');
  });

  test('renders a fixed-step puzzle overlay and dedicated frame painter draws its shapes', () => {
    const state = { ...createCommonsState(), mode: 'puzzle' };
    const frame = renderCommons(state);
    expect(
      frame.shapes.some(shape => shape.text === 'ROUTE WATER TO THE INLET')
    ).toBe(true);
    expect(frame.shapes.some(shape => shape.text === '12')).toBe(true);
    expect(
      frame.shapes.some(shape => shape.text === 'NEXT: B SWITCH TO COMMONS')
    ).toBe(true);
    const boardText = frame.shapes.filter(shape => shape.type === 'text');
    expect(
      boardText.every(
        shape => shape.x >= 0 && shape.x + shape.text.length * 5 <= 160
      )
    ).toBe(true);
    expect(boardText.map(shape => shape.y)).toContain(131);
    expect(boardText.map(shape => shape.y)).toContain(140);
    const calls = [];
    drawCommonsFrame(
      {
        set imageSmoothingEnabled(value) {
          calls.push(['smoothing', value]);
        },
        set fillStyle(value) {
          this.fill = value;
        },
        fillRect(x, y, width, height) {
          calls.push(['rect', x, y, width, height, this.fill]);
        },
        set font(value) {
          this.currentFont = value;
        },
        fillText(value, x, y) {
          calls.push(['text', value, x, y]);
        },
      },
      frame
    );
    expect(calls.some(entry => entry[0] === 'rect')).toBe(true);
    const solved = renderCommons({
      ...state,
      puzzle: {
        ...state.puzzle,
        completed: true,
        gateOpen: true,
        selectedCell: 13,
      },
    });
    expect(
      solved.shapes.some(shape => shape.text === 'WATER INLET REACHED')
    ).toBe(true);
    expect(solved.shapes.some(shape => shape.text === 'O')).toBe(true);
  });

  test('uses the shared world renderer outside the puzzle overlay', () => {
    const frame = renderCommons(createCommonsState());
    expect(frame.shapes.length).toBeGreaterThan(0);
    expect(frame.commons).toMatchObject({
      evidence: [],
      agreements: [],
      practices: [],
    });
    const calls = [];
    const context = {
      set imageSmoothingEnabled(value) {
        calls.push(value);
      },
      set fillStyle(value) {
        this.fill = value;
      },
      fillRect(x, y, width, height) {
        calls.push([x, y, width, height, this.fill]);
      },
      set font(value) {
        this.currentFont = value;
      },
      fillText(value, x, y) {
        calls.push([value, x, y]);
      },
    };
    expect(() => drawCommonsFrame(context, frame)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
    const artShape = frame.shapes.find(
      shape => shape.type === 'rect' && shape.fill === frame.palette[0]
    );
    expect(artShape).toBeDefined();
    expect(calls).toContainEqual([
      artShape.x,
      artShape.y,
      artShape.width,
      artShape.height,
      artShape.fill,
    ]);
    const outcomes = [
      { seasonalClosure: true },
      { bridgeOpen: true },
      { footbridgeStabilized: true },
      { marshRestored: true },
    ].map(flags =>
      renderCommons({
        ...createCommonsState(),
        world: { ...createCommonsState().world, flags },
      })
    );
    expect(outcomes.map(frame => frame.presentation.status)).toEqual([
      'SEASONAL PACT · REVIEW AT HIGH WATER',
      'CROSSING OPEN · MARSH LIMITS SET',
      'HANDRAIL STABILIZED · CROSSING STILL CLOSED',
      'MARSH RESTORED · GATHERING MOVED',
    ]);
    expect(
      renderCommons({
        ...createCommonsState(),
        agreements: [{ choice: 'restore-crossing', terms: 'Recorded.' }],
      }).presentation.status
    ).toBe('AGREEMENT RECORDED · VISIT THE CHARTER TABLE');
    const closedBoard = renderCommons({
      ...createCommonsState(),
      mode: 'puzzle',
    });
    expect(
      closedBoard.shapes.some(shape => shape.text?.includes('GATE CLOSED'))
    ).toBe(true);
    const openBoard = renderCommons({
      ...createCommonsState(),
      mode: 'puzzle',
      puzzle: { ...createCommonsState().puzzle, gateOpen: true },
    });
    expect(
      openBoard.shapes.some(shape => shape.text?.includes('GATE OPEN'))
    ).toBe(true);
  });

  test('renders the Commons journal as one opaque overlay without the HUD', () => {
    const state = {
      ...createCommonsState(),
      menu: { page: 'journal', selected: 0 },
    };
    const frame = renderCommons(state);
    expect(frame.shapes.some(shape => shape.text === 'JOURNAL')).toBe(true);
    expect(
      frame.shapes.some(shape => shape.text?.startsWith('active: The River'))
    ).toBe(true);
    const hud = frame.shapes.filter(shape => shape.y >= 108);
    expect(hud).toHaveLength(0);
    expect(
      frame.shapes.filter(shape => shape.text).every(shape => shape.y < 108)
    ).toBe(true);
    const panel = frame.shapes.filter(
      shape => shape.type === 'rect' && shape.x === 5 && shape.y === 5
    );
    expect(panel).toHaveLength(1);
    const calls = [];
    drawCommonsFrame(
      {
        set imageSmoothingEnabled(value) {
          calls.push(['smoothing', value]);
        },
        set fillStyle(value) {
          this.fill = value;
        },
        fillRect(x, y, width, height) {
          calls.push(['rect', x, y, width, height, this.fill]);
        },
        set font(value) {
          this.currentFont = value;
        },
        fillText(value, x, y) {
          calls.push(['text', value, x, y]);
        },
      },
      frame
    );
    expect(
      calls.filter(call => call[0] === 'rect' && call[1] === 5 && call[2] === 5)
    ).toHaveLength(1);
  });

  test('renders the Charter page and June dialogue without hidden menus or clipped text', () => {
    const initial = createCommonsState();
    const charter = renderCommons({
      ...initial,
      menu: { page: 'charter', selected: 0 },
    });
    const charterText = charter.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);
    expect(charterText).toContain('CHARTER');
    expect(charterText.join(' ')).toContain('No agreement recorded yet.');
    expect(charterText.join(' ')).not.toContain(
      'active: The River Keeps Its Own Time'
    );

    const nearbyJune = {
      ...initial,
      world: {
        ...initial.world,
        player: { x: 6, y: 7, facing: 'up' },
      },
    };
    const dialogue = stepCommons(nearbyJune, ['a']);
    const dialogueFrame = renderCommons(dialogue);
    const rows = dialogueFrame.shapes.filter(
      shape => shape.type === 'text' && shape.y < 108
    );
    expect(rows.map(shape => shape.text).join(' ')).toContain('June Sol');
    expect(rows.every(shape => shape.text.length <= 28)).toBe(true);
    expect(Math.max(...rows.map(shape => shape.y))).toBeLessThan(108);

    const actions = renderCommons({
      ...initial,
      menu: { page: 'actions', selected: 4 },
    });
    const actionText = actions.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);
    expect(actionText).toContain('ACTIONS · PERFORM NOW');
    expect(actionText).toContain('A DO · B BACK · X CLOSE');
    expect(actionText.some(row => row.startsWith('> A · Reset'))).toBe(true);

    const assign = renderCommons({
      ...initial,
      menu: { page: 'assign', selected: 1 },
    });
    const assignText = assign.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);
    expect(assignText).toContain('ASSIGN AN ACTION TO B');
    expect(assignText).toContain('A SET · B BACK · X CLOSE');
    expect(assignText.some(row => row.startsWith('> Repair Weir'))).toBe(true);
  });
});
