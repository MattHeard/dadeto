/**
 * Cozy state names supported by the text adventure.
 * @typedef {'intro'|'yard'|'foundation'|'materials'|'roof'|'garden'} CozyState
 */

/**
 * Saved per-player state for this toy.
 * @typedef {object} CozyScopedState
 * @property {string} [name] Player name captured on first command.
 * @property {CozyState} [state] Last persisted story state.
 * @property {string[]} [inventory] Collected cozy items and milestones.
 * @property {string[]} [progress] Completed construction milestones.
 */

/**
 * Data envelope returned by `getData`.
 * @typedef {object} CozyDataEnvelope
 * @property {{COZY1?: CozyScopedState}} [temporary] Temporary storage bucket.
 */

/**
 * Environment map passed to toys.
 * @typedef {Map<'getRandomNumber'|'getCurrentTime'|'getData'|'setLocalTemporaryData', Function>} CozyEnvironment
 */

/**
 * Runtime context used while processing one command.
 * @typedef {object} CozyRuntimeContext
 * @property {string} name Player name.
 * @property {CozyState} state Current state.
 * @property {string} lowerInput Normalized lowercase input.
 * @property {string[]} inventory Current inventory copy.
 * @property {string[]} progress Current progress copy.
 * @property {() => string} getCurrentTime Current time provider.
 * @property {() => number} getRandomNumber Random provider.
 * @property {(data: CozyDataEnvelope) => void} setLocalTemporaryData Temporary state writer.
 */

const COZY_KEY = 'COZY1';

const BUILD_REQUIREMENTS = {
  foundation: {
    command: 'level soil',
    prompt:
      '> You mark out the footprint and set cedar beams. Type `level soil` to finish the foundation.',
    reward: 'The foundation settles perfectly and smells like fresh cedar.',
  },
  materials: {
    command: 'pack insulation',
    prompt:
      '> You check the supply wagon. Type `pack insulation` to stock cozy materials.',
    reward:
      'You stack wool insulation, linen curtains, and reclaimed pine flooring.',
  },
  roof: {
    command: 'lay shingles',
    prompt: '> You climb the scaffold. Type `lay shingles` to finish the roof.',
    reward: 'The roof clicks into place, and rain now sounds soft and musical.',
  },
  garden: {
    command: 'plant herbs',
    prompt:
      '> You kneel beside raised beds. Type `plant herbs` to complete the garden.',
    reward:
      'Mint, thyme, and lavender line the windows beneath the porch rail.',
  },
};

const REQUIRED_STAGES = ['foundation', 'materials', 'roof', 'garden'];

/**
 * Read a required helper from the environment map.
 * @template {Function} T
 * @param {CozyEnvironment} env Environment map from toy runtime.
 * @param {'getRandomNumber'|'getCurrentTime'|'getData'|'setLocalTemporaryData'} key Dependency name.
 * @param {string} label Human-readable dependency label.
 * @returns {T} Retrieved helper function.
 */
function requireEnvFunction(env, key, label) {
  const dependency = /** @type {T | undefined} */ (env.get(key));
  if (!dependency) {
    throw new Error(`Missing ${label} dependency for cozy house adventure.`);
  }

  return dependency;
}

/**
 * Resolve the COZY1 state bucket from the env data object.
 * @param {CozyDataEnvelope} data Toy data envelope.
 * @returns {CozyScopedState} Saved state for this toy.
 */
function getScopedState(data) {
  if (!data.temporary) {
    return {};
  }

  return getTemporaryState(data.temporary);
}

/**
 * Resolve the scoped toy state from the temporary bucket.
 * @param {{COZY1?: CozyScopedState}} temporary Temporary storage bucket.
 * @returns {CozyScopedState} Saved state for this toy.
 */
function getTemporaryState(temporary) {
  if (!temporary[COZY_KEY]) {
    return {};
  }

  return temporary[COZY_KEY];
}

/**
 * Build the first message shown to a new player.
 * @param {string} name Player name.
 * @returns {string} Introductory narrative.
 */
function introMessage(name) {
  return [
    `> Welcome home, ${name}.`,
    '> A gentle rain taps the porch while your tiny-house project waits in the yard.',
    "> Type 'build' when you're ready to start laying out your cozy home.",
  ].join('\n');
}

/**
 * Build the yard command hub message.
 * @param {string} time Current time string.
 * @returns {string} Hub prompt text.
 */
function yardMessage(time) {
  return [
    `> ${time} — You stand in the yard with tea in hand and a warm checklist.`,
    '> Next tasks: foundation / materials / roof / garden.',
    '> What would you like to do?',
  ].join('\n');
}

/**
 * Determine the stage command selected while in the yard.
 * @param {string} lowerInput Normalized command text.
 * @returns {CozyState|'yard'} Selected stage name or `yard` when no match exists.
 */
function resolveYardSelection(lowerInput) {
  const stages = Object.keys(BUILD_REQUIREMENTS);
  const match = stages.find(stage => lowerInput.includes(stage));
  if (!match) {
    return 'yard';
  }

  return /** @type {CozyState} */ (match);
}

/**
 * Handle commands entered while the player is at the yard hub.
 * @param {CozyRuntimeContext} context Runtime context.
 * @returns {{output: string, state: CozyState, inventory: string[], progress: string[]}} Story transition payload.
 */
function handleYard(context) {
  const selection = resolveYardSelection(context.lowerInput);
  if (selection === 'yard') {
    return {
      output: '> The plan is simple: foundation / materials / roof / garden.',
      state: 'yard',
      inventory: context.inventory,
      progress: context.progress,
    };
  }

  return {
    output: BUILD_REQUIREMENTS[selection].prompt,
    state: selection,
    inventory: context.inventory,
    progress: context.progress,
  };
}

/**
 * Add a completed stage to inventory and progress when missing.
 * @param {{inventory: string[], progress: string[]}} value Existing state lists.
 * @param {string} stage Stage name to add.
 * @returns {{inventory: string[], progress: string[]}} Updated state lists.
 */
function addCompletedStage(value, stage) {
  const nextInventory = appendIfMissing(value.inventory, stage);
  const nextProgress = appendIfMissing(value.progress, stage);

  return { inventory: nextInventory, progress: nextProgress };
}

/**
 * Return a copied array with the item appended only when missing.
 * @param {string[]} list Existing list value.
 * @param {string} item Item to ensure exists.
 * @returns {string[]} Updated list copy.
 */
function appendIfMissing(list, item) {
  const next = [...list];
  if (!next.includes(item)) {
    next.push(item);
  }

  return next;
}

/**
 * Determine whether all construction milestones are complete.
 * @param {string[]} progress Completed milestones.
 * @returns {boolean} True when all required stages are complete.
 */
function isHouseComplete(progress) {
  return REQUIRED_STAGES.every(stage => progress.includes(stage));
}

/**
 * Build the completion status line shown after a successful stage command.
 * @param {string[]} progress Completed milestones.
 * @returns {string} Completion status message.
 */
function getCompletionLine(progress) {
  if (isHouseComplete(progress)) {
    return '> The tiny house glows with lantern light. You built a peaceful home!';
  }

  return '> Nice work. Return to the yard for the next cozy task.';
}

/**
 * Handle a single construction stage.
 * @param {CozyRuntimeContext} context Runtime context.
 * @param {'foundation'|'materials'|'roof'|'garden'} stage Stage name.
 * @returns {{output: string, state: CozyState, inventory: string[], progress: string[]}} Story transition payload.
 */
function handleBuildStage(context, stage) {
  const requirement = BUILD_REQUIREMENTS[stage];
  if (!context.lowerInput.includes(requirement.command)) {
    return {
      output: `> Not quite. Try \`${requirement.command}\` to finish ${stage}.`,
      state: stage,
      inventory: context.inventory,
      progress: context.progress,
    };
  }

  const updated = addCompletedStage(context, stage);
  return {
    output: `> ${requirement.reward}\n${getCompletionLine(updated.progress)}`,
    state: 'yard',
    inventory: updated.inventory,
    progress: updated.progress,
  };
}

/**
 * Build a runtime context object from scoped saved state and env functions.
 * @param {string} input Raw player input.
 * @param {CozyScopedState} scoped Saved toy state.
 * @param {CozyEnvironment} env Environment map.
 * @returns {CozyRuntimeContext} Prepared runtime context.
 */
function createRuntimeContext(input, scoped, env) {
  const getCurrentTime = /** @type {() => string} */ (
    requireEnvFunction(env, 'getCurrentTime', 'time provider')
  );
  const getRandomNumber = /** @type {() => number} */ (
    requireEnvFunction(env, 'getRandomNumber', 'random number generator')
  );
  const setLocalTemporaryData =
    /** @type {(data: CozyDataEnvelope) => void} */ (
      requireEnvFunction(env, 'setLocalTemporaryData', 'temporary state setter')
    );
  const name = getPlayerName(scoped, input);
  const state = getPlayerState(scoped);

  return {
    name,
    state,
    lowerInput: input.trim().toLowerCase(),
    inventory: [...getStoredList(scoped.inventory)],
    progress: [...getStoredList(scoped.progress)],
    getCurrentTime,
    getRandomNumber,
    setLocalTemporaryData,
  };
}

/**
 * Resolve a player name using saved state and command input.
 * @param {CozyScopedState} scoped Saved toy state.
 * @param {string} input Raw player input.
 * @returns {string} Resolved player name.
 */
function getPlayerName(scoped, input) {
  return scoped.name || getInputName(input);
}

/**
 * Resolve a player name directly from command input with fallback.
 * @param {string} input Raw player input.
 * @returns {string} Name resolved from input.
 */
function getInputName(input) {
  const trimmed = input.trim();
  if (trimmed) {
    return trimmed;
  }

  return 'Builder';
}

/**
 * Resolve the active player state.
 * @param {CozyScopedState} scoped Saved toy state.
 * @returns {CozyState} Active state value.
 */
function getPlayerState(scoped) {
  if (!scoped.state) {
    return 'intro';
  }

  return scoped.state;
}

/**
 * Return a safe stored string list.
 * @param {string[] | undefined} items Optional saved list.
 * @returns {string[]} Normalized array value.
 */
function getStoredList(items) {
  if (!items) {
    return [];
  }

  return items;
}

/**
 * Persist the toy runtime context after a transition.
 * @param {CozyRuntimeContext} context Runtime context.
 * @param {{state: CozyState, inventory: string[], progress: string[]}} result Transition result to save.
 * @returns {void}
 */
function persistTransition(context, result) {
  context.setLocalTemporaryData({
    temporary: {
      [COZY_KEY]: {
        name: context.name,
        state: result.state,
        inventory: result.inventory,
        progress: result.progress,
      },
    },
  });
}

/**
 * Persist first-visit state and return intro text.
 * @param {CozyRuntimeContext} context Runtime context.
 * @returns {string} Intro message.
 */
function handleFirstVisit(context) {
  persistTransition(context, {
    state: 'intro',
    inventory: context.inventory,
    progress: context.progress,
  });

  return introMessage(context.name);
}

/**
 * Handle commands while state is `intro`.
 * @param {CozyRuntimeContext} context Runtime context.
 * @returns {string} Intro state response text.
 */
function handleIntroState(context) {
  if (!context.lowerInput.includes('build')) {
    return "> When you're ready, type 'build' to begin your house project.";
  }

  persistTransition(context, {
    state: 'yard',
    inventory: ['tea thermos'],
    progress: context.progress,
  });
  return yardMessage(context.getCurrentTime());
}

/**
 * Select a state handler for the active state.
 * @param {CozyState} state Active state.
 * @returns {(context: CozyRuntimeContext) => {output: string, state: CozyState, inventory: string[], progress: string[]}} Handler function.
 */
function getStateHandler(state) {
  const handlers = {
    yard: handleYard,
    foundation: context => handleBuildStage(context, 'foundation'),
    materials: context => handleBuildStage(context, 'materials'),
    roof: context => handleBuildStage(context, 'roof'),
    garden: context => handleBuildStage(context, 'garden'),
    intro: handleYard,
  };

  return handlers[state] || handleYard;
}

/**
 * Build optional random flavor text.
 * @param {number} randomValue Value from random provider.
 * @returns {string} Flavor suffix text.
 */
function getBonusText(randomValue) {
  if (randomValue > 0.8) {
    return '\n> A robin lands nearby and approves of your craftsmanship.';
  }

  return '';
}

/**
 * Run non-intro state transition and persist results.
 * @param {CozyRuntimeContext} context Runtime context.
 * @returns {string} Transition output text.
 */
function runStateTransition(context) {
  const handler = getStateHandler(context.state);
  const result = handler(context);
  persistTransition(context, result);

  const bonus = getBonusText(context.getRandomNumber());
  return `${result.output}${bonus}`;
}

/**
 * Process one command with already-known player state.
 * @param {CozyRuntimeContext} context Runtime context.
 * @returns {string} Output text.
 */
function processKnownPlayer(context) {
  if (context.state === 'intro') {
    return handleIntroState(context);
  }

  return runStateTransition(context);
}

/**
 * Core adventure processor.
 * @param {string} input Raw player command.
 * @param {CozyEnvironment} env Environment helper map.
 * @returns {string} Output narrative.
 */
function runAdventure(input, env) {
  const getData = /** @type {() => CozyDataEnvelope} */ (
    requireEnvFunction(env, 'getData', 'state accessor')
  );
  const scoped = getScopedState(getData());
  const context = createRuntimeContext(input, scoped, env);

  if (!scoped.name) {
    return handleFirstVisit(context);
  }

  return processKnownPlayer(context);
}

/**
 * Cozy house construction themed text adventure toy.
 * @param {string} input Player command.
 * @param {CozyEnvironment} env Environment helper map.
 * @returns {string} Narrative response text.
 */
export function cozyHouseAdventure(input, env) {
  try {
    return runAdventure(input, env);
  } catch {
    return '> SYSTEM ERROR: fireplace smoke in the command line';
  }
}
