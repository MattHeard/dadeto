/**
 * Resolve the interaction at the hacker door.
 * @param {{lowerInput: string, nextInventory: string[], nextVisited: Set<string>}} context -
 *   Player context for this step.
 * @returns {{output: string, nextState: string, nextInventory: string[], nextVisited: Set<string>}}
 *   Resulting state transition information.
 */
function handleHackerDoor(context) {
  if (context.lowerInput.includes('zero')) {
    const output = `> Password accepted. Inside, a rogue AI offers you a cracked implant.`;
    context.nextInventory.push('cracked implant');
    context.nextVisited.add('hacker');
    return {
      output,
      nextState: 'hub',
      nextInventory: context.nextInventory,
      nextVisited: context.nextVisited,
    };
  } else {
    return {
      output: `> Hint: the password is a number and a name...`,
      nextState: 'hacker:door',
      nextInventory: context.nextInventory,
      nextVisited: context.nextVisited,
    };
  }
}

/**
 * Produce the introductory message for the adventure.
 * @param {{name: string, time: string}} param0 - Player name and current time.
 * @returns {{output: string, nextState: string}} Introductory prompt and state.
 */
function handleIntro({ name, time }) {
  return {
    output: `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`,
    nextState: 'hub',
  };
}

/**
 * Find a keyword contained within the player's input.
 * @param {string} lowerInput - Normalised player input.
 * @param {Record<string, any>} keywordMap - Map of keywords to responses.
 * @returns {string|undefined} The matched keyword if found.
 */
function findMatchingKeyword(lowerInput, keywordMap) {
  return Object.keys(keywordMap).find(keyword => lowerInput.includes(keyword));
}

/**
 * Handle input while the player is in the hub area.
 * @param {{lowerInput: string}} param0 - Object containing normalised input.
 * @returns {{output: string, nextState: string}} Hub response and next state.
 */
function handleHub({ lowerInput }) {
  const keywordMap = {
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
  };
  const match = findMatchingKeyword(lowerInput, keywordMap);
  if (match) {
    return keywordMap[match];
  }
  return {
    output: `> Unclear direction. Options: hacker / transport / alley`,
    nextState: 'hub',
  };
}

/**
 * Describe the transport platform scene.
 * @returns {{output: string, nextState: string}} Narrative response.
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
 * @param {{nextInventory: string[], nextVisited: Set<string>, lowerInput: string}} param0 -
 *   Player context for the trade.
 * @returns {{output: string, nextState: string, nextInventory: string[], nextVisited: Set<string>}}
 *   Trade result and next state.
 */
function handleTransportTrade({ nextInventory, nextVisited, lowerInput }) {
  if (shouldTradeDatapad(nextInventory, lowerInput)) {
    const newInventory = nextInventory.filter(item => item !== 'datapad');
    newInventory.push('neural ticket');
    nextVisited.add('transport');
    return {
      output: `> You hand over the datapad. The vendor grins and slips you the neural ticket.`,
      nextState: 'hub',
      nextInventory: newInventory,
      nextVisited,
    };
  } else {
    return {
      output: `> Do you want to trade? Type 'trade datapad'.`,
      nextState: 'transport:trade',
      nextInventory,
      nextVisited,
    };
  }
}

/**
 * Attempt to sneak through the alley.
 * @param {{getRandomNumber: Function, nextInventory: string[], nextVisited: Set<string>}} param0 -
 *   Utilities and player state.
 * @returns {{output: string, nextState: string, nextInventory: string[], nextVisited: Set<string>}}
 *   Outcome of the stealth attempt.
 */
function handleAlleyStealth({ getRandomNumber, nextInventory, nextVisited }) {
  const stealthCheck = getRandomNumber();
  const success = stealthCheck > 0.3;
  if (success) {
    nextInventory.push('stimpack');
    nextVisited.add('alley');
    return {
      output: `> You dodge the shadows and find a hidden stash: a stimpack.`,
      nextState: 'hub',
      nextInventory,
      nextVisited,
    };
  } else {
    return {
      output: `> You trip a wire. Sirens start up. You sprint back to the Market.`,
      nextState: 'hub',
      nextInventory,
      nextVisited,
    };
  }
}

/**
 * Provide a fallback result when no handler matches the state.
 * @returns {{output: string, nextState: string}} Default response.
 */
function getDefaultAdventureResult() {
  return { output: `> Glitch in the grid. Resetting...`, nextState: 'intro' };
}

/**
 * Execute the handler for the current adventure state.
 * @param {{state: string}} context - Current player context.
 * @returns {{output: string, nextState: string, nextInventory?: string[], nextVisited?: Set<string>}}
 *   Resulting state data.
 */
function getAdventureResult(context) {
  const stateHandlers = {
    intro: handleIntro,
    hub: handleHub,
    'hacker:door': handleHackerDoor,
    'transport:platform': handleTransportPlatform,
    'transport:trade': handleTransportTrade,
    'alley:stealth': handleAlleyStealth,
  };
  const handler = stateHandlers[context.state];
  if (handler) {
    return handler(context);
  } else {
    return getDefaultAdventureResult();
  }
}

/**
 * Extract temporary adventure data from the environment.
 * @param {{temporary?: {CYBE1?: object}}} data - Full data object from env.
 * @returns {object} Scoped state for this adventure.
 */
function getScopedState(data) {
  return data.temporary.CYBE1 || {};
}

/**
 * Determine the player's name from stored state or input.
 * @param {object} scoped - Stored temporary state.
 * @param {string} input - Raw player input.
 * @returns {string} Normalised name string.
 */
function getNameOrInput(scoped, input) {
  return scoped.name || input.trim();
}

/**
 * Resolve the player name, defaulting when absent.
 * @param {object} scoped - Temporary state.
 * @param {string} input - Raw player input.
 * @returns {string} Determined player name.
 */
function getPlayerName(scoped, input) {
  return getNameOrInput(scoped, input) || 'Stray';
}

/**
 * Obtain the player's current adventure state.
 * @param {object} scoped - Temporary state.
 * @returns {string} Adventure state name.
 */
function getPlayerState(scoped) {
  return scoped.state || 'intro';
}

/**
 * Retrieve the player's inventory list.
 * @param {object} scoped - Temporary state.
 * @returns {string[]} Inventory array.
 */
function getPlayerInventory(scoped) {
  return scoped.inventory || [];
}

/**
 * Convert stored visited locations into a Set.
 * @param {object} scoped - Temporary state.
 * @returns {Set<string>} Collection of visited identifiers.
 */
function getPlayerVisited(scoped) {
  return new Set(scoped.visited || []);
}

/**
 * Execute a single step of the adventure state machine.
 * @param {{
 *   state: string,
 *   name: string,
 *   time: string,
 *   lowerInput: string,
 *   nextInventory: string[],
 *   nextVisited: Set<string>,
 *   getRandomNumber: Function,
 *   setTemporaryData: Function,
 * }} param0 - Context and utilities for the step.
 * @returns {string} Output text describing the result.
 */
function processAdventureStep({
  state,
  name,
  time,
  lowerInput,
  nextInventory,
  nextVisited,
  getRandomNumber,
  setTemporaryData,
}) {
  const context = {
    state,
    name,
    time,
    lowerInput,
    nextInventory,
    nextVisited,
    getRandomNumber,
  };
  const result = getAdventureResult(context);

  const output = result.output;
  const nextState = result.nextState;
  const updatedInventory = getUpdatedInventory(result, nextInventory);
  const updatedVisited = getUpdatedVisited(result, nextVisited);

  setTemporaryData({
    temporary: {
      CYBE1: {
        name,
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
 * Core adventure logic executed for each player command.
 * @param {string} input - Raw player command.
 * @param {Map<string, Function>} env - Environment accessor map.
 * @returns {string} Output generated by the command.
 */
function runAdventure(input, env) {
  const getRandomNumber = env.get('getRandomNumber');
  const getCurrentTime = env.get('getCurrentTime');
  const getData = env.get('getData');
  const setTemporaryData = env.get('setLocalTemporaryData');
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

  return processAdventureStep({
    state,
    name,
    time,
    lowerInput,
    nextInventory,
    nextVisited,
    getRandomNumber,
    setTemporaryData,
  });
}

/**
 * Public entry point for the cyberpunk adventure.
 * @param {string} input - Player command.
 * @param {Map<string, Function>} env - Environment utilities.
 * @returns {string} Narrative response.
 */
export function cyberpunkAdventure(input, env) {
  try {
    return runAdventure(input, env);
  } catch {
    return `> SYSTEM ERROR: neural link failure`;
  }
}
