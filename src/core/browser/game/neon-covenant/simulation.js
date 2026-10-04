import { createWorld, movePlayer } from '../mosslight-valley/world.js';
import { targetInFront } from '../mosslight-valley/actors.js';
import { openDialogue, advanceDialogue } from '../mosslight-valley/dialogue.js';
import { createLab, manageLab, endShift } from './management.js';
import { labEntries, labMenuRows } from './controls.js';
import { LAB_CONTENT } from './content.js';
import { employeeThoughts } from './personnel.js';
import {
  forecastShift,
  forecastPages,
  comparisonPages,
  labReportLines,
} from './forecast.js';
import { orientationOrder, orientationStage } from './orientation.js';
import {
  controllerSelection,
  withControllerSelection,
} from '../mosslight-valley/controls.js';
import { toFramePayload } from '../mosslight-valley/renderer.js';

/**
 * Recompute derived UI after every load rather than trusting saved presentation.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {unknown} Shared handheld frame.
 */
export function renderNeon(state) {
  return toFramePayload(present(state));
}

/**
 * Attach the presentation contract consumed by both shared renderers.
 * @param {Record<string, any>} state Campaign state.
 * @returns {Record<string, any>} Themed snapshot.
 */
function present(state) {
  const presentation = {
    palette: ['#111426', '#243344', '#52a7bc', '#f482ca'],
    status: `${state.lab.cash}k RISK ${state.lab.risk} AP ${state.lab.decisions}`,
    menuRows: labMenuRows(state),
    forecast: forecastShift(state),
  };
  return { ...state, presentation };
}

/**
 * Create a campaign and start the readable first-run plot hook.
 * @param {Record<string, any>} content Authored rooms and cast.
 * @returns {Record<string, any>} Shared-engine campaign state.
 */
export function createNeonState(content = LAB_CONTENT) {
  const world = {
    ...createWorld(content),
    weather: 'indoor',
    npcs: content.npcs,
  };
  return present(
    openDialogue(
      {
        world,
        lab: createLab(),
        inventory: {},
        journal: [],
        battle: null,
        ending: null,
        mode: 'world',
        tick: 0,
        moveCooldown: 0,
        lastActions: [],
        quickAction: 'ledger',
        menu: null,
        controllerCommand: null,
        toast: 'A: continue introduction. B: close. X: menu.',
      },
      'intro',
      content.introduction
    )
  );
}

/**
 * Execute a selected menu operation with explicit modal ownership.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string} command Selected row operation.
 * @returns {Record<string, any>} Next state.
 */
function menuCommand(state, command) {
  const next = { ...state, menu: null };
  if (command.startsWith('lesson:')) return lessonCommand(next, command);
  if (command === 'preview-shift')
    return openDialogue(next, 'forecast', forecastPages(state));
  if (command.startsWith('preview:'))
    return openDialogue(
      next,
      'forecast',
      comparisonPages(state, command.slice(8))
    );
  if (command.startsWith('thoughts:')) {
    const person = state.lab.employees.find(
      (/** @type {Record<string, any>} */ entry) =>
        entry.id === command.slice(9)
    );
    return openDialogue(
      next,
      person.id,
      employeeThoughts(state.lab, person).map(text => ({ text }))
    );
  }
  if (command.startsWith('page:'))
    return { ...next, menu: { page: command.slice(5), selected: 0 } };
  if (command.startsWith('bind:'))
    return {
      ...next,
      quickAction: command.slice(5),
      toast: `B: ${command.slice(5)}. Y: change shortcut.`,
    };
  if (command === 'close') return next;
  if (command === 'report-next')
    return {
      ...state,
      menu: {
        ...state.menu,
        reportPage:
          ((state.menu.reportPage || 0) + 1) %
          Math.ceil(labReportLines(state.lab.report).length / 3),
      },
    };
  if (command === 'guide')
    return openDialogue(next, 'intro', LAB_CONTENT.introduction);
  if (command === 'shift') {
    const settled = endShift(next);
    if (settled.lab.outcome)
      return openDialogue(settled, 'resolution', [
        {
          text: `RESOLUTION: ${settled.lab.outcome.toUpperCase()}. Cash ${settled.lab.cash}k. Debt ${settled.lab.debt}k. Trust ${settled.lab.trust}.`,
        },
        { text: endingText(settled.lab.outcome) },
      ]);
    return { ...settled, menu: { page: 'report', selected: 0 } };
  }
  if (
    ['save', 'reset', 'export', 'import', 'fullscreen'].includes(command) ||
    command.startsWith('slot:')
  )
    return { ...next, controllerCommand: command };
  return manageLab(next, command);
}

/**
 * Inspect or execute the first-shift lesson with ordinary modal ownership.
 * @param {Record<string, any>} state Campaign with a closed menu.
 * @param {string} command Selected lesson operation.
 * @returns {Record<string, any>} Actual campaign, never a tutorial sandbox.
 */
function lessonCommand(state, command) {
  if (command === 'lesson:terms') {
    const deal = LAB_CONTENT.contracts.clinic;
    return openDialogue(state, 'mae', [
      {
        text: `Mae: Atlas for the night clinic. ${deal.advance}k advance; release by shift ${deal.deadline}. Miss it: ${Math.ceil(deal.advance / 2)}k clawback.`,
      },
      {
        text: `Delivered service pays ${deal.daily}k per shift. Training alone is not delivery: evaluate the latest checkpoint before release.`,
      },
    ]);
  }
  if (command === 'lesson:forecast') {
    const stage = orientationStage(state);
    const next =
      stage === 3
        ? { ...state, lab: { ...state.lab, firstShiftGuide: 4 } }
        : state;
    return openDialogue(
      next,
      'forecast',
      stage === 1 ? comparisonPages(state, 'cooling') : forecastPages(state)
    );
  }
  return orientationOrder(state, command);
}

/**
 * Describe consequences of the management resolution.
 * @param {string} outcome Resolution identity.
 * @returns {string} Epilogue text.
 */
function endingText(outcome) {
  const endings = /** @type {Record<string, string>} */ ({
    insolvent:
      'The lights go out. Mae saves the clinic code. Your team scatters, but your mistakes remain in the open register.',
    acquired:
      'Helios pays the debt and owns the lab. Your staff keep their jobs. The city loses another place where no could mean no.',
    'gilded-cage':
      'The lab survives. Your models grow powerful, but locked gates and incident hearings replace the clinic waiting room.',
    'city-covenant':
      'Two useful models, a trusted team, and a city covenant. The clinic and transit union become co-owners. Nobody gets erased from the paper.',
    independent:
      'You pay the debt and keep the keys. The lab is small, useful, and independent. Tomorrow is yours to negotiate.',
    'quiet-lab':
      'The lab survives without a release. You protected your staff, but the city still waits. A quiet lab can begin again.',
  });
  return endings[outcome];
}

/**
 * Consume menu directions and buttons before suspended dialogue or walking.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string[]} pressed New button presses.
 * @returns {Record<string, any>} Menu transition.
 */
function stepMenu(state, pressed) {
  if (pressed.includes('x')) return { ...state, menu: null };
  if (pressed.includes('b'))
    return state.menu.page === 'main'
      ? { ...state, menu: null }
      : { ...state, menu: { page: 'main', selected: 0 } };
  if (pressed.includes('y'))
    return { ...state, menu: { page: 'assign', selected: 0 } };
  const entries = labEntries(state);
  const next = withControllerSelection(
    state,
    controllerSelection(state.menu.selected, pressed, entries.length)
  );
  return pressed.includes('a')
    ? menuCommand(next, entries[next.menu.selected][1])
    : next;
}

/**
 * Advance readable conversations without leaking button presses into world rules.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string[]} pressed New button presses.
 * @returns {Record<string, any>} Conversation transition.
 */
function stepConversation(state, pressed) {
  if (pressed.includes('b')) return { ...state, dialogue: null };
  const choices = state.dialogue.choices;
  if (!choices.length)
    return pressed.includes('a') ? advanceDialogue(state) : state;
  const delta = pressed.includes('down') ? 1 : pressed.includes('up') ? -1 : 0;
  const selected =
    ((state.dialogue.selected || 0) + delta + choices.length) % choices.length;
  const next = { ...state, dialogue: { ...state.dialogue, selected } };
  if (!pressed.includes('a')) return next;
  return choices[selected].command
    ? menuCommand({ ...next, dialogue: null }, choices[selected].command)
    : { ...next, dialogue: null };
}

/**
 * Step the lab using exactly the shared eight-button controller alphabet.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string[]} actions Held or submitted buttons.
 * @param {Record<string, any>} content Authored rooms and cast.
 * @param {number} deltaMs Simulation interval.
 * @returns {Record<string, any>} Deterministic next state.
 */
export function stepNeon(
  state,
  actions = [],
  content = LAB_CONTENT,
  deltaMs = 125
) {
  const buttons = actions.filter(action =>
    ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y'].includes(action)
  );
  const pressed = buttons.filter(action => !state.lastActions.includes(action));
  let next = /** @type {Record<string, any>} */ ({
    ...state,
    tick: state.tick + 1,
    moveCooldown: Math.max(0, state.moveCooldown - deltaMs),
  });
  if (state.menu) next = stepMenu(next, pressed);
  else if (pressed.includes('x') || pressed.includes('y'))
    next.menu = {
      page: pressed.includes('y') ? 'assign' : 'main',
      selected: 0,
    };
  else if (state.dialogue) next = stepConversation(next, pressed);
  else if (pressed.includes('b'))
    next.menu = { page: state.quickAction, selected: 0 };
  else if (pressed.includes('a')) {
    const { actor, object } = targetInFront(next);
    if (actor)
      next = openDialogue(next, actor.id, [
        {
          text: staffConversation(state.lab, actor, content),
          choices: [
            {
              label: 'Make a commitment / 1 AP',
              command: `promise:${actor.id}`,
            },
            { label: 'Listen without promising' },
          ],
        },
      ]);
    else if (object) next.menu = { page: object.id, selected: 0 };
    else next.toast = 'Face a person or lit terminal. X: lab menu.';
  } else {
    const direction = ['up', 'down', 'left', 'right'].find(button =>
      buttons.includes(button)
    );
    if (direction && !next.moveCooldown) {
      next.world = movePlayer(next.world, direction, content);
      next.moveCooldown = 125;
    }
  }
  return present({ ...next, lastActions: buttons });
}

/**
 * Tie a colleague's authored story to actionable current working conditions.
 * @param {Record<string, any>} lab Current ledger.
 * @param {Record<string, any>} actor Person being addressed.
 * @param {Record<string, any>} content Authored stories.
 * @returns {string} Story and contextual concern.
 */
function staffConversation(lab, actor, content) {
  const person = lab.employees.find(
    (/** @type {Record<string, any>} */ entry) => entry.id === actor.id
  );
  const story = content.staffStories[actor.id];
  if (!person) return story;
  return `${story} ${employeeThoughts(lab, person)[0]}`;
}

/**
 * Expose management objectives through the shared runtime observation API.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {object[]} Objectives and actual progress.
 */
export function labJournal(state) {
  return [
    { title: 'Keep the lights on', status: `${state.lab.cash}k cash` },
    {
      title: 'Deliver useful models',
      status: `${state.lab.deployed.length}/3 deployed`,
    },
    { title: 'Debt deadline / shift 28', status: `${state.lab.debt}k owed` },
    { title: 'Earn a city covenant', status: `Trust ${state.lab.trust}/65` },
  ];
}
