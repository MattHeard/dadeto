function handleHackerDoor(context) {
  if (context.lowerInput.includes("zero")) {
    const output = `> Password accepted. Inside, a rogue AI offers you a cracked implant.`;
    context.nextInventory.push("cracked implant");
    context.nextVisited.add("hacker");
    return { output, nextState: "hub", nextInventory: context.nextInventory, nextVisited: context.nextVisited };
  } else {
    return { output: `> Hint: the password is a number and a name...`, nextState: "hacker:door", nextInventory: context.nextInventory, nextVisited: context.nextVisited };
  }
}

function handleIntro({ name, time }) {
  return {
    output: `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`,
    nextState: "hub"
  };
}

function findMatchingKeyword(lowerInput, keywordMap) {
  return Object.keys(keywordMap).find(keyword => lowerInput.includes(keyword));
}

function handleHub({ lowerInput }) {
  const keywordMap = {
    hacker: {
      output: `> You approach the Hacker Den. The door requires a password.`,
      nextState: "hacker:door"
    },
    transport: {
      output: `> You head to the Transport Hub. Trains screech overhead.`,
      nextState: "transport:platform"
    },
    alley: {
      output: `> You slip into the Back Alley. The shadows move with you.`,
      nextState: "alley:stealth"
    }
  };
  const match = findMatchingKeyword(lowerInput, keywordMap);
  if (match) {
    return keywordMap[match];
  }
  return {
    output: `> Unclear direction. Options: hacker / transport / alley`,
    nextState: "hub"
  };
}

function handleTransportPlatform() {
  return {
    output: `> A vendor offers you a neural ticket in exchange for your datapad.`,
    nextState: "transport:trade"
  };
}

function shouldTradeDatapad(nextInventory, lowerInput) {
  return nextInventory.includes("datapad") && lowerInput.includes("trade");
}

function handleTransportTrade({ nextInventory, nextVisited, lowerInput }) {
  if (shouldTradeDatapad(nextInventory, lowerInput)) {
    const newInventory = nextInventory.filter(item => item !== "datapad");
    newInventory.push("neural ticket");
    nextVisited.add("transport");
    return {
      output: `> You hand over the datapad. The vendor grins and slips you the neural ticket.`,
      nextState: "hub",
      nextInventory: newInventory,
      nextVisited
    };
  } else {
    return {
      output: `> Do you want to trade? Type 'trade datapad'.`,
      nextState: "transport:trade",
      nextInventory,
      nextVisited
    };
  }
}

function handleAlleyStealth({ getRandomNumber, nextInventory, nextVisited }) {
  const stealthCheck = getRandomNumber();
  const success = stealthCheck > 0.3;
  if (success) {
    nextInventory.push("stimpack");
    nextVisited.add("alley");
    return {
      output: `> You dodge the shadows and find a hidden stash: a stimpack.`,
      nextState: "hub",
      nextInventory,
      nextVisited
    };
  } else {
    return {
      output: `> You trip a wire. Sirens start up. You sprint back to the Market.`,
      nextState: "hub",
      nextInventory,
      nextVisited
    };
  }
}

function getDefaultAdventureResult() {
  return { output: `> Glitch in the grid. Resetting...`, nextState: "intro" };
}

function getAdventureResult(context) {
  const stateHandlers = {
    "intro": handleIntro,
    "hub": handleHub,
    "hacker:door": handleHackerDoor,
    "transport:platform": handleTransportPlatform,
    "transport:trade": handleTransportTrade,
    "alley:stealth": handleAlleyStealth
  };
  const handler = stateHandlers[context.state];
  return handler ? handler(context) : getDefaultAdventureResult();
}

function getScopedState(data) {
  return (data.temporary && data.temporary.CYBE1) || {};
}

function getPlayerName(scoped, input) {
  return scoped.name || input.trim() || "Stray";
}

function getPlayerState(scoped) {
  return scoped.state || "intro";
}

function getPlayerInventory(scoped) {
  return scoped.inventory || [];
}

function getPlayerVisited(scoped) {
  return new Set(scoped.visited || []);
}

function runAdventure(input, env) {
  const getRandomNumber = env.get("getRandomNumber");
  const getCurrentTime = env.get("getCurrentTime");
  const getData = env.get("getData");
  const setTemporaryData = env.get("setData");
  const scoped = getScopedState(getData());

  const name = getPlayerName(scoped, input);
  const state = getPlayerState(scoped);
  const inventory = getPlayerInventory(scoped);
  const visited = getPlayerVisited(scoped);

  const lowerInput = input.trim().toLowerCase();
  const time = getCurrentTime();

  let output = "";
  let nextState = state;
  let nextInventory = [...inventory];
  let nextVisited = new Set(visited);

  if (!scoped.name) {
    setTemporaryData({ temporary: { CYBE1: { name } } });
    return `> Welcome, ${name}. Your story begins now.\n> Type 'start' to continue.`;
  }

  const context = {
    state,
    name,
    time,
    lowerInput,
    nextInventory,
    nextVisited,
    getRandomNumber
  };
  const result = getAdventureResult(context);

  output = result.output;
  nextState = result.nextState;
  nextInventory = result.nextInventory || nextInventory;
  nextVisited = result.nextVisited || nextVisited;

  setTemporaryData({
    temporary: {
      CYBE1: {
        name,
        state: nextState,
        inventory: nextInventory,
        visited: [...nextVisited]
      }
    }
  });

  return output;
}

export function cyberpunkAdventure(input, env) {
  try {
    return runAdventure(input, env);
  } catch {
    return `> SYSTEM ERROR: neural link failure`;
  }
}