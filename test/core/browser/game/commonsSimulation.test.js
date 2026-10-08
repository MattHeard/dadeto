import {
  choosePractice,
  chooseRiverAgreement,
  commonsJournal,
  createCommonsState,
  menuItems,
  stepCommons,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/simulation.js';
import { COMMONS_CONTENT } from '../../../../src/core/browser/game/the-commons-of-tomorrow/content.js';

describe('Commons story simulation', () => {
  test('creates a no-alignment state and moves through connected districts', () => {
    const state = createCommonsState();
    expect(state.world.relationships).toEqual({});
    expect(state.world.mapId).toBe('commons');
    const moved = stepCommons(state, ['right']);
    expect(moved.world.player.x).toBe(state.world.player.x + 1);
    expect(moved.toast).toContain('Moved right');
    const blocked = stepCommons(
      {
        ...state,
        world: { ...state.world, player: { x: 2, y: 2, facing: 'up' } },
        lastActions: [],
      },
      ['down']
    );
    expect(blocked.toast).toContain('Path edge blocks down');
    const atExit = {
      ...state,
      world: {
        ...state.world,
        player: { ...state.world.player, x: 16, y: 6, facing: 'right' },
      },
      lastActions: [],
    };
    expect(stepCommons(atExit, ['right']).world.mapId).toBe('weir');
    const nearJune = stepCommons(state, ['up']);
    expect(nearJune.toast).toContain('Talk to June Sol');
    expect(
      stepCommons({ ...nearJune, lastActions: [] }, ['a']).dialogue.actorId
    ).toBe('june');
  });

  test('records the old gauge as optional evidence and presents authored residents', () => {
    const state = createCommonsState();
    const atGauge = {
      ...state,
      world: {
        ...state.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 11, y: 3, facing: 'right' },
      },
    };
    const evidence = stepCommons(atGauge, ['a']);
    expect(evidence.evidence).toContain('gauge-reading');
    expect(evidence.toast).toContain('high-water mark');
    const nearElian = {
      ...state,
      world: {
        ...state.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 10, y: 5, facing: 'down' },
        npcs: [{ ...COMMONS_CONTENT.npcs[0], x: 10, y: 6, map: 'weir' }],
      },
    };
    expect(stepCommons(nearElian, ['a']).dialogue.lines[0].text).toContain(
      'living neighbor'
    );
    expect(stepCommons(nearElian, ['a']).evidence).toHaveLength(0);
    expect(stepCommons(nearElian, ['a']).presentation.status).toContain(
      'GAUGE / REEDS / FLOW'
    );
  });

  test('keeps the three agreements distinct and gates the seasonal pact on evidence', () => {
    const state = createCommonsState();
    const blocked = chooseRiverAgreement(state, 'seasonal-pact');
    expect(blocked).toBe(state);
    const marsh = chooseRiverAgreement(state, 'give-river-room');
    expect(marsh.world.flags).toMatchObject({
      marshRestored: true,
      bridgeOpen: false,
    });
    expect(marsh.agreements[0].valuesProtected).toContain('wild-continuity');
    expect(chooseRiverAgreement(marsh, 'restore-crossing')).toBe(marsh);
    const crossing = chooseRiverAgreement(state, 'restore-crossing');
    expect(crossing.world.flags).toMatchObject({
      marshRestored: false,
      bridgeOpen: true,
    });
    const informed = { ...state, evidence: ['gauge-reading'] };
    const pact = chooseRiverAgreement(informed, 'seasonal-pact');
    expect(pact.world.flags).toMatchObject({
      seasonalClosure: true,
      bridgeOpen: true,
    });
    expect(pact.agreements[0].terms).toContain('reversible crossing');
  });

  test('unlocks one practice after agreement and makes its action consequential', () => {
    const state = chooseRiverAgreement(
      createCommonsState(),
      'restore-crossing'
    );
    expect(choosePractice(createCommonsState(), 'open-circle')).toEqual(
      createCommonsState()
    );
    expect(choosePractice(state, 'unknown')).toBe(state);
    expect(choosePractice(state, 'habitat-listening')).toBe(state);
    const learned = choosePractice(state, 'open-circle');
    const next = stepCommons({ ...learned, quickAction: 'listen' }, ['b']);
    expect(next.world.flags.openCircleInvited).toBe(true);
    expect(commonsJournal(next).some(row => row.status === 'agreed')).toBe(
      true
    );
  });

  test('supports menu ownership, assignment, dialogue movement, and charter recording', () => {
    const state = createCommonsState();
    const menu = stepCommons(state, ['x']);
    expect(menu.menu.page).toBe('main');
    const assign = stepCommons(
      { ...menu, menu: { page: 'assign', selected: 0 }, lastActions: [] },
      ['down']
    );
    expect(assign.menu.selected).toBe(1);
    const assigned = stepCommons({ ...assign, lastActions: [] }, ['a']);
    expect(assigned.quickAction).toBe('repair');
    const dialogue = {
      ...state,
      dialogue: {
        actorId: 'river',
        lines: [
          {
            text: 'Choose',
            choices: [
              { label: 'Marsh', command: 'river:give-river-room' },
              { label: 'Crossing', command: 'river:restore-crossing' },
            ],
          },
        ],
        index: 0,
        choices: [
          { label: 'Marsh', command: 'river:give-river-room' },
          { label: 'Crossing', command: 'river:restore-crossing' },
        ],
        selected: 0,
      },
      puzzle: { ...state.puzzle, completed: true },
      lastActions: [],
    };
    const selected = stepCommons(dialogue, ['down']);
    expect(selected.dialogue.selected).toBe(1);
    const decided = stepCommons({ ...selected, lastActions: [] }, ['a']);
    expect(decided.agreements[0].choice).toBe('restore-crossing');
    const atTable = {
      ...decided,
      lastActions: [],
      world: {
        ...decided.world,
        mapId: 'commons',
        map: COMMONS_CONTENT.maps.commons,
        player: { x: 9, y: 6, facing: 'up' },
      },
    };
    const charter = stepCommons(atTable, ['a']);
    expect(charter.world.flags.charterRecorded).toBe(true);
    expect(charter.charter.text).toContain('Rebuild the footbridge');
    expect(
      stepCommons(
        {
          ...state,
          dialogue: { ...dialogue.dialogue, choices: [] },
          lastActions: [],
        },
        ['b']
      ).dialogue
    ).toBeNull();
  });

  test('persists completed puzzle evidence and resets it only before agreement', () => {
    const state = createCommonsState();
    const board = {
      ...state,
      mode: 'puzzle',
      puzzle: { ...state.puzzle, selectedCell: 11 },
      lastActions: [],
    };
    const edited = stepCommons(board, ['a']);
    expect(edited.puzzle.editsUsed).toBe(1);
    const resetMenu = stepCommons(
      { ...state, menu: { page: 'actions', selected: 4 }, lastActions: [] },
      ['a']
    );
    expect(resetMenu.puzzle.editsUsed).toBe(0);
    const fixed = chooseRiverAgreement(state, 'restore-crossing');
    const unchanged = stepCommons(
      { ...fixed, menu: { page: 'actions', selected: 4 }, lastActions: [] },
      ['a']
    );
    expect(unchanged.agreements).toHaveLength(1);
  });

  test('routes water through handheld actions and records the field evidence', () => {
    let state = {
      ...createCommonsState(),
      mode: 'puzzle',
      puzzle: { ...createCommonsState().puzzle, selectedCell: 11 },
    };
    const tap = button => {
      state = stepCommons(state, []);
      state = stepCommons(state, [button]);
    };
    tap('a');
    tap('right');
    tap('right');
    tap('b');
    tap('a');
    for (let index = 0; index < 6 && !state.puzzle.completed; index += 1)
      tap('y');
    expect(state.puzzle.completed).toBe(true);
    expect(state.evidence).toContain('water-routed');
  });
});

describe('Commons controller and story edge cases', () => {
  test('surveys discoveries, listens, repairs and records charter terms', () => {
    const at = (mapId, x, y, facing = 'right') => {
      const state = createCommonsState();
      const map = COMMONS_CONTENT.maps[mapId];
      return {
        ...state,
        world: {
          ...state.world,
          mapId,
          map,
          player: { x, y, facing },
          npcs: [],
        },
      };
    };
    const gauge = stepCommons(at('weir', 11, 3), ['b']);
    expect(gauge.evidence).toContain('gauge-reading');
    expect(stepCommons(at('weir', 13, 5), ['a']).evidence).toContain(
      'reed-nesting-marks'
    );
    expect(stepCommons(at('commons', 13, 7), ['a']).toast).toContain(
      'old river path'
    );
    expect(stepCommons(at('commons', 8, 2, 'down'), ['a']).toast).toContain(
      'charter assembly'
    );
    expect(stepCommons(at('commons', 3, 6), ['a']).dialogue.actorId).toBe(
      'solar-kitchen'
    );
    expect(stepCommons(at('weir', 7, 6), ['a']).mode).toBe('puzzle');
    expect(stepCommons(at('commons', 0, 0), ['a']).toast).toContain(
      'Nothing ahead'
    );
    const unknownObjectState = at('commons', 5, 4);
    unknownObjectState.world.map = {
      ...unknownObjectState.world.map,
      objects: [{ id: 'unknown-object', x: 6, y: 4 }],
    };
    expect(stepCommons(unknownObjectState, ['a']).toast).toContain(
      'closer look'
    );

    const agreement = chooseRiverAgreement(
      { ...gauge, puzzle: { ...gauge.puzzle, completed: true } },
      'restore-crossing'
    );
    const basicRepair = stepCommons(
      {
        ...at('weir', 4, 6, 'right'),
        quickAction: 'repair',
      },
      ['b']
    );
    expect(basicRepair.world.flags.footbridgeStabilized).toBe(true);
    expect(basicRepair.world.flags.bridgeOpen).not.toBe(true);
    expect(basicRepair.toast).toContain('crossing stays closed');
    const repaired = stepCommons(
      {
        ...agreement,
        world: {
          ...agreement.world,
          mapId: 'weir',
          map: COMMONS_CONTENT.maps.weir,
          player: { x: 4, y: 6, facing: 'right' },
        },
        lastActions: [],
        practices: ['living-repair'],
        quickAction: 'repair',
      },
      ['b']
    );
    expect(repaired.world.flags.reversibleRepairProposed).toBe(true);
    const invited = stepCommons(
      {
        ...agreement,
        lastActions: [],
        practices: ['open-circle'],
        quickAction: 'listen',
      },
      ['b']
    );
    expect(invited.world.flags.openCircleInvited).toBe(true);
    expect(
      stepCommons(
        {
          ...agreement,
          lastActions: [],
          practices: ['habitat-listening'],
          quickAction: 'listen',
          evidence: ['reed-nesting-marks'],
        },
        ['b']
      ).toast
    ).toContain('nesting calls');
    expect(
      stepCommons(
        {
          ...agreement,
          lastActions: [],
          practices: ['habitat-listening'],
          quickAction: 'listen',
        },
        ['b']
      ).toast
    ).toContain('under the footbridge');

    const table = stepCommons(at('commons', 9, 6, 'up'), ['a']);
    expect(table.toast).toContain('Bring the district agreement');
    const charter = stepCommons(
      {
        ...repaired,
        world: {
          ...repaired.world,
          mapId: 'commons',
          map: COMMONS_CONTENT.maps.commons,
          player: { x: 9, y: 6, facing: 'up' },
        },
        lastActions: [],
      },
      ['a']
    );
    expect(charter.charter.text).toContain('reversible and reviewed');
    expect(charter.charter.text).toContain('storyteller’s consent');
    const participation = stepCommons(
      {
        ...invited,
        world: {
          ...invited.world,
          mapId: 'commons',
          map: COMMONS_CONTENT.maps.commons,
          player: { x: 9, y: 6, facing: 'up' },
        },
        lastActions: [],
      },
      ['a']
    );
    expect(participation.charter.text).toContain('without disclosing private');
  });

  test('covers menu pages, practice choices, controller commands and puzzle reset', () => {
    let state = createCommonsState();
    const tap = action => {
      state = stepCommons(state, []);
      state = stepCommons(state, [action]);
    };
    state = {
      ...state,
      menu: { page: 'actions', selected: 1 },
      lastActions: [],
    };
    tap('a'); // Repair guidance
    expect(state.toast).toContain('face bridge');
    state = {
      ...state,
      menu: { page: 'actions', selected: 3 },
      lastActions: [],
    };
    tap('a');
    expect(state.mode).toBe('puzzle');
    tap('x');
    state = {
      ...state,
      menu: { page: 'actions', selected: 4 },
      lastActions: [],
    };
    tap('a');
    expect(state.puzzle.editsUsed).toBe(0);

    const agreed = chooseRiverAgreement(state, 'restore-crossing');
    state = {
      ...agreed,
      menu: { page: 'practices', selected: 0 },
      lastActions: [],
    };
    tap('a');
    expect(state.menu.page).toBe('practice-choice');
    tap('a');
    expect(state.practices).toHaveLength(1);

    for (const [command, selected] of [
      ['save', 0],
      ['export', 4],
      ['import', 5],
      ['slot:2', 3],
    ]) {
      state = {
        ...state,
        menu: {
          page: 'saves',
          selected,
        },
        lastActions: [],
      };
      tap('a');
      expect(state.controllerCommand).toBe(command);
      state = { ...state, controllerCommand: null };
    }
    state = { ...state, menu: { page: 'reset', selected: 1 }, lastActions: [] };
    tap('a');
    expect(state.controllerCommand).toBe('reset');
  });

  test('handles blocked crossing, rejected decisions, dialogue exit and menu back', () => {
    const state = createCommonsState();
    const blocked = {
      ...state,
      world: {
        ...state.world,
        player: { x: 1, y: 2, facing: 'right' },
      },
    };
    expect(stepCommons(blocked, ['right']).world.player.x).toBe(1);
    const decision = {
      ...state,
      mode: 'world',
      puzzle: { ...state.puzzle, completed: true },
      evidence: [],
      world: {
        ...state.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 4, y: 6, facing: 'right' },
      },
    };
    const options = stepCommons(decision, ['a']);
    expect(options.dialogue.choices).toHaveLength(2);
    expect(stepCommons({ ...options, lastActions: [] }, ['b']).dialogue).toBe(
      null
    );
    expect(
      stepCommons({ ...state, menu: { page: 'main', selected: 6 } }, ['a']).menu
    ).toBeNull();
    expect(
      stepCommons({ ...state, menu: { page: 'main', selected: 0 } }, ['b']).menu
    ).toBeNull();
    expect(
      stepCommons({ ...state, menu: { page: 'actions', selected: 2 } }, ['b'])
        .menu
    ).toEqual({ page: 'main', selected: 0 });
    expect(
      stepCommons({ ...state, menu: { page: 'actions', selected: 2 } }, ['x'])
        .menu
    ).toBeNull();
    expect(
      stepCommons({ ...state, quickAction: 'mystery' }, ['b']).toast
    ).toContain('mystery');
    const unfinished = {
      ...state,
      world: {
        ...state.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 4, y: 6, facing: 'right' },
      },
    };
    expect(stepCommons(unfinished, ['a']).dialogue.lines[0].text).toContain(
      'inlet is still dry'
    );
    const alreadyAgreed = chooseRiverAgreement(state, 'restore-crossing');
    const atBridge = {
      ...alreadyAgreed,
      world: {
        ...alreadyAgreed.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 4, y: 6, facing: 'right' },
      },
      lastActions: [],
    };
    expect(stepCommons(atBridge, ['a']).dialogue.actorId).toBe(
      'river-agreement'
    );

    const dialogue = {
      ...state,
      dialogue: {
        actorId: 'dialogue',
        lines: [{ text: 'Next line.' }, { text: 'End.' }],
        index: 0,
        choices: [],
      },
      lastActions: [],
    };
    expect(stepCommons(dialogue, ['a']).dialogue.index).toBe(1);
    const withoutCommand = {
      ...dialogue,
      dialogue: {
        ...dialogue.dialogue,
        choices: [{ label: 'Continue' }],
        selected: 0,
      },
    };
    const advanced = stepCommons(withoutCommand, ['a']);
    expect(advanced.dialogue.index).toBe(1);
    expect(stepCommons({ ...advanced, lastActions: [] }, ['a']).dialogue).toBe(
      null
    );

    const assignMenu = {
      ...state,
      menu: { page: 'assign', selected: 1 },
      lastActions: [],
    };
    expect(stepCommons(assignMenu, ['a']).quickAction).toBe('repair');
    expect(stepCommons(assignMenu, ['a']).toast).toContain('B set: Repair');
    expect(stepCommons(assignMenu, ['a']).toast).toContain('Map ready');
    expect(
      stepCommons({ ...createCommonsState(), quickAction: 'repair' }, ['b'])
        .toast
    ).toContain('Go east on light path to WEIR');
    const journalMenu = {
      ...state,
      menu: { page: 'journal', selected: 0 },
      lastActions: [],
    };
    expect(stepCommons(journalMenu, ['a']).menu.page).toBe('main');
    const charterMenu = {
      ...state,
      menu: { page: 'main', selected: 3 },
      lastActions: [],
    };
    expect(stepCommons(charterMenu, ['a']).menu.page).toBe('charter');
    expect(
      menuItems('charter', createCommonsState()).map(([label]) => label)
    ).toEqual(['Back to main menu']);
    expect(
      menuItems('charter', {
        ...createCommonsState(),
        agreements: [
          { choice: 'restore-crossing', terms: 'A shared crossing.' },
        ],
      }).map(([label]) => label)
    ).toEqual(['Record this charter', 'Back to main menu']);
    const charterReady = {
      ...chooseRiverAgreement(createCommonsState(), 'restore-crossing'),
      menu: { page: 'charter', selected: 0 },
      lastActions: [],
    };
    expect(stepCommons(charterReady, ['a']).world.flags.charterRecorded).toBe(
      true
    );
    expect(menuItems('actions', createCommonsState())[0][0]).toContain('A ·');
    expect(menuItems('assign', createCommonsState())[0][0]).toContain(
      'Survey facing'
    );
    expect(
      stepCommons(
        { ...state, menu: { page: 'main', selected: 0 }, lastActions: [] },
        ['y']
      ).menu.page
    ).toBe('assign');
    expect(
      stepCommons(
        { ...state, menu: { page: 'main', selected: 1 }, lastActions: [] },
        ['a']
      ).presentation.menuRows
    ).toContain('active: The River Keeps Its Own Time');
    expect(
      stepCommons(
        { ...state, menu: { page: 'charter', selected: 0 }, lastActions: [] },
        []
      ).presentation.menuRows
    ).toContain('No agreement recorded yet.');
    expect(
      stepCommons(
        {
          ...alreadyAgreed,
          practices: ['living-repair'],
          menu: { page: 'practices', selected: 0 },
          lastActions: [],
        },
        []
      ).presentation.menuRows
    ).toContain('> Living Repair');
    const moved = stepCommons(
      { ...state, menu: { page: 'main', selected: 0 }, lastActions: [] },
      ['up']
    );
    expect(moved.menu.selected).toBe(6);
  });
});

describe('Commons handheld actions and deterministic board controls', () => {
  test('covers assign shortcuts, puzzle bounds, journal rows and input edge behavior', () => {
    let state = {
      ...createCommonsState(),
      menu: { page: 'assign', selected: 0 },
    };
    state = stepCommons(state, ['a']);
    expect(state.quickAction).toBe('survey');
    const towardGauge = {
      ...state,
      world: {
        ...state.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 11, y: 3, facing: 'right' },
      },
      lastActions: [],
    };
    expect(stepCommons(towardGauge, ['b']).evidence).toContain('gauge-reading');

    let board = {
      ...createCommonsState(),
      mode: 'puzzle',
      puzzle: { ...createCommonsState().puzzle, selectedCell: 0 },
    };
    board = stepCommons(board, ['up']);
    expect(board.puzzle.selectedCell).toBe(0);
    board = stepCommons({ ...board, lastActions: [] }, ['left']);
    expect(board.puzzle.selectedCell).toBe(0);
    board = stepCommons({ ...board, lastActions: [] }, ['down']);
    expect(board.puzzle.selectedCell).toBe(5);
    board = stepCommons(
      {
        ...board,
        lastActions: [],
        puzzle: { ...board.puzzle, selectedCell: 19 },
      },
      ['right']
    );
    expect(board.puzzle.selectedCell).toBe(19);
    const journal = commonsJournal({
      ...board,
      evidence: ['gauge-reading'],
      agreements: [{ choice: 'give-river-room', terms: 'Terms.' }],
    });
    expect(journal.map(row => row.status)).toEqual([
      'complete',
      'recorded',
      'agreed',
    ]);
    expect(stepCommons(board, ['right']).puzzle.selectedCell).toBe(19);
    const repairState = {
      ...createCommonsState(),
      evidence: ['water-routed'],
      journal: ['water-routed'],
      puzzle: { ...createCommonsState().puzzle, editsUsed: 2 },
      menu: { page: 'actions', selected: 4 },
    };
    const reset = stepCommons(repairState, ['a']);
    expect(reset.evidence).toEqual([]);
    expect(reset.journal).toEqual([]);
    expect(reset.puzzle.editsUsed).toBe(0);
  });

  test('routes survey, practice, dialogue and menu edge cases', () => {
    const noPractice = {
      ...createCommonsState(),
      quickAction: 'listen',
      lastActions: [],
    };
    expect(stepCommons(noPractice, ['b']).toast).toContain('learned after');
    const surveyReed = {
      ...createCommonsState(),
      quickAction: 'survey',
      world: {
        ...createCommonsState().world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 13, y: 5, facing: 'right' },
      },
    };
    expect(stepCommons(surveyReed, ['b']).evidence).toContain(
      'reed-nesting-marks'
    );
    const characterSurvey = {
      ...createCommonsState(),
      quickAction: 'survey',
      world: {
        ...createCommonsState().world,
        player: { x: 5, y: 6, facing: 'right' },
      },
    };
    expect(stepCommons(characterSurvey, ['b']).dialogue.actorId).toBe('june');
    const practiceDialogue = {
      ...createCommonsState(),
      world: {
        ...createCommonsState().world,
        flags: { riverAgreement: 'restore-crossing' },
      },
      dialogue: {
        actorId: 'practice',
        lines: [{ text: 'Choose.' }],
        index: 0,
        selected: 0,
        choices: [{ label: 'Open Circle', command: 'practice:open-circle' }],
      },
    };
    expect(stepCommons(practiceDialogue, ['a']).practices).toEqual([
      'open-circle',
    ]);
    expect(stepCommons(createCommonsState(), ['y']).menu.page).toBe('assign');
    const emptySurvey = {
      ...createCommonsState(),
      quickAction: 'survey',
      world: {
        ...createCommonsState().world,
        player: { x: 0, y: 0, facing: 'up' },
      },
    };
    expect(stepCommons(emptySurvey, ['b']).toast).toContain(
      'Face one, then press B'
    );
    const choices = {
      ...createCommonsState(),
      dialogue: {
        actorId: 'choice',
        lines: [{ text: 'Pick.' }],
        index: 0,
        selected: 1,
        choices: [
          { label: 'A', command: 'river:give-river-room' },
          { label: 'B', command: 'river:restore-crossing' },
        ],
      },
    };
    expect(stepCommons(choices, ['up']).dialogue.selected).toBe(0);
    expect(
      stepCommons(
        { ...choices, dialogue: { ...choices.dialogue, selected: 1 } },
        ['left']
      ).dialogue.selected
    ).toBe(0);
    const menu = {
      ...createCommonsState(),
      menu: { page: 'main', selected: 0 },
    };
    expect(stepCommons(menu, ['up']).menu.selected).toBe(6);
    expect(
      stepCommons({ ...menu, menu: { page: 'actions', selected: 2 } }, ['left'])
        .menu.selected
    ).toBe(1);
    expect(
      stepCommons({ ...menu, menu: { page: 'actions', selected: 99 } }, ['a'])
        .menu.selected
    ).toBe(99);
    expect(
      stepCommons({ ...menu, menu: { page: 'practices', selected: 0 } }, [])
        .presentation.menuRows
    ).toContain('> No practice unlocked yet');
    expect(stepCommons(createCommonsState()).tick).toBe(1);
    const charterQuickAction = {
      ...createCommonsState(),
      quickAction: 'charter',
      lastActions: [],
    };
    expect(stepCommons(charterQuickAction, ['b']).toast).toContain(
      'Bring the district agreement'
    );
    const emptyDialogue = {
      ...createCommonsState(),
      dialogue: {
        actorId: 'quiet',
        lines: [{ text: 'Still here.' }],
        index: 0,
        choices: [],
      },
    };
    expect(stepCommons(emptyDialogue).dialogue.index).toBe(0);
    const regularPractice = {
      ...chooseRiverAgreement(createCommonsState(), 'restore-crossing'),
      menu: { page: 'practice-choice', selected: 1 },
      lastActions: [],
    };
    expect(stepCommons(regularPractice, ['a']).practices).toEqual([
      'living-repair',
    ]);
    const unknownPractice = {
      ...createCommonsState(),
      practices: ['archived-practice'],
      menu: { page: 'practices', selected: 0 },
    };
    expect(stepCommons(unknownPractice, []).presentation.menuRows).toContain(
      '> archived-practice'
    );
    expect(
      stepCommons(
        {
          ...menu,
          evidence: ['gauge-reading'],
          menu: { page: 'practice-choice', selected: 0 },
        },
        []
      ).presentation.menuRows
    ).toContain('> Habitat Listening');
    const alternateRoute = {
      ...createCommonsState(),
      mode: 'puzzle',
      puzzle: { ...createCommonsState().puzzle, route: 'commons' },
    };
    expect(stepCommons(alternateRoute, ['b']).puzzle.route).toBe('marsh');
  });
});
