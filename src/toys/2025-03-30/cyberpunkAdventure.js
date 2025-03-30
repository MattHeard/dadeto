export function cyberpunkAdventure(input, env) {
  try {
    console.log("cyberpunkAdventure called with input:", input);
    const getRandomNumber = env.get("getRandomNumber");
    const getCurrentTime = env.get("getCurrentTime");
    const getData = env.get("getData");
    const setTemporaryData = env.get("setTemporaryData");
    const { temporary } = getData();
    console.log("Temporary data on load:", temporary);

    const name = temporary.name || input.trim() || "Stray";
    const state = temporary.state || "intro";
    const inventory = temporary.inventory || [];
    const visited = new Set(temporary.visited || []);

    const lowerInput = input.trim().toLowerCase();
    const time = getCurrentTime();

    let output = "";
    let nextState = state;
    let nextInventory = [...inventory];
    let nextVisited = new Set(visited);

    // If we haven’t stored the name yet, do so now
    if (!temporary.name) {
      setTemporaryData({ name });
      const confirmSet = getData().temporary.name;
      if (!confirmSet) {
        console.warn("Temporary data not persisting after setTemporaryData!");
      }
      return `> Welcome, ${name}. Your story begins now.\n> Type 'start' to continue.`;
    }

    // Game logic
    switch (state) {
      case "intro":
        output = `> ${time}\n> ${name}, you're in the Neon Market. Lights hum. Faces blur.\n> You see paths to: Hacker Den, Transport Hub, and Back Alley.\n> Where do you go? (hacker / transport / alley)`;
        nextState = "hub";
        break;

      case "hub":
        if (lowerInput.includes("hacker")) {
          output = `> You approach the Hacker Den. The door requires a password.`;
          nextState = "hacker:door";
        } else if (lowerInput.includes("transport")) {
          output = `> You head to the Transport Hub. Trains screech overhead.`;
          nextState = "transport:platform";
        } else if (lowerInput.includes("alley")) {
          output = `> You slip into the Back Alley. The shadows move with you.`;
          nextState = "alley:stealth";
        } else {
          output = `> Unclear direction. Options: hacker / transport / alley`;
        }
        break;

      // Hacker Den phases
      case "hacker:door":
        if (lowerInput.includes("zero")) {
          output = `> Password accepted. Inside, a rogue AI offers you a cracked implant.`;
          nextInventory.push("cracked implant");
          nextVisited.add("hacker");
          nextState = "hub";
        } else {
          output = `> Hint: the password is a number and a name...`;
        }
        break;

      // Transport Hub phases
      case "transport:platform":
        output = `> A vendor offers you a neural ticket in exchange for your datapad.`;
        nextState = "transport:trade";
        break;

      case "transport:trade":
        if (nextInventory.includes("datapad") && lowerInput.includes("trade")) {
          output = `> You hand over the datapad. The vendor grins and slips you the neural ticket.`;
          nextInventory.splice(nextInventory.indexOf("datapad"), 1);
          nextInventory.push("neural ticket");
          nextVisited.add("transport");
          nextState = "hub";
        } else {
          output = `> Do you want to trade? Type 'trade datapad'.`;
        }
        break;

      // Back Alley phases
      case "alley:stealth":
        const stealthCheck = getRandomNumber();
        const success = stealthCheck > 0.3;
        if (success) {
          output = `> You dodge the shadows and find a hidden stash: a stimpack.`;
          nextInventory.push("stimpack");
          nextVisited.add("alley");
        } else {
          output = `> You trip a wire. Sirens start up. You sprint back to the Market.`;
        }
        nextState = "hub";
        break;

      default:
        output = `> Glitch in the grid. Resetting...`;
        nextState = "intro";
    }

    console.log("Saving state:", {
      name,
      state: nextState,
      inventory: nextInventory,
      visited: [...nextVisited]
    });
    setTemporaryData({
      name,
      state: nextState,
      inventory: nextInventory,
      visited: [...nextVisited]
    });

    console.log("State:", state, "Input:", input, "Output:", output);
    return output;
  } catch (e) {
    return `> SYSTEM ERROR: neural link failure`;
  }
}