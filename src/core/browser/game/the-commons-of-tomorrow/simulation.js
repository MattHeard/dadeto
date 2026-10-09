import { scheduleActors, targetInFront } from '../mosslight-valley/actors.js';
import {
  advanceDialogue,
  moveDialogueChoice,
  openDialogue,
} from '../mosslight-valley/dialogue.js';
import {
  createWorld,
  isBlocked,
  movePlayer,
} from '../mosslight-valley/world.js';
import { COMMONS_CONTENT } from './content.js';
import {
  advanceWaterPuzzle,
  createWaterPuzzle,
  editWaterChannel,
  openWaterGate,
  setWaterRoute,
} from './puzzle.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];
/** @type {Record<string, Array<[string, string]>>} */
const MENU_ENTRIES = Object.freeze({
  main: [
    ['Actions', 'page:actions'],
    ['Field journal', 'page:journal'],
    ['Practices', 'page:practices'],
    ['Charter', 'page:charter'],
    ['Save options', 'page:saves'],
    ['Assign B', 'page:assign'],
    ['Return to game', 'close'],
  ],
  actions: [
    ['A · Survey a facing person or clue', 'action:survey'],
    ['A · Repair the Weir footbridge', 'action:repair'],
    ['A · Listen to habitat', 'action:listen'],
    ['A · Reset the flow board', 'action:reset-puzzle'],
  ],
  saves: [
    ['Save progress', 'save'],
    ['Open slot 1', 'slot:0'],
    ['Open slot 2', 'slot:1'],
    ['Open slot 3', 'slot:2'],
    ['Export file', 'export'],
    ['Import file', 'import'],
    ['Erase this slot', 'page:reset'],
    ['Back', 'page:main'],
  ],
  reset: [
    ['Keep my progress', 'page:saves'],
    ['Erase this slot', 'reset'],
  ],
});

/**
 * Merge persistent authored flags into the current world snapshot.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} updates Explicit outcome flags.
 * @returns {Record<string, any>} State with the updated world flags.
 */
function updateWorldFlags(state, updates) {
  return {
    ...state,
    world: {
      ...state.world,
      flags: { ...state.world.flags, ...updates },
    },
  };
}

/**
 * Create the new-game state for the authored two-district chapter.
 * @param {Record<string, any>} content Authored chapter.
 * @returns {Record<string, any>} Initial deterministic game state.
 */
export function createCommonsState(
  /** @type {Record<string, any>} */ content = COMMONS_CONTENT
) {
  const world = createWorld(/** @type {any} */ (content));
  world.relationships = {};
  world.npcs = scheduleActors(/** @type {any[]} */ (content.npcs), world);
  return {
    world,
    inventory: {},
    evidence: [],
    agreements: [],
    practices: [],
    charter: null,
    puzzle: createWaterPuzzle(),
    dialogue: null,
    journal: [],
    ending: null,
    mode: 'world',
    menu: null,
    quickAction: 'survey',
    controllerCommand: null,
    lastActions: [],
    tick: 0,
    toast: 'Follow the light path east to WEIR.',
    presentation: { game: 'commons', status: 'Survey the shared city.' },
  };
}

/**
 * Apply one selected district agreement and persist its authored consequences.
 * @param {Record<string, any>} state Current game state.
 * @param {string} choiceId Authored agreement identifier.
 * @param {Record<string, any>} content Chapter content.
 * @returns {Record<string, any>} Updated state or original state for invalid choice.
 */
export function chooseRiverAgreement(
  /** @type {Record<string, any>} */ state,
  /** @type {string} */ choiceId,
  /** @type {Record<string, any>} */
  content = COMMONS_CONTENT
) {
  const choice = content.quest.choices.find(
    (/** @type {Record<string, any>} */ candidate) => candidate.id === choiceId
  );
  if (
    !choice ||
    choice.requires?.some(
      (/** @type {string} */ evidence) => !state.evidence.includes(evidence)
    ) ||
    state.agreements.some(
      (/** @type {Record<string, any>} */ agreement) =>
        agreement.quest === content.quest.id
    )
  )
    return state;
  const updated = updateWorldFlags(state, {
    ...choice.effects,
    riverAgreement: choice.id,
  });
  const agreement = {
    quest: content.quest.id,
    choice: choice.id,
    terms: choice.agreement,
    valuesProtected: [...choice.valuesProtected],
  };
  return {
    ...updated,
    agreements: [...state.agreements, agreement],
    journal: [...new Set([...state.journal, 'river-agreement'])],
    toast: choice.agreement,
    mode: 'world',
    dialogue: null,
  };
}

/**
 * Choose a practice after resolving the district quest.
 * @param {Record<string, any>} state Current game state.
 * @param {string} practiceId Authored practice identifier.
 * @param {Record<string, any>} content Chapter content.
 * @returns {Record<string, any>} State with one acquired practice.
 */
export function choosePractice(
  /** @type {Record<string, any>} */ state,
  /** @type {string} */ practiceId,
  /** @type {Record<string, any>} */ content = COMMONS_CONTENT
) {
  if (!state.world.flags.riverAgreement || state.practices.length > 0)
    return state;
  const practice = content.practices.find(
    (/** @type {Record<string, any>} */ item) => item.id === practiceId
  );
  if (
    !practice ||
    (practice.unlock === 'gauge-reading' &&
      !state.evidence.includes('gauge-reading'))
  )
    return state;
  return {
    ...state,
    practices: [practice.id],
    journal: [...new Set([...state.journal, `practice:${practice.id}`])],
    menu: null,
    toast: `Practice learned: ${practice.name}. ${practice.action}`,
  };
}

/**
 * Build human-readable journal records from explicit state, not a value score.
 * @param {Record<string, any>} state Current game state.
 * @returns {Array<Record<string, string>>} Current quest and decision records.
 */
export function commonsJournal(/** @type {Record<string, any>} */ state) {
  const agreement = state.agreements[0];
  return [
    {
      id: 'river-keeps-its-own-time',
      title: 'The River Keeps Its Own Time',
      status: agreement ? 'complete' : 'active',
      detail:
        agreement?.terms ||
        'Inspect the old gauge and speak with the weir residents.',
    },
    ...state.evidence.map((/** @type {string} */ item) => ({
      id: item,
      title:
        item === 'gauge-reading'
          ? 'Old gauge reading'
          : item === 'early-flood-mark'
            ? 'Early flood mark'
            : item,
      status: 'recorded',
      detail:
        item === 'early-flood-mark'
          ? 'The river reached the shared footbridge before dawn.'
          : 'Evidence recorded from the Living Weir.',
    })),
    ...['june', 'elian']
      .filter(id => state.world.flags[`heard-${id}`])
      .map(id => ({
        id: `perspective:${id}`,
        title: id === 'june' ? 'June’s perspective' : 'Elian’s perspective',
        status: 'heard',
        detail:
          id === 'june'
            ? 'The weekly meal keeps neighbors connected across the district.'
            : 'The marsh and its nesting reeds have value beyond their use to people.',
      })),
    ...state.agreements.map((/** @type {Record<string, any>} */ item) => ({
      id: item.choice,
      title: 'Community agreement',
      status: 'agreed',
      detail: item.terms,
    })),
  ];
}

/**
 * Step the Commons simulation from normalized handheld actions.
 * @param {Record<string, any>} state Current game state.
 * @param {string[]} actions Held and edge-triggered actions.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Next deterministic state.
 */
export function stepCommons(
  /** @type {Record<string, any>} */ state,
  /** @type {string[]} */ actions = [],
  /** @type {Record<string, any>} */ content = COMMONS_CONTENT
) {
  const pressed = actions.filter(action => !state.lastActions.includes(action));
  let next = /** @type {Record<string, any>} */ ({
    ...state,
    tick: state.tick + 1,
  });
  if (next.menu) next = stepMenu(next, pressed, content);
  else if (next.mode === 'puzzle') next = stepPuzzle(next, pressed);
  else if (next.dialogue) next = stepDialogue(next, pressed, content);
  else next = stepWorld(next, pressed, content);
  return {
    ...next,
    lastActions: [...actions],
    presentation: {
      ...next.presentation,
      menuRows: next.menu ? menuRows(next, content) : undefined,
      status:
        next.mode === 'puzzle'
          ? 'Route water to the commons inlet.'
          : `${next.evidence.length} CLUES · GAUGE / REEDS / FLOW`,
    },
  };
}

/**
 * Move the player or handle an action in the world layer.
 * @param {Record<string, any>} state Current game state.
 * @param {string[]} pressed Newly pressed actions.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function stepWorld(state, pressed, content) {
  const next = state;
  if (pressed.includes('x'))
    return { ...state, menu: { page: 'main', selected: 0 } };
  if (pressed.includes('y'))
    return { ...state, menu: { page: 'assign', selected: 0 } };
  if (pressed.includes('b'))
    return performFieldAction(state, state.quickAction, content);
  const direction = DIRECTIONS.find(item => pressed.includes(item));
  if (direction) {
    const before = next.world.player;
    const beforeMapId = next.world.mapId;
    const world = movePlayer(next.world, direction, content);
    world.npcs = scheduleActors(content.npcs, world);
    const moved = { ...next, world };
    if (world.mapId !== beforeMapId)
      return {
        ...moved,
        toast:
          world.mapId === 'weir'
            ? 'Living Weir. Bridge is west of the flow board.'
            : 'Canopy Commons. Follow the light path east to WEIR.',
      };
    if (world.player.x === before.x && world.player.y === before.y) {
      const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
        direction
      ] || [0, 0];
      const blocked = isBlocked(
        next.world.map,
        before.x + delta[0],
        before.y + delta[1]
      );
      return {
        ...moved,
        toast: blocked
          ? 'Path blocked · turn or choose another way.'
          : 'Resident ahead · face them and press A.',
      };
    }
    const { actor, object } = targetInFront(moved);
    if (actor)
      return {
        ...moved,
        toast: `A: Talk to ${/** @type {any} */ (actor).name}.`,
      };
    if (object)
      return { ...moved, toast: `A: Inspect ${interactionName(object)}.` };
    return { ...moved, toast: ' ' };
  }
  if (pressed.includes('a')) return interact(state, content);
  return next;
}

/**
 * Give map features short names for controller prompts.
 * @param {Record<string, any>} object Targeted map feature.
 * @returns {string} Readable feature name.
 */
function interactionName(object) {
  const names = /** @type {Record<string, string>} */ ({
    'flood-marker': 'the early flood mark',
    'meal-crates': 'June’s meal crates',
    'old-gauge': 'the old gauge',
    'flow-board': 'the flow board',
    'reed-island': 'the reed island',
    'seasonal-footbridge': 'the seasonal footbridge',
    'charter-table': 'the charter table',
    'assembly-board': 'the assembly board',
    'solar-kitchen': 'the shared kitchen',
    'canopy-stair': 'the canopy stair',
  });
  return names[object.id] || 'this feature';
}

/**
 * Name a field action in B assignment feedback.
 * @param {string} action Assigned action identifier.
 * @returns {string} Readable action name.
 */
function actionName(action) {
  return (
    { survey: 'Survey', repair: 'Repair', listen: 'Listen' }[action] || action
  );
}

/**
 * Explain when the assigned B action has an effect.
 * @param {string} action Assigned action identifier.
 * @returns {string} Short controller guidance.
 */
function actionGuide(action) {
  return (
    {
      survey: 'Face a person or clue, then press B.',
      repair: 'Go east on light path to WEIR; face bridge, press B.',
      listen: 'Press B in the Living Weir.',
    }[action] || 'Press B while exploring.'
  );
}

/**
 * Interact with the actor or object directly in front of the player.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function interact(state, content) {
  const { actor, object } = targetInFront(state);
  if (actor) {
    const person = /** @type {Record<string, any>} */ (actor);
    const heard = ['june', 'elian'].includes(person.id)
      ? updateWorldFlags(state, { [`heard-${person.id}`]: true })
      : state;
    const openingLine =
      person.id === 'june'
        ? 'The river rose overnight. Tonight’s weekly meal is set by the low crossing; moving it means some neighbors lose the shared table.'
        : person.id === 'elian'
          ? 'The water reached the nesting reeds before dawn. Please read the gauge before anyone opens the crossing.'
          : '';
    const text = [
      `${person.name} · ${person.role}.`,
      openingLine,
      person.reason,
    ]
      .filter(Boolean)
      .join(' ');
    return openDialogue(heard, actor.id, [
      {
        text,
      },
    ]);
  }
  if (!object)
    return {
      ...state,
      toast: 'Nothing ahead. Face a person or feature; A talks or inspects.',
    };
  if (object.id === 'old-gauge') {
    const evidence = [...new Set([...state.evidence, 'gauge-reading'])];
    return {
      ...state,
      evidence,
      journal: [...new Set([...state.journal, 'gauge-reading'])],
      toast:
        'The gauge was installed before the reed beds shifted. The high-water mark is still legible.',
    };
  }
  if (object.id === 'flood-marker') {
    const evidence = [...new Set([...state.evidence, 'early-flood-mark'])];
    return {
      ...updateWorldFlags(state, { earlyFloodMarkRead: true }),
      evidence,
      journal: [...new Set([...state.journal, 'early-flood-mark'])],
      toast:
        'The river reached the shared footbridge before dawn. The gauge can show whether this rise is unusual.',
    };
  }
  if (object.id === 'meal-crates')
    return {
      ...updateWorldFlags(state, { mealCratesSeen: true }),
      toast:
        'June’s meal crates are staged beside the low path. The gathering is planned near the crossing.',
    };
  if (object.id === 'flow-board')
    return {
      ...state,
      mode: 'puzzle',
      toast:
        'The flow board tests where river water can go. Try the Commons route before deciding at the footbridge.',
    };
  if (object.id === 'reed-island') {
    const evidence = [...new Set([...state.evidence, 'reed-nesting-marks'])];
    return {
      ...state,
      evidence,
      toast: 'Nesting marks show the reeds are already sheltering new life.',
    };
  }
  if (object.id === 'seasonal-footbridge')
    return openRiverDecision(state, content);
  if (object.id === 'charter-table') return openCharter(state, content);
  if (object.id === 'assembly-board') {
    return {
      ...state,
      toast:
        'The charter assembly will meet when the district has made its river agreement.',
    };
  }
  if (object.id === 'solar-kitchen') {
    return openDialogue(state, 'solar-kitchen', [
      {
        text: 'A shared kitchen is open to everyone. Tonight the gathering host is asking where the weekly meal should meet.',
      },
    ]);
  }
  if (object.id === 'canopy-stair')
    return {
      ...state,
      toast:
        'From the canopy, the old river path and the new reed beds are both visible.',
    };
  return { ...state, toast: 'You take a closer look.' };
}

/**
 * Open the authored resolution choices when their evidence is available.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function openRiverDecision(state, content) {
  if (state.agreements.length) {
    return openDialogue(state, 'river-agreement', [
      {
        text: state.agreements[0].terms,
      },
    ]);
  }
  if (!state.puzzle.completed) {
    return openDialogue(state, 'river-quest', [
      {
        text: 'The channel is ready for a test, but the inlet is still dry. Route water at the flow board before the district decides.',
      },
    ]);
  }
  const choices = content.quest.choices
    .filter(
      (/** @type {Record<string, any>} */ choice) =>
        !choice.requires ||
        choice.requires.every((/** @type {string} */ item) =>
          state.evidence.includes(item)
        )
    )
    .map((/** @type {Record<string, any>} */ choice) => ({
      label: choice.label,
      command: `river:${choice.id}`,
    }));
  return openDialogue(state, 'river-quest', [
    {
      text: 'June wants the crossing for the weekly gathering. Elian asks for the marsh to recover. Tomas proposes a reversible plan if the old gauge tells us when the water rises.',
      choices,
    },
  ]);
}

/**
 * Record the agreement and the charter clauses shaped by acquired practices.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function openCharter(state, content) {
  const agreement = state.agreements[0];
  if (!agreement)
    return {
      ...state,
      toast:
        'Bring the district agreement to the charter table before the assembly.',
    };
  const clauses = content.charter.clauses;
  const reviewClause = state.world.flags.reversibleRepairProposed
    ? 'The crossing repair is reversible and reviewed after high water.'
    : '';
  const participationClause = state.world.flags.openCircleInvited
    ? 'Residents may contribute without disclosing private stories.'
    : '';
  const text = [agreement.terms, ...clauses, reviewClause, participationClause]
    .filter(Boolean)
    .join(' ');
  return {
    ...updateWorldFlags(state, { charterRecorded: true }),
    charter: { id: agreement.choice, text },
    toast: `Charter recorded: ${agreement.terms}`,
  };
}

/**
 * Perform one assigned action without advancing an economic or world clock.
 * @param {Record<string, any>} state Current game state.
 * @param {string} action Assigned field action.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function performFieldAction(state, action, content) {
  if (action === 'reset-puzzle') {
    if (state.agreements.length)
      return {
        ...state,
        toast:
          'The river agreement is already recorded; the puzzle remains as a field record.',
      };
    return {
      ...state,
      puzzle: createWaterPuzzle(),
      evidence: state.evidence.filter(
        (/** @type {string} */ item) => item !== 'water-routed'
      ),
      journal: state.journal.filter(
        (/** @type {string} */ item) => item !== 'water-routed'
      ),
      toast: 'The flow board returns to its authored starting state.',
    };
  }
  if (action === 'charter') return openCharter(state, content);
  const { actor, object } = targetInFront(state);
  if (action === 'survey') {
    if (object?.id === 'old-gauge') return interact(state, content);
    if (object?.id === 'reed-island') return interact(state, content);
    if (actor) return interact(state, content);
    return {
      ...state,
      toast:
        'No person or clue is directly ahead. Face one, then press B to survey it.',
    };
  }
  if (action === 'listen') {
    if (state.practices.includes('open-circle')) {
      return {
        ...updateWorldFlags(state, { openCircleInvited: true }),
        toast:
          'You invite Sari to share what she wants the assembly to know, without asking her to reveal anything private.',
      };
    }
    if (!state.practices.includes('habitat-listening'))
      return {
        ...state,
        toast: 'Listening practice is learned after the district agreement.',
      };
    return {
      ...state,
      toast: state.evidence.includes('reed-nesting-marks')
        ? 'The reed beds are busy with nesting calls.'
        : 'You hear water moving under the footbridge.',
    };
  }
  if (action === 'repair') {
    if (object?.id !== 'seasonal-footbridge')
      return {
        ...state,
        toast:
          state.world.mapId !== 'weir'
            ? 'Go east on light path to WEIR; face bridge, press B.'
            : 'Bridge is west of flow board near entrance; face it, press B.',
      };
    if (!state.practices.includes('living-repair'))
      return {
        ...updateWorldFlags(state, { footbridgeStabilized: true }),
        toast:
          'You stabilize the loose handrail. The crossing stays closed until the district agrees how to use it.',
      };
    return {
      ...updateWorldFlags(state, { reversibleRepairProposed: true }),
      toast:
        'You mark the shared crossing for a reversible repair that can be reviewed after high water.',
    };
  }
  return { ...state, toast: `B action: ${action}.` };
}

/**
 * Resolve navigation and commands within the active dialogue.
 * @param {Record<string, any>} state Current game state.
 * @param {string[]} pressed Newly pressed actions.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function stepDialogue(state, pressed, content) {
  if (pressed.includes('b') || pressed.includes('x'))
    return { ...state, dialogue: null };
  if (state.dialogue.choices?.length) {
    let next = state;
    if (pressed.includes('down') || pressed.includes('right'))
      next = moveDialogueChoice(next, 1);
    if (pressed.includes('up') || pressed.includes('left'))
      next = moveDialogueChoice(next, -1);
    if (pressed.includes('a')) {
      const choice = next.dialogue.choices[next.dialogue.selected || 0];
      if (choice.command?.startsWith('river:'))
        return chooseRiverAgreement(next, choice.command.slice(6), content);
      if (choice.command?.startsWith('practice:'))
        return choosePractice(next, choice.command.slice(9), content);
    }
    return pressed.includes('a') ? advanceDialogue(next) : next;
  }
  return pressed.includes('a') ? advanceDialogue(state) : state;
}

/**
 * Resolve navigation and commands within the active controller menu.
 * @param {Record<string, any>} state Current game state.
 * @param {string[]} pressed Newly pressed actions.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} Updated game state.
 */
function stepMenu(state, pressed, content) {
  if (pressed.includes('x')) return { ...state, menu: null };
  if (pressed.includes('b')) {
    const page = state.menu.page;
    const parent =
      page === 'reset'
        ? 'saves'
        : page === 'practice-choice'
          ? 'practices'
          : page === 'main'
            ? null
            : 'main';
    return {
      ...state,
      menu: parent ? { page: parent, selected: 0 } : null,
    };
  }
  const entries = menuItems(state.menu.page, state, content);
  let selected = state.menu.selected || 0;
  if (pressed.includes('down') || pressed.includes('right'))
    selected = (selected + 1) % entries.length;
  if (pressed.includes('up') || pressed.includes('left'))
    selected = (selected + entries.length - 1) % entries.length;
  const next = { ...state, menu: { ...state.menu, selected } };
  if (pressed.includes('y') && state.menu.page !== 'assign')
    return { ...next, menu: { page: 'assign', selected: 0 } };
  if (!pressed.includes('a')) return next;
  const command = entries[selected]?.[1];
  if (!command) return next;
  if (command === 'close') return { ...next, menu: null };
  if (command.startsWith('page:'))
    return { ...next, menu: { page: command.slice(5), selected: 0 } };
  if (command.startsWith('assign:'))
    return {
      ...next,
      quickAction: command.slice(7),
      menu: null,
      toast: `B set: ${actionName(command.slice(7))}. Map ready. ${actionGuide(command.slice(7))}`,
    };
  if (command.startsWith('action:'))
    return performFieldAction(
      { ...next, menu: null },
      command.slice(7),
      content
    );
  if (command.startsWith('practice:'))
    return choosePractice(next, command.slice(9), content);
  // Save, import, export and slot commands are handled by the shared presenter.
  return { ...next, menu: null, controllerCommand: command };
}

/**
 * Resolve the command rows for a controller page.
 * @param {string} page Active controller page.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} content Authored chapter.
 * @returns {Array<[string, string]>} Visible labels and their commands.
 */
export function menuItems(page, state, content = COMMONS_CONTENT) {
  if (page === 'assign')
    return [
      ['Survey facing person or clue', 'assign:survey'],
      ['Repair Weir footbridge', 'assign:repair'],
      ['Listen to habitat', 'assign:listen'],
      ['Back to main menu', 'page:main'],
    ];
  if (page === 'journal') return [['Back', 'page:main']];
  if (page === 'charter')
    return state.agreements.length
      ? [
          ['Record this charter', 'action:charter'],
          ['Back to main menu', 'page:main'],
        ]
      : [['Back to main menu', 'page:main']];
  if (page === 'practices')
    return state.practices.length
      ? state.practices
          .map((/** @type {string} */ id) => [
            content.practices.find(
              (/** @type {Record<string, any>} */ item) => item.id === id
            )?.name || id,
            'close',
          ])
          .concat([['Back', 'page:main']])
      : state.world.flags.riverAgreement
        ? [
            ['Choose a practice', 'page:practice-choice'],
            ['Back', 'page:main'],
          ]
        : [
            ['No practice unlocked yet', 'close'],
            ['Back', 'page:main'],
          ];
  if (page === 'practice-choice')
    return content.practices
      .filter(
        (/** @type {Record<string, any>} */ practice) =>
          practice.unlock !== 'gauge-reading' ||
          state.evidence.includes('gauge-reading')
      )
      .map((/** @type {Record<string, any>} */ practice) => [
        practice.name,
        `practice:${practice.id}`,
      ]);
  if (page === 'saves' || page === 'reset') return MENU_ENTRIES[page];
  return page === 'actions' ? MENU_ENTRIES.actions : MENU_ENTRIES.main;
}

/**
 * Create bounded menu rows for the 160×144 handheld display.
 * @param {Record<string, any>} state Current game state.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {string[]} Pixel-font menu rows.
 */
function menuRows(state, content) {
  const page = state.menu.page;
  const entries = menuItems(page, state, content);
  const info =
    page === 'journal'
      ? commonsJournal(state).map(item => `${item.status}: ${item.title}`)
      : page === 'charter'
        ? [
            state.charter?.text ||
              state.agreements[0]?.terms ||
              'No agreement recorded yet.',
            ...content.charter.clauses,
          ]
        : page === 'practices'
          ? state.practices.map(
              (/** @type {string} */ id) =>
                content.practices.find(
                  (/** @type {Record<string, any>} */ practice) =>
                    practice.id === id
                )?.action || id
            )
          : [];
  const available = Math.max(1, 7 - info.slice(0, 3).length);
  const selected = state.menu.selected || 0;
  const start = Math.max(
    0,
    Math.min(selected - Math.floor(available / 2), entries.length - available)
  );
  const labels = entries.slice(start, start + available);
  return [
    page.toUpperCase().replaceAll('-', ' '),
    ...info.slice(0, 3),
    ...labels.map(
      (/** @type {[string, string]} */ [label], /** @type {number} */ index) =>
        `${index + start === selected ? '>' : ' '} ${label}`
    ),
    'A CHOOSE · B BACK · X CLOSE',
    'Y ASSIGN B',
  ];
}

/**
 * Handle selection and actions on the bounded water puzzle board.
 * @param {Record<string, any>} state Current game state.
 * @param {string[]} pressed Newly pressed actions.
 * @returns {Record<string, any>} Updated game state.
 */
function stepPuzzle(state, pressed) {
  let selected = state.puzzle.selectedCell ?? 7;
  const width = 5;
  if (pressed.includes('x')) {
    const needsReset =
      !state.puzzle.completed &&
      state.puzzle.route === 'commons' &&
      state.puzzle.fluid.solids[11] &&
      state.puzzle.editsUsed >= state.puzzle.editBudget;
    return {
      ...state,
      mode: 'world',
      puzzle: { ...state.puzzle, selectedCell: selected },
      toast: needsReset
        ? 'No edits remain. X menu → Actions → Reset flow board.'
        : state.toast,
    };
  }
  if (pressed.includes('left')) selected = Math.max(0, selected - 1);
  if (pressed.includes('right')) selected = Math.min(19, selected + 1);
  if (pressed.includes('up')) selected = Math.max(0, selected - width);
  if (pressed.includes('down')) selected = Math.min(19, selected + width);
  let puzzle = { ...state.puzzle, selectedCell: selected };
  if (pressed.includes('b'))
    puzzle = setWaterRoute(
      puzzle,
      puzzle.route === 'marsh' ? 'commons' : 'marsh'
    );
  if (pressed.includes('a'))
    puzzle =
      selected === 13
        ? openWaterGate(puzzle)
        : editWaterChannel(puzzle, selected);
  if (pressed.includes('y')) puzzle = advanceWaterPuzzle(puzzle, 60);
  const evidence = puzzle.completed
    ? [...new Set([...state.evidence, 'water-routed'])]
    : state.evidence;
  return {
    ...state,
    puzzle,
    evidence,
    journal: puzzle.completed
      ? [...new Set([...state.journal, 'water-routed'])]
      : state.journal,
    toast: puzzle.completed
      ? 'Water reaches the commons inlet. Return to the footbridge to decide.'
      : `Water ${Math.round(puzzle.fluid.volume[19] * 100)}% · ${puzzle.editsUsed}/${puzzle.editBudget} edits.`,
  };
}
