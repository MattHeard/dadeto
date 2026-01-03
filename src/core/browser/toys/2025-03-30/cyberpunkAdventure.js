/**
 * Adventure state identifiers used by handlers.
 * @typedef {'intro'|'hub'|'hacker:door'|'transport:platform'|'transport:trade'|'alley:stealth'} AdventureState
 */

/**
 * Structured response emitted by each adventure handler.
 * @typedef {object} AdventureResult
 * @property {string} output - Message displayed to the player.
 * @property {AdventureState} nextState - Next adventure state.
 * @property {string[]} [nextInventory] - Optional inventory updates.
 * @property {Set<string>} [nextVisited] - Optional visited locations updates.
 */

/**
 * Helper mapping of class names to text responses.
 * @typedef {Record<'hacker'|'transport'|'alley', AdventureResult>} HubKeywordMap
 */

/**
 * Valid keywords processed while in the hub.
 * @typedef {'hacker'|'transport'|'alley'} HubKeyword
 */

/**
 * Inventory and visited metadata exchanged between handlers.
 * @typedef {object} AdventureInventoryState
 * @property {string[]} inventory - Pending inventory entries.
 * @property {Set<string>} visited - Locations visited so far.
 */

/**
 * Temporary state container stored under the CYBE1 key.
 * @typedef {object} AdventureTemporaryScope
 * @property {AdventureScopedState} [CYBE1] - Stored adventure attributes kept between turns.
 */

/**
 * Top-level data envelope exposed by the getData helper.
 * @typedef {object} AdventureDataEnvelope
 * @property {AdventureTemporaryScope} [temporary] - Container for transient toy state.
 */

/**
 * Installer for temporary state mutations.
 * @typedef {(data: AdventureDataEnvelope) => void} AdventureStateSetter
 */

/**
 * Recognised environment keys shared with the toy harness.
 * @typedef {'getRandomNumber'|'getCurrentTime'|'getData'|'setLocalTemporaryData'} AdventureEnvKey
 */

/**
 * Environment functions exposed to toys.
 * @typedef {Map<AdventureEnvKey, Function>} AdventureEnvironment
 */

/**
 * Handler invoked for each adventure state.
 * @callback AdventureHandler
 * @param {AdventureContext} context
 * @returns {AdventureResult}
 */

/**
 * Context passed to every story handler.
 * @typedef {object} AdventureContext
 * @property {AdventureState} state - Current adventure state name.
 * @property {string} name - Player name.
 * @property {string} time - Current time string.
 * @property {string} lowerInput - Normalized player input.
 * @property {string[]} nextInventory - Inventory queued for the next step.
 * @property {Set<string>} nextVisited - Visited locations.
 * @property {() => number} getRandomNumber - RNG helper from the environment.
 */

/**
 * @typedef {object} AdventureScopedState
 * @property {string} [name] - Stored player name.
 * @property {AdventureState} [state] - Last known adventure state.
 * @property {string[]} [inventory] - Previously saved inventory entries.
 * @property {string[]} [visited] - Previously observed locations.
 */

/**
 * Resolve the interaction at the hacker door.
 * @param {AdventureContext} context - Player context for this step.
 * @returns {AdventureResult} Resulting state transition information.
 */
function handleHackerDoor(context) {
  if (context.lowerInput.includes('zero')) {
    const output = `> Password accepted. Inside, a rogue AI offers you a cracked implant.`;
    context.nextInventory.push('cracked implant');
    context.nextVisited.add('hacker');
    return respondWithContext(context, output, 'hub');
  } else {
    return respondWithContext(
      context,
      `> Hint: the password is a number and a name...`,
      'hacker:door'
    );
  }
}

/**
 * Produce the introductory message for the adventure.
 * @param {AdventureContext} context - Player name and current time.
 * @returns {AdventureResult} Introductory prompt and state.
 */
function handleIntro(context) {
  const { name, time } = context;
  return {
    output: `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`,
    nextState: 'hub',
  };
}

/**
 * Find a keyword contained within the player's input.
 * @param {string} lowerInput - Normalised player input.
 * @param {HubKeywordMap} keywordMap - Map of keywords to responses.
 * @returns {HubKeyword|undefined} The matched keyword if found.
 */
function findMatchingKeyword(lowerInput, keywordMap) {
  const keys = /** @type {HubKeyword[]} */ (Object.keys(keywordMap));
  return keys.find(keyword => lowerInput.includes(keyword));
}

/**
 * Handle input while the player is in the hub area.
 * @param {AdventureContext} context - Object containing normalised input.
 * @returns {AdventureResult} Hub response and next state.
 */
function handleHub(context) {
  const { lowerInput } = context;
  const keywordMap = /** @type {HubKeywordMap} */ ({
    hacker: {
      output: `> You approach the Hacker Den. The door requires a password.`,
      nextState: 'hacker:door',
    },
    transport: {
      output: `> You head to the Transport Hub. Trains screech overhead.`,
      nextState: 'transport:platform',
    },
    alley: {
      output: `> You slip into the Back Alley. The shadows move with you.`,
      nextState: 'alley:stealth',
    },
  });
  const match = findMatchingKeyword(lowerInput, keywordMap);
  if (match) {
    const keyword = /** @type {HubKeyword} */ (match);
    return keywordMap[keyword];
  }
  return {
    output: `> Unclear direction. Options: hacker / transport / alley`,
    nextState: 'hub',
  };
}

/**
 * Describe the transport platform scene.
 * @returns {AdventureResult} Narrative response.
 */
function handleTransportPlatform() {
  return {
    output: `> A vendor offers you a neural ticket in exchange for your datapad.`,
    nextState: 'transport:trade',
  };
}

/**
 * Determine whether the player wants to trade the datapad.
 * @param {string[]} nextInventory - Pending inventory items.
 * @param {string} lowerInput - Normalised player input.
 * @returns {boolean} True when the trade should occur.
 */
function shouldTradeDatapad(nextInventory, lowerInput) {
  return nextInventory.includes('datapad') && lowerInput.includes('trade');
}

/**
 * Handle the trade interaction at the transport vendor.
 * @param {AdventureContext} context - Player context for the trade.
 * @returns {AdventureResult} Trade result and next state.
 */
function handleTransportTrade(context) {
  const { nextInventory, nextVisited, lowerInput } = context;
  const tradeSuccess = shouldTradeDatapad(nextInventory, lowerInput);
  let inventory = nextInventory;
  let output = `> Do you want to trade? Type 'trade datapad'.`;
  let nextState = /** @type {AdventureState} */ ('transport:trade');

  if (tradeSuccess) {
    const newInventory = nextInventory.filter(item => item !== 'datapad');
    newInventory.push('neural ticket');
    nextVisited.add('transport');
    inventory = newInventory;
    output = `> You hand over the datapad. The vendor grins and slips you the neural ticket.`;
    nextState = 'hub';
  }

  return respondWithInventoryState(output, nextState, {
    inventory,
    visited: nextVisited,
  });
}

/**
 * Attempt to sneak through the alley.
 * @param {AdventureContext} context - Utilities and player state.
 * @returns {AdventureResult} Outcome of the stealth attempt.
 */
function handleAlleyStealth(context) {
  const { getRandomNumber, nextInventory, nextVisited } = context;
  const stealthCheck = getRandomNumber();
  const success = stealthCheck > 0.3;
  let output = `> You trip a wire. Sirens start up. You sprint back to the Market.`;
  if (success) {
    nextInventory.push('stimpack');
    nextVisited.add('alley');
    output = `> You dodge the shadows and find a hidden stash: a stimpack.`;
  }

  return respondWithInventoryState(output, 'hub', {
    inventory: nextInventory,
    visited: nextVisited,
  });
}

/**
 * Provide a fallback result when no handler matches the state.
 * @returns {AdventureResult} Default response.
 */
function getDefaultAdventureResult() {
  return { output: `> Glitch in the grid. Resetting...`, nextState: 'intro' };
}

/**
 * Assemble the transition payload for inventory-aware responses.
 * @param {string} output Text to show to the player.
 * @param {AdventureState} nextState Next adventure state.
 * @param {AdventureInventoryState} state Inventory and visited mapping.
 * @returns {AdventureResult} Combined response.
 */
function respondWithInventory(output, nextState, { inventory, visited }) {
  return buildAdventureResponse({
    output,
    nextState,
    nextInventory: inventory,
    nextVisited: visited,
  });
}

/**
 * Respond using the context's inventory/visit tracking.
 * @param {AdventureContext} context Response context.
 * @param {string} output Text to show.
 * @param {AdventureState} nextState Next adventure state.
 * @returns {AdventureResult} Transition response.
 */
function respondWithContext(context, output, nextState) {
  return respondWithInventory(output, nextState, {
    inventory: context.nextInventory,
    visited: context.nextVisited,
  });
}

/**
 * Respond with explicitly supplied inventory data.
 * @param {string} output Text to show.
 * @param {AdventureState} nextState Next adventure state.
 * @param {AdventureInventoryState} state Inventory/visited bundle.
 * @returns {AdventureResult} Transition response.
 */
function respondWithInventoryState(output, nextState, state) {
  return respondWithInventory(output, nextState, state);
}

/**
 * Assemble the common response structure for transitions that touch inventory.
 * @param {{output: string, nextState: AdventureState, nextInventory: string[], nextVisited: Set<string>}} options
 *   Response details and mutated state references.
 * @returns {AdventureResult} Composed response.
 */
function buildAdventureResponse({
  output,
  nextState,
  nextInventory,
  nextVisited,
}) {
  return {
    output,
    nextState,
    nextInventory,
    nextVisited,
  };
}

/**
 * Execute the handler for the current adventure state.
 * @param {AdventureContext} context - Current player context.
 * @returns {AdventureResult} Resulting state data.
 */
function getAdventureResult(context) {
  const stateHandlers =
    /** @type {Record<AdventureState, AdventureHandler>} */ ({
      intro: handleIntro,
      hub: handleHub,
      'hacker:door': handleHackerDoor,
      'transport:platform': handleTransportPlatform,
      'transport:trade': handleTransportTrade,
      'alley:stealth': handleAlleyStealth,
    });
  const handler = stateHandlers[context.state];
  if (handler) {
    return handler(context);
  } else {
    return getDefaultAdventureResult();
  }
}

/**
 * Extract temporary adventure data from the environment.
 * @param {AdventureDataEnvelope} data - Full data object from env.
 * @returns {AdventureScopedState} Scoped state for this adventure.
 */
function getScopedState(data) {
  return resolveScopedState(data.temporary);
}

/**
 * @param {AdventureTemporaryScope | undefined} temporary - Optional temporary bucket.
 * @returns {AdventureScopedState} Extracted scoped state.
 */
function resolveScopedState(temporary) {
  /* eslint complexity: ["error", 3] */
  if (!temporary) {
    return {};
  }
  return temporary.CYBE1 ?? {};
}

/**
 * Determine the player's name from stored state or input.
 * @param {AdventureScopedState} scoped - Stored temporary state.
 * @param {string} input - Raw player input.
 * @returns {string} Normalised name string.
 */
function getNameOrInput(scoped, input) {
  return scoped.name || input.trim();
}

/**
 * Resolve the player name, defaulting when absent.
 * @param {AdventureScopedState} scoped - Temporary state.
 * @param {string} input - Raw player input.
 * @returns {string} Determined player name.
 */
function getPlayerName(scoped, input) {
  return getNameOrInput(scoped, input) || 'Stray';
}

/**
 * Obtain the player's current adventure state.
 * @param {AdventureScopedState} scoped - Temporary state.
 * @returns {AdventureState} Adventure state name.
 */
function getPlayerState(scoped) {
  return scoped.state || 'intro';
}

/**
 * Retrieve the player's inventory list.
 * @param {AdventureScopedState} scoped - Temporary state.
 * @returns {string[]} Inventory array.
 */
function getPlayerInventory(scoped) {
  return scoped.inventory || [];
}

/**
 * Convert stored visited locations into a Set.
 * @param {AdventureScopedState} scoped - Temporary state.
 * @returns {Set<string>} Collection of visited identifiers.
 */
function getPlayerVisited(scoped) {
  return new Set(scoped.visited || []);
}

/**
 * Build the shared context object used by adventure steps.
 * @param {AdventureContext} args - Values describing the current command.
 * @returns {AdventureContext} Prepared context for handlers.
 */
function createAdventureContext(args) {
  return {
    ...args,
  };
}

/**
 * Execute a single step of the adventure state machine.
 * @param {AdventureContext} context - Prepared context for the current turn.
 * @param {AdventureStateSetter} setTemporaryData - Environment helper to persist temporary storage.
 * @returns {string} Output text describing the result.
 */
function processAdventureStep(context, setTemporaryData) {
  const result = getAdventureResult(context);

  const output = result.output;
  const nextState = result.nextState;
  const updatedInventory = getUpdatedInventory(result, context.nextInventory);
  const updatedVisited = getUpdatedVisited(result, context.nextVisited);

  setTemporaryData({
    temporary: {
      CYBE1: {
        name: context.name,
        state: nextState,
        inventory: updatedInventory,
        visited: [...updatedVisited],
      },
    },
  });

  return output;
}

/**
 * Choose the inventory to store after a step.
 * @param {{nextInventory?: string[]}} result - Result from a handler.
 * @param {string[]} nextInventory - Current pending inventory.
 * @returns {string[]} Updated inventory array.
 */
function getUpdatedInventory(result, nextInventory) {
  return result.nextInventory || nextInventory;
}

/**
 * Choose the visited set to store after a step.
 * @param {{nextVisited?: Set<string>}} result - Result from a handler.
 * @param {Set<string>} nextVisited - Existing visited locations.
 * @returns {Set<string>} Updated visited locations.
 */
function getUpdatedVisited(result, nextVisited) {
  return result.nextVisited || nextVisited;
}

/**
 * @template {Function} T
 * @param {AdventureEnvironment} env - Environment map containing the toy helpers.
 * @param {AdventureEnvKey} key - Dependency key to retrieve.
 * @param {string} label - Human-friendly label used in error reporting.
 * @returns {T} Requested dependency implementation.
 */
function requireEnvFunction(env, key, label) {
  const candidate = /** @type {T | undefined} */ (env.get(key));
  if (!candidate) {
    throw new Error(`Missing ${label} dependency for the adventure.`);
  }
  return candidate;
}

/**
 * Core adventure logic executed for each player command.
 * @param {string} input - Raw player command.
 * @param {AdventureEnvironment} env - Environment accessor map.
 * @returns {string} Output generated by the command.
 */
function runAdventure(input, env) {
  const getRandomNumber = /** @type {() => number} */ (
    requireEnvFunction(env, 'getRandomNumber', 'random number generator')
  );
  const getCurrentTime = /** @type {() => string} */ (
    requireEnvFunction(env, 'getCurrentTime', 'time provider')
  );
  const getData = /** @type {() => AdventureDataEnvelope} */ (
    requireEnvFunction(env, 'getData', 'state accessor')
  );
  const setTemporaryData = /** @type {AdventureStateSetter} */ (
    requireEnvFunction(env, 'setLocalTemporaryData', 'temporary state setter')
  );
  const scoped = getScopedState(getData());

  const name = getPlayerName(scoped, input);
  const state = getPlayerState(scoped);
  const inventory = getPlayerInventory(scoped);
  const visited = getPlayerVisited(scoped);

  const lowerInput = input.trim().toLowerCase();
  const time = getCurrentTime();

  const nextInventory = [...inventory];
  const nextVisited = new Set(visited);

  if (!scoped.name) {
    setTemporaryData({ temporary: { CYBE1: { name } } });
    return `> Welcome, ${name}. Your story begins now.\n> Type 'start' to continue.`;
  }

  const adventureContext = createAdventureContext({
    state,
    name,
    time,
    lowerInput,
    nextInventory,
    nextVisited,
    getRandomNumber,
  });

  return processAdventureStep(adventureContext, setTemporaryData);
}

/**
 * Public entry point for the cyberpunk adventure.
 * @param {string} input - Player command.
 * @param {AdventureEnvironment} env - Environment utilities.
 * @returns {string} Narrative response.
 */
export function cyberpunkAdventure(input, env) {
  try {
    return runAdventure(input, env);
  } catch {
    return `> SYSTEM ERROR: neural link failure`;
  }
}
