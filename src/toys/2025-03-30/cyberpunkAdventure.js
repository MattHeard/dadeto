/**
 *
 * @param context
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
 *
 * @param root0
 * @param root0.name
 * @param root0.time
 */
function handleIntro({ name, time }) {
  return {
    output: `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`,
    nextState: 'hub',
  };
}

/**
 *
 * @param lowerInput
 * @param keywordMap
 */
function findMatchingKeyword(lowerInput, keywordMap) {
  return Object.keys(keywordMap).find(keyword => lowerInput.includes(keyword));
}

/**
 *
 * @param root0
 * @param root0.lowerInput
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
 *
 */
function handleTransportPlatform() {
  return {
    output: `> A vendor offers you a neural ticket in exchange for your datapad.`,
    nextState: 'transport:trade',
  };
}

/**
 *
 * @param nextInventory
 * @param lowerInput
 */
function shouldTradeDatapad(nextInventory, lowerInput) {
  return nextInventory.includes('datapad') && lowerInput.includes('trade');
}

/**
 *
 * @param root0
 * @param root0.nextInventory
 * @param root0.nextVisited
 * @param root0.lowerInput
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
 *
 * @param root0
 * @param root0.getRandomNumber
 * @param root0.nextInventory
 * @param root0.nextVisited
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
 *
 */
function getDefaultAdventureResult() {
  return { output: `> Glitch in the grid. Resetting...`, nextState: 'intro' };
}

/**
 *
 * @param context
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
 *
 * @param data
 */
function getScopedState(data) {
  return data.temporary.CYBE1 || {};
}

/**
 *
 * @param scoped
 * @param input
 */
function getNameOrInput(scoped, input) {
  return scoped.name || input.trim();
}

/**
 *
 * @param scoped
 * @param input
 */
function getPlayerName(scoped, input) {
  return getNameOrInput(scoped, input) || 'Stray';
}

/**
 *
 * @param scoped
 */
function getPlayerState(scoped) {
  return scoped.state || 'intro';
}

/**
 *
 * @param scoped
 */
function getPlayerInventory(scoped) {
  return scoped.inventory || [];
}

/**
 *
 * @param scoped
 */
function getPlayerVisited(scoped) {
  return new Set(scoped.visited || []);
}

/**
 *
 * @param root0
 * @param root0.state
 * @param root0.name
 * @param root0.time
 * @param root0.lowerInput
 * @param root0.nextInventory
 * @param root0.nextVisited
 * @param root0.getRandomNumber
 * @param root0.setTemporaryData
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
 *
 * @param result
 * @param nextInventory
 */
function getUpdatedInventory(result, nextInventory) {
  return result.nextInventory || nextInventory;
}

/**
 *
 * @param result
 * @param nextVisited
 */
function getUpdatedVisited(result, nextVisited) {
  return result.nextVisited || nextVisited;
}

/**
 *
 * @param input
 * @param env
 */
function runAdventure(input, env) {
  const getRandomNumber = env.get('getRandomNumber');
  const getCurrentTime = env.get('getCurrentTime');
  const getData = env.get('getData');
  const setTemporaryData = env.get('setData');
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
 *
 * @param input
 * @param env
 */
export function cyberpunkAdventure(input, env) {
  try {
    return runAdventure(input, env);
  } catch {
    return `> SYSTEM ERROR: neural link failure`;
  }
}
