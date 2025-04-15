function handleHackerDoor(lowerInput, nextInventory, nextVisited) {
  if (lowerInput.includes("zero")) {
    const output = `> Password accepted. Inside, a rogue AI offers you a cracked implant.`;
    nextInventory.push("cracked implant");
    nextVisited.add("hacker");
    return { output, nextState: "hub", nextInventory, nextVisited };
  } else {
    return { output: `> Hint: the password is a number and a name...`, nextState: "hacker:door", nextInventory, nextVisited };
  }
}

function handleIntro({ name, time }) {
  return {
    output: `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`,
    nextState: "hub"
  };
}

function handleHub({ lowerInput }) {
  if (lowerInput.includes("hacker")) {
    return {
      output: `> You approach the Hacker Den. The door requires a password.`,
      nextState: "hacker:door"
    };
  } else if (lowerInput.includes("transport")) {
    return {
      output: `> You head to the Transport Hub. Trains screech overhead.`,
      nextState: "transport:platform"
    };
  } else if (lowerInput.includes("alley")) {
    return {
      output: `> You slip into the Back Alley. The shadows move with you.`,
      nextState: "alley:stealth"
    };
  } else {
    return {
      output: `> Unclear direction. Options: hacker / transport / alley`,
      nextState: "hub"
    };
  }
}

function handleTransportPlatform() {
  return {
    output: `> A vendor offers you a neural ticket in exchange for your datapad.`,
    nextState: "transport:trade"
  };
}

function handleTransportTrade({ nextInventory, nextVisited, lowerInput }) {
  if (nextInventory.includes("datapad") && lowerInput.includes("trade")) {
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

export function cyberpunkAdventure(input, env) {
  try {
    const getRandomNumber = env.get("getRandomNumber");
    const getCurrentTime = env.get("getCurrentTime");
    const getData = env.get("getData");
    const setTemporaryData = env.get("setData");
    const { temporary } = getData();
    const scoped = temporary.CYBE1 || {};

    const name = scoped.name || input.trim() || "Stray";
    const state = scoped.state || "intro";
    const inventory = scoped.inventory || [];
    const visited = new Set(scoped.visited || []);

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

    let result;
    switch (state) {
      case "intro":
        result = handleIntro({ name, time });
        break;
      case "hub":
        result = handleHub({ lowerInput });
        break;
      case "hacker:door":
        result = handleHackerDoor(lowerInput, nextInventory, nextVisited);
        break;
      case "transport:platform":
        result = handleTransportPlatform();
        break;
      case "transport:trade":
        result = handleTransportTrade({ nextInventory, nextVisited, lowerInput });
        break;
      case "alley:stealth":
        result = handleAlleyStealth({ getRandomNumber, nextInventory, nextVisited });
        break;
      default:
        result = { output: `> Glitch in the grid. Resetting...`, nextState: "intro" };
    }

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
  } catch {
    return `> SYSTEM ERROR: neural link failure`;
  }
}