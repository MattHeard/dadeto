// fishingGame.js
function fishingGame(input, env) {
  // Get the current time string and parse it
  const timeStr = env.getCurrentTime();
  const date = new Date(timeStr);
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const hour = date.getHours();

  // Determine season from month
  let season = "spring";
  if (month === 11 || month === 0 || month === 1) {
    season = "winter";
  } else if (month >= 2 && month <= 4) {
    season = "spring";
  } else if (month >= 5 && month <= 7) {
    season = "summer";
  } else if (month >= 8 && month <= 10) {
    season = "fall";
  }

  // Determine time of day from hour
  let timeOfDay = "morning";
  if (hour >= 5 && hour < 12) {
    timeOfDay = "morning";
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = "afternoon";
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = "evening";
  } else {
    timeOfDay = "night";
  }

  // Mood descriptions based on season and time of day.
  const seasonDescriptions = {
    winter: "crisp, icy waters",
    spring: "bubbling, fresh currents",
    summer: "warm, shimmering waves",
    fall: "cool, reflective ponds",
  };
  const timeDescriptions = {
    morning: "as dawn breaks with promise",
    afternoon: "under a vibrant sun",
    evening: "in the glow of twilight",
    night: "beneath a silent, starry sky",
  };
  const moodDescription = `${seasonDescriptions[season]} ${timeDescriptions[timeOfDay]}`;

  // Define a mapping of bait names (lower-case) to their modifiers and descriptions.
  const baitOptions = {
    "worm": { modifier: 0.0, description: "a wriggling worm" },
    "insect": { modifier: 0.05, description: "a lively insect" },
    "bread": { modifier: -0.05, description: "a slice of bread" },
    "cheese": { modifier: 0.1, description: "a pungent piece of cheese" },
    "shiny bait": { modifier: 0.15, description: "a glittering lure" },
    "doughnut": { modifier: 0.2, description: "a tempting doughnut" },
    "grub": { modifier: 0.05, description: "a succulent grub" },
    "minnow": { modifier: 0.1, description: "a darting minnow" },
    "sausage": { modifier: 0.2, description: "a savory sausage" },
    "maggot": { modifier: -0.1, description: "a squirming maggot" },
  };

  // Clean input, and check if it matches a known bait.
  const baitKey = input.trim().toLowerCase();
  let baitData;
  if (baitKey in baitOptions) {
    baitData = baitOptions[baitKey];
  } else if (baitKey.length === 0) {
    // No bait provided.
    return `You cast your line with nothing but hesitation. Without any bait, the waters remain undisturbed in their ${moodDescription}.`;
  } else {
    // Unrecognized bait: use a generic option.
    baitData = { modifier: 0, description: "an unconventional bait" };
  }

  // Get a base random number (0-1) and adjust it by the bait's modifier.
  const baseChance = env.getRandomNumber();
  const effectiveChance = Math.min(1, Math.max(0, baseChance + baitData.modifier));

  // Determine the outcome based on the effective chance.
  let outcome;
  if (effectiveChance < 0.3) {
    outcome = `the water stays silent. Despite your use of ${baitData.description}, no fish disturb the ${moodDescription}.`;
  } else if (effectiveChance < 0.6) {
    outcome = `a common carp surfaces gently, a modest reward for your effort with ${baitData.description}, set against ${moodDescription}.`;
  } else if (effectiveChance < 0.85) {
    outcome = `a glimmering trout appears briefly, its shimmer echoing the beauty of ${moodDescription}. Your choice of ${baitData.description} worked well.`;
  } else {
    outcome = `in a burst of brilliance, a legendary golden fish leaps forth—its radiance matching the splendor of ${moodDescription}. Your ${baitData.description} has yielded a prize.`;
  }

  // Compose and return the final output narrative.
  return `Casting your line with ${baitData.description}, you await a catch. ${outcome}`;
}

export { fishingGame };