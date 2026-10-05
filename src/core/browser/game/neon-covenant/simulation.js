import { createWorld, movePlayer } from '../mosslight-valley/world.js';
import { targetInFront } from '../mosslight-valley/actors.js';
import { openDialogue, advanceDialogue } from '../mosslight-valley/dialogue.js';
import { createLab, manageLab, endShift, forecast } from './management.js';
import { labEntries, labMenuRows } from './controls.js';
import { availableContractPackages } from './contracts.js';
import { LAB_CONTENT } from './content.js';
import { employeeThoughts } from './personnel.js';
import {
  forecastShift,
  forecastPages,
  comparisonPages,
  labReportLines,
  readableLabPages,
  compareOrder,
} from './forecast.js';
import { researchOptions, researchPages } from './research.js';
import { evaluationPages } from './evaluation.js';
import { deploymentPages } from './operations.js';
import { relationshipPages, relationshipScene } from './relationships.js';
import { RELATIONSHIP_CONTENT } from './relationshipContent.js';
import { INFRASTRUCTURE } from './infrastructure.js';
import { orientationOrder, orientationStage } from './orientation.js';
import {
  controllerSelection,
  withControllerSelection,
} from '../mosslight-valley/controls.js';
import { toFramePayload } from '../mosslight-valley/renderer.js';
import { actForShift, availableChapterScenes } from './campaign.js';
import { rescueConsequence } from './distress.js';
import {
  applyPlanningOrder,
  clearPlanningOrders,
  undoPlanningOrder,
} from './planning.js';
import { SCENARIOS, startScenario } from './scenarios.js';

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
    status: `WF${state.lab.stakeholderStanding.workforce} CL${state.lab.stakeholderStanding.clinic} TU${state.lab.stakeholderStanding.transit} RG${state.lab.stakeholderStanding.regulator} IV${state.lab.stakeholderStanding.investor}`,
    menuRows: labMenuRows(state),
    forecast: forecastShift(state),
  };
  return { ...state, presentation };
}

/**
 * Preview and confirm a trusted equipment installation with Ion.
 * @param {Record<string, any>} state Current campaign before the order.
 * @param {Record<string, any>} next Closed-menu presentation state.
 * @param {string} command Selected authored infrastructure choice.
 * @returns {Record<string, any>} Readable preview or confirmation dialogue.
 */
function infrastructureChoice(state, next, command) {
  const id = command.slice('infra-choice:'.length);
  const option = INFRASTRUCTURE[id];
  const order = `infra:${id}`;
  const plan = compareOrder(state, order);
  return openDialogue(next, 'ion', [
    ...readableLabPages([{ text: option.detail }]),
    ...comparisonPages(state, order),
    {
      text: plan.accepted
        ? `Install ${option.name}? This costs ${option.cost}k and one attention. It does not settle the shift.`
        : 'No order is available. The current equipment and ledger remain unchanged.',
      choices: plan.accepted
        ? [
            { label: `Install ${option.name}`, command: order },
            { label: 'Keep current equipment' },
          ]
        : [{ label: 'Return to lab' }],
    },
  ]);
}

/**
 * Disclose emergency-note consequences before the signed management action.
 * @param {Record<string, any>} state Current campaign.
 * @param {Record<string, any>} next State with its menu closed.
 * @param {string} command Selected authored offer.
 * @returns {Record<string, any>} Terms dialogue or unavailable-note message.
 */
function rescueOfferDialogue(state, next, command) {
  const id = command.slice('rescue-offer:'.length);
  const offer = LAB_CONTENT.rescueOffers[id];
  const available =
    offer && state.lab.distress.status === 'open' && !state.lab.rescueFinancing;
  const pages = [
    {
      text: available
        ? `${offer.name}: receive ${offer.advance}k now; add ${offer.repayment}k due at shift 28. ${offer.ownership} The signed note is permanent and consumes one attention.`
        : 'This offer is unavailable: a distress window must be open, and only one rescue note may be signed.',
    },
    {
      text: 'Compare both offers freely before choosing. Signing does not end the shift.',
      choices: available
        ? [
            { label: `Sign ${offer.name}`, command: `rescue:${id}` },
            { label: 'Return without signing', command: 'page:distress' },
          ]
        : [{ label: 'Return to lab', command: 'page:distress' }],
    },
  ];
  return openDialogue(next, 'finance', pages);
}

/**
 * Resolve an inspection or signature for authored rescue financing.
 * @param {Record<string, any>} state Current campaign state.
 * @param {Record<string, any>} next Campaign with its menu closed.
 * @param {string} command Selected rescue operation.
 * @returns {Record<string, any>} Preview dialogue or signed campaign.
 */
function rescueCommand(state, next, command) {
  if (command.startsWith('rescue-offer:'))
    return rescueOfferDialogue(state, next, command);
  return openMenuPage(manageLab(next, command), 'distress');
}

/**
 * Resolve a relationship or stakeholder scene from its shared controller row.
 * @param {Record<string, any>} state Current campaign snapshot.
 * @param {Record<string, any>} next Snapshot with the menu closed.
 * @param {string} command Selected authored scene command.
 * @returns {Record<string, any>} Story dialogue for the selected scene.
 */
function peopleStoryCommand(state, next, command) {
  if (command.startsWith('arc-story:'))
    return openDialogue(
      next,
      command.slice(10),
      readableLabPages(
        relationshipPages(state.lab, command.slice(10), forecast(state.lab)),
        4
      )
    );
  return stakeholderDialogue(
    state,
    next,
    command.slice('stakeholder-story:'.length)
  );
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
 * Inspect a visible agreement package before allowing its signature.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {Record<string, any>} next Closed-menu snapshot.
 * @param {string} command Selected authored offer row.
 * @returns {Record<string, any>} Rejection panel or terms dialogue.
 */
function contractOfferDialogue(state, next, command) {
  const [, id, packageId] = command.split(':');
  const deal = LAB_CONTENT.contracts[id];
  const offer = deal?.packages[packageId];
  if (
    !offer ||
    !availableContractPackages(state.lab, id).includes(packageId) ||
    state.lab.contracts.includes(id)
  )
    return { ...state, menu: { page: `contract:${id}`, selected: 0 } };
  const impacts = Object.entries(offer.impact)
    .filter(([, value]) => value)
    .map(
      ([stakeholder, value]) =>
        `${LAB_CONTENT.stakeholders[stakeholder].name} ${value > 0 ? '+' : ''}${value} at signing`
    );
  const affected = impacts.length
    ? impacts.join('; ')
    : 'No standing changes at signing';
  const terms = [
    {
      text: `${deal.name}: ${offer.name}. Advance ${offer.advance}k; delivery deadline shift ${offer.deadline}; maximum invoice ${offer.daily}k per shift after delivery; service obligation costs ${offer.serviceCost}k per shift. ${offer.exclusive ? 'Exclusive: no other deal may be signed until this one is delivered or expires.' : 'Non-exclusive: other deals remain available.'}`,
    },
    {
      text: `Attribution ${offer.attribution ? 'is contractually protected' : 'is not promised'}. Ghost oversight term: ${offer.oversight}. A release with incompatible oversight will not fulfill the deal before its deadline. Affected now: ${affected}. Signing is permanent and is not undone at the Planning Desk. It costs one attention and no shift time; the advance, obligations and standing changes are real.`,
      choices: [
        { label: 'Sign these terms', command: `contract:${id}:${packageId}` },
        { label: 'Return to offers', command: `page:contract:${id}` },
      ],
    },
  ];
  return openDialogue(next, 'contract', terms);
}

/**
 * Start an authored stakeholder conversation when its id exists.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {Record<string, any>} next Closed-menu snapshot.
 * @param {string} id Stakeholder identifier.
 * @returns {Record<string, any>} Conversation or unchanged state.
 */
function stakeholderDialogue(state, next, id) {
  const group = LAB_CONTENT.stakeholders[id];
  return group
    ? openDialogue(next, `stakeholder-${id}`, [
        {
          text: `${group.name}, standing ${state.lab.stakeholderStanding[id]}/100. ${group.advice}`,
        },
      ])
    : state;
}

/**
 * Apply a confirmed package and return to that partner's offer list.
 * @param {Record<string, any>} next Closed-menu snapshot.
 * @param {string} command Confirmed signature command.
 * @returns {Record<string, any>} Updated contract ledger and controller.
 */
function signContract(next, command) {
  const result = manageLab(next, command);
  return Object.assign(result, {
    menu: { page: `contract:${command.split(':')[1]}`, selected: 0 },
  });
}

/**
 * Resolve a current-act briefing or earned archive scene.
 * @param {Record<string, any>} state Current campaign.
 * @param {Record<string, any>} next Closed-menu campaign.
 * @param {string} command Selected story operation.
 * @returns {Record<string, any> | null} Dialogue, rejected story or no match.
 */
function campaignStory(state, next, command) {
  if (command.startsWith('scenario:')) return scenarioCommand(next, command);
  if (command === 'campaign-story:act') {
    const act = actForShift(state.world.day);
    return openDialogue(next, 'campaign', [
      { text: `${act.briefing} ${act.pressure}` },
    ]);
  }
  if (!command.startsWith('campaign-story:')) return null;
  const id = command.slice('campaign-story:'.length);
  return availableChapterScenes(state.lab, state.world.day).includes(id)
    ? openDialogue(next, 'campaign', [{ text: LAB_CONTENT.chapterScenes[id] }])
    : state;
}

/**
 * Toggle the campaign's persisted audio preference.
 * @param {Record<string, any>} state Campaign snapshot.
 * @returns {Record<string, any>} Updated preference and player feedback.
 */
function toggleAudio(state) {
  return {
    ...state,
    audioMuted: !state.audioMuted,
    toast: state.audioMuted ? 'Music and sound on.' : 'Music and sound muted.',
  };
}

/**
 * Handle controller-only navigation commands without touching campaign rules.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {Record<string, any>} next Snapshot with its menu dismissed.
 * @param {string} command Selected navigation command.
 * @returns {Record<string, any> | null} Updated state or no match.
 */
function navigationCommand(state, next, command) {
  if (command.startsWith('page:')) return openMenuPage(next, command.slice(5));
  if (command.startsWith('bind:'))
    return {
      ...next,
      quickAction: command.slice(5),
      toast: `B: ${command.slice(5)}. Y: change shortcut.`,
    };
  if (command === 'close') return next;
  return null;
}

/**
 * Open one authored controller page with its selection reset.
 * @param {Record<string, any>} state Current campaign presentation.
 * @param {string} page Authored menu page identifier.
 * @returns {Record<string, any>} Campaign with that controller page open.
 */
function openMenuPage(state, page) {
  return { ...state, menu: { page, selected: 0 } };
}

/**
 * Confirm a new scenario only after disclosing which save slot will be replaced.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} command Scenario menu operation.
 * @returns {Record<string, any>} Confirmation dialogue or started scenario.
 */
function scenarioCommand(state, command) {
  const [, stage, id] = command.split(':');
  const definition = SCENARIOS[id];
  if (!definition) return state;
  if (stage === 'brief')
    return openDialogue(state, 'campaign', [
      {
        text: `${definition.name}. ${definition.objective} ${definition.route} Starting this scenario replaces the currently selected save slot. Other slots are untouched; export this slot first if you want to keep it.`,
        choices: [
          {
            label: 'Replace this slot and begin',
            command: `scenario:start:${id}`,
          },
          { label: 'Keep my campaign' },
        ],
      },
    ]);
  if (stage !== 'start') return state;
  const fresh = createNeonState();
  const lab = startScenario(fresh.lab, id);
  return openDialogue(
    { ...fresh, lab, lastActions: state.lastActions },
    'campaign',
    [
      { text: `${definition.name}. OBJECTIVE: ${definition.objective}` },
      { text: `FIELD NOTES: ${definition.route} A: continue. B: close.` },
    ]
  );
}

/**
 * Execute a selected menu operation with explicit modal ownership.
 * @param {Record<string, any>} state Campaign snapshot.
 * @param {string} command Selected row operation.
 * @returns {Record<string, any>} Next state.
 */
export function menuCommand(state, command) {
  const next = { ...state, menu: null };
  if (command.startsWith('plan:')) return planningCommand(state, command);
  const chapter =
    campaignStory(state, next, command) ||
    navigationCommand(state, next, command);
  if (chapter) return chapter;
  const boundary = irreversibleCommand(state, next, command);
  if (boundary) return boundary;
  if (
    command.startsWith('arc-story:') ||
    command.startsWith('stakeholder-story:')
  )
    return peopleStoryCommand(state, next, command);
  if (command.startsWith('contract-offer:'))
    return contractOfferDialogue(state, next, command);
  if (command.startsWith('rescue-offer:') || command.startsWith('rescue:'))
    return rescueCommand(state, next, command);
  if (command.startsWith('contract:')) return signContract(next, command);
  if (command.startsWith('arc:')) {
    const changed = manageLab(next, command);
    const [, kind, id] = command.split(':');
    return {
      ...changed,
      menu: {
        page: `relationship:${kind === 'consult' ? 'mae' : id}`,
        selected: 0,
      },
    };
  }
  if (command === 'operations-story')
    return openDialogue(
      next,
      'ion',
      readableLabPages(
        deploymentPages(state.lab, forecast(state.lab).throughput)
      )
    );
  if (command.startsWith('service:')) {
    const serviced = manageLab(next, command);
    return {
      ...serviced,
      menu: { page: `deployment:${command.split(':')[2]}`, selected: 0 },
    };
  }
  if (command.startsWith('case:'))
    return openDialogue(
      next,
      'sable',
      readableLabPages(evaluationPages(state.lab, command.slice(5)))
    );
  if (command.startsWith('test:')) {
    const tested = manageLab(next, command);
    return {
      ...tested,
      menu: { page: `testcase:${command.split(':')[2]}`, selected: 0 },
    };
  }
  if (command === 'program-story')
    return openDialogue(
      next,
      'research',
      readableLabPages(researchPages(state.lab))
    );
  if (command.startsWith('setting:')) {
    const [, axis, value] = command.split(':');
    const option = researchOptions(state.lab.focus, axis)[value];
    const commit = `configure:${axis}:${value}`;
    const plan = compareOrder(state, commit);
    return openDialogue(next, 'research', [
      ...readableLabPages([{ text: option.detail }]),
      ...comparisonPages(state, commit),
      {
        text: plan.accepted
          ? `Apply ${option.name}? ${plan.cost}k, ${plan.attention} attention. Only this program's evaluation is invalidated. No shift ends.`
          : 'No order is available. The current settings, credits and attention remain unchanged.',
        choices: plan.accepted
          ? [
              { label: 'Apply setting', command: commit },
              { label: 'Keep current settings' },
            ]
          : [{ label: 'Return to lab' }],
      },
    ]);
  }
  if (command.startsWith('infra-choice:'))
    return infrastructureChoice(state, next, command);
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
        { text: endingText(settled.lab.outcome, settled.lab) },
      ]);
    return { ...settled, menu: { page: 'report', selected: 0 } };
  }
  if (
    ['save', 'reset', 'export', 'import', 'fullscreen'].includes(command) ||
    command.startsWith('slot:')
  )
    return { ...next, controllerCommand: command };
  return applyPlanningOrder(next, command, manageLab);
}

/**
 * Route the two Planning Desk inverse operations.
 * @param {Record<string, any>} state Current campaign.
 * @param {string} command Selected order.
 * @returns {Record<string, any>} Updated campaign or invalid-order notice.
 */
function planningCommand(state, command) {
  if (command === 'plan:undo') return undoPlanningOrder(state);
  if (command === 'plan:clear') return clearPlanningOrders(state);
  return {
    ...state,
    menu: null,
    toast: 'Unknown Planning Desk order; nothing was changed.',
  };
}

/**
 * Handle audio and explicit permanent data choices.
 * @param {Record<string, any>} state Current campaign.
 * @param {Record<string, any>} next Campaign with the menu dismissed.
 * @param {string} command Selected operation.
 * @returns {Record<string, any> | null} Updated campaign or no match.
 */
function irreversibleCommand(state, next, command) {
  if (command === 'audio-toggle') return toggleAudio(state);
  if (command === 'data:scraped')
    return openDialogue(next, 'rights', [
      {
        text: 'Using unlicensed records is a permanent disclosure and cannot be undone at the Planning Desk. It raises scrutiny and can trigger a data-rights incident. Choosing “Use scraped data” spends one attention; returning here without disclosure spends nothing.',
        choices: [
          {
            label: 'Use scraped data / permanent',
            command: 'disclose:scraped',
          },
          { label: 'Keep licensed data' },
        ],
      },
    ]);
  if (command === 'disclose:scraped') return manageLab(next, 'data:scraped');
  return null;
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
    return openDialogue(
      state,
      'mae',
      readableLabPages([
        {
          text: `Mae: Atlas for the night clinic. ${deal.advance}k advance; release by shift ${deal.deadline}. Miss it: ${Math.ceil(deal.advance / 2)}k clawback.`,
        },
        {
          text: `Contract maximum: ${deal.daily}k per shift, scaled by adoption and reliability. Delivery needs 20% adoption and 70% reliability after evaluation and release.`,
        },
      ])
    );
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
 * @param {Record<string, any>} lab Final campaign ledger.
 * @returns {string} Epilogue text.
 */
function endingText(outcome, lab) {
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
  return [endings[outcome], rescueConsequence(lab)].filter(Boolean).join(' ');
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
    if (actor) {
      const lines = readableLabPages(
        [
          {
            text: `${staffConversation(state.lab, actor, content)} Promises and disagreements are permanent; the Planning Desk cannot undo them.`,
            choices: [
              {
                label: 'Make a commitment / 1 AP',
                command: `promise:${actor.id}`,
              },
              { label: 'Listen without promising' },
            ],
          },
        ],
        4
      );
      next = openDialogue(next, actor.id, lines);
    } else if (object) next.menu = { page: object.id, selected: 0 };
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
  const remembered = relationshipScene(lab, actor.id);
  if (!person) return `${story} ${remembered}`;
  return `${story} ${employeeThoughts(lab, person)[0]} ${remembered}`;
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
    ...Object.entries(state.lab.programs).map(([id, program]) => ({
      title: LAB_CONTENT.projects[id].name,
      status: `${state.lab.research[id]}/${LAB_CONTENT.projects[id].target}: ${program.milestones.join(', ') || 'research not started'}`,
    })),
    { title: 'Debt deadline / shift 28', status: `${state.lab.debt}k owed` },
    ...Object.entries(state.lab.relationships).map(([id, record]) => ({
      title: `${RELATIONSHIP_CONTENT[id].name} / ${record.stage}`,
      status: `Bond ${record.score}; proof ${record.streak}/2; fulfilled ${record.fulfillments}; disagreed ${record.disagreements}; breaches ${record.breaches}; repairs ${record.repairs}`,
    })),
    ...Object.entries(state.lab.stakeholderStanding).map(([id, score]) => ({
      title: `${LAB_CONTENT.stakeholders[id].name} / standing`,
      status: `${score}/100; watches ${LAB_CONTENT.stakeholders[id].concern}`,
    })),
    {
      title: `Act / ${actForShift(state.world.day).title}`,
      status: `Shift ${state.world.day}: ${actForShift(state.world.day).pressure}`,
    },
    ...availableChapterScenes(state.lab, state.world.day).map(id => ({
      title: `Archive / ${id}`,
      status: LAB_CONTENT.chapterScenes[id],
    })),
    { title: 'Earn a city covenant', status: `Trust ${state.lab.trust}/65` },
  ];
}
