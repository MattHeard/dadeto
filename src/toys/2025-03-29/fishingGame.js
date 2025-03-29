function isRecognizedBait(baitKey, baitOptions) {
  return baitKey in baitOptions;
}

function isEmptyBait(baitKey) {
  return baitKey.length === 0;
}

function getDefaultBaitResponse(moodDescription) {
  return {
    isError: true,
    message: `You cast your line with nothing but hesitation. Without any bait, the waters remain undisturbed in their ${moodDescription}.`
  };
}

function getBaitData(input, baitOptions, moodDescription) {
  const baitKey = input.trim().toLowerCase();
  if (isRecognizedBait(baitKey, baitOptions)) {
    return baitOptions[baitKey];
  } else if (isEmptyBait(baitKey)) {
    return getDefaultBaitResponse(moodDescription);
  } else {
    return { modifier: 0, description: "an unconventional bait" };
  }
}

function isMorningHour(hour) {
  return hour >= 5 && hour < 12;
}

function isAfternoonHour(hour) {
  return hour >= 12 && hour < 17;
}

function isEveningHour(hour) {
  return hour >= 17 && hour < 21;
}

function isNightHour(hour) {
  return hour < 5 || hour >= 21;
}

function isFallMonth(month) {
  return month >= 8 && month <= 10;
}

function getTimeOfDay(hour) {
  if (isMorningHour(hour)) {
    return "morning";
  } else if (isAfternoonHour(hour)) {
    return "afternoon";
  } else if (isEveningHour(hour)) {
    return "evening";
  } else if (isNightHour(hour)) {
    return "night";
  }
}

function isSpringMonth(month) {
  return month >= 2 && month <= 4;
}

function isSummerMonth(month) {
  return month >= 5 && month <= 7;
}

function getSeason(month) {
  if (month === 11 || month === 0 || month === 1) {
    return "winter";
  } else if (isSpringMonth(month)) {
    return "spring";
  } else if (isSummerMonth(month)) {
    return "summer";
  } else if (isFallMonth(month)) {
    return "fall";
  } else {
    return "spring";
  }
}

function getMoodDescription(season, timeOfDay) {
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
  return `${seasonDescriptions[season]} ${timeDescriptions[timeOfDay]}`;
}

function getFishingOutcome(effectiveChance, baitDescription, moodDescription) {
  if (effectiveChance < 0.3) {
    return `the water stays silent. Despite your use of ${baitDescription}, no fish disturb the ${moodDescription}.`;
  } else if (effectiveChance < 0.6) {
    return `a common carp surfaces gently, a modest reward for your effort with ${baitDescription}, set against ${moodDescription}.`;
  } else if (effectiveChance < 0.85) {
    return `a glimmering trout appears briefly, its shimmer echoing the beauty of ${moodDescription}. Your choice of ${baitDescription} worked well.`;
  } else {
    return `in a burst of brilliance, a legendary golden fish leaps forth—its radiance matching the splendor of ${moodDescription}. Your ${baitDescription} has yielded a prize.`;
  }
}

function getBaitOptions() {
  return {
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
}

function getTimeContext(getCurrentTime) {
  const date = new Date(getCurrentTime());
  const month = date.getMonth();
  const hour = date.getHours();
  const season = getSeason(month);
  const timeOfDay = getTimeOfDay(hour);
  return { season, timeOfDay };
}

function fishingGame(input, env) {
  const { season, timeOfDay } = getTimeContext(env.get("getCurrentTime"));

  const moodDescription = getMoodDescription(season, timeOfDay);

  const baitOptions = getBaitOptions();

  const baitDataOrError = getBaitData(input, baitOptions, moodDescription);
  if (baitDataOrError.isError) return baitDataOrError.message;
  const baitData = baitDataOrError;

  const getRandomNumber = env.get("getRandomNumber");
  const baseChance = getRandomNumber();
  const effectiveChance = Math.min(1, Math.max(0, baseChance + baitData.modifier));

  const outcome = getFishingOutcome(effectiveChance, baitData.description, moodDescription);

  return `Casting your line with ${baitData.description}, you await a catch. ${outcome}`;
}

export { fishingGame };