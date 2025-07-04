/**
 * Determine whether the provided bait key exists in the collection of options.
 * @param {string} baitKey - Key identifying the bait.
 * @param {Record<string, {modifier: number, description: string}>} baitOptions -
 *   Map of available bait data indexed by key.
 * @returns {boolean} True when the baitKey is found.
 */
function isRecognizedBait(baitKey, baitOptions) {
  return baitKey in baitOptions;
}

/**
 * Check if the user provided an empty bait key.
 * @param {string} baitKey - Bait key provided by the player.
 * @returns {boolean} True when no bait was entered.
 */
function isEmptyBait(baitKey) {
  return baitKey.length === 0;
}

/**
 * Create the response when the user provides no valid bait.
 * @param {string} moodDescription - Description of the current mood of the waters.
 * @returns {{isError: boolean, message: string}} Error object describing the failure.
 */
function getDefaultBaitResponse(moodDescription) {
  return {
    isError: true,
    message: `You cast your line with nothing but hesitation. Without any bait, the waters remain undisturbed in their ${moodDescription}.`,
  };
}

/**
 * Retrieve data for a known bait selection.
 * @param {string} baitKey - Key identifying the bait.
 * @param {Record<string, {modifier: number, description: string}>} baitOptions -
 *   Map of available bait data.
 * @returns {{modifier: number, description: string}} Data describing the bait.
 */
function getRecognizedBait(baitKey, baitOptions) {
  return baitOptions[baitKey];
}

/**
 * Provide a default bait representation for unrecognized input.
 * @returns {{modifier: number, description: string}} Placeholder bait details.
 */
function getUnrecognizedBait() {
  return { modifier: 0, description: 'an unconventional bait' };
}

/**
 * Choose the correct bait response for an empty or unknown bait key.
 * @param {string} baitKey - Key supplied by the user.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {{modifier: number, description: string}|{isError: boolean, message: string}}
 *   Bait data or an error response.
 */
function getEmptyOrUnrecognizedBaitResponse(baitKey, moodDescription) {
  if (isEmptyBait(baitKey)) {
    return getDefaultBaitResponse(moodDescription);
  } else {
    return getUnrecognizedBait();
  }
}

/**
 * Look up the bait details for the provided player input.
 * @param {string} input - Raw user input describing the bait.
 * @param {Record<string, {modifier: number, description: string}>} baitOptions -
 *   Collection of available bait data.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {{modifier: number, description: string}|{isError: boolean, message: string}}
 *   Bait data or an error object.
 */
function getBaitData(input, baitOptions, moodDescription) {
  const baitKey = input.trim().toLowerCase();
  if (isRecognizedBait(baitKey, baitOptions)) {
    return getRecognizedBait(baitKey, baitOptions);
  }
  return getEmptyOrUnrecognizedBaitResponse(baitKey, moodDescription);
}

/**
 * Determine a textual time of day description from the hour.
 * @param {number} hour - Hour of the day in 24 hour format.
 * @returns {string} Time of day label.
 */
function getTimeOfDay(hour) {
  const ranges = [
    { start: 5, end: 12, label: 'morning' },
    { start: 12, end: 17, label: 'afternoon' },
    { start: 17, end: 21, label: 'evening' },
    { start: 21, end: 24, label: 'night' },
    { start: 0, end: 5, label: 'night' },
  ];
  const match = ranges.find(({ start, end }) => hour >= start && hour < end);
  return match.label;
}

/**
 * Convert a month index into a season label.
 * @param {number} month - Month index from 0 to 11.
 * @returns {string} Season label.
 */
function getSeason(month) {
  const ranges = [
    { months: [11, 0, 1], label: 'winter' },
    { months: [2, 3, 4], label: 'spring' },
    { months: [5, 6, 7], label: 'summer' },
    { months: [8, 9, 10], label: 'fall' },
  ];
  const match = ranges.find(({ months }) => months.includes(month));
  return match.label;
}

/**
 * Build a descriptive phrase for the current season and time of day.
 * @param {string} season - Season label from getSeason().
 * @param {string} timeOfDay - Time-of-day label from getTimeOfDay().
 * @returns {string} Human readable mood description.
 */
function getMoodDescription(season, timeOfDay) {
  const seasonDescriptions = {
    winter: 'crisp, icy waters',
    spring: 'bubbling, fresh currents',
    summer: 'warm, shimmering waves',
    fall: 'cool, reflective ponds',
  };
  const timeDescriptions = {
    morning: 'as dawn breaks with promise',
    afternoon: 'under a vibrant sun',
    evening: 'in the glow of twilight',
    night: 'beneath a silent, starry sky',
  };
  return `${seasonDescriptions[season]} ${timeDescriptions[timeOfDay]}`;
}

/**
 * Determine if no fish are caught based on chance.
 * @param {number} chance - Random chance between 0 and 1.
 * @returns {boolean} True when nothing bites.
 */
function isSilentCatch(chance) {
  return chance < 0.3;
}

/**
 * Determine if a common fish is caught.
 * @param {number} chance - Random chance between 0 and 1.
 * @returns {boolean} True when the outcome is a common catch.
 */
function isCommonCatch(chance) {
  return chance < 0.6;
}

/**
 * Determine if a trout is caught.
 * @param {number} chance - Random chance between 0 and 1.
 * @returns {boolean} True when a trout is caught.
 */
function isTroutCatch(chance) {
  return chance < 0.85;
}

const fishingOutcomes = [
  {
    check: isSilentCatch,
    describe: (bait, mood) =>
      `the water stays silent. Despite your use of ${bait}, no fish disturb the ${mood}.`,
  },
  {
    check: isCommonCatch,
    describe: (bait, mood) =>
      `a common carp surfaces gently, a modest reward for your effort with ${bait}, set against ${mood}.`,
  },
  {
    check: isTroutCatch,
    describe: (bait, mood) =>
      `a glimmering trout appears briefly, its shimmer echoing the beauty of ${mood}. Your choice of ${bait} worked well.`,
  },
  {
    check: () => true,
    describe: (bait, mood) =>
      `in a burst of brilliance, a legendary golden fish leaps forth—its radiance matching the splendor of ${mood}. Your ${bait} has yielded a prize.`,
  },
];

/**
 * Describe the result of a fishing attempt based on the random chance and mood.
 * @param {number} effectiveChance - Chance value between 0 and 1 after
 *   modifiers are applied.
 * @param {string} baitDescription - Description of the bait used.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {string} Narrative describing the catch.
 */
function getFishingOutcome(effectiveChance, baitDescription, moodDescription) {
  return fishingOutcomes
    .find(({ check }) => check(effectiveChance))
    .describe(baitDescription, moodDescription);
}

/**
 * Provide the default set of bait options used by the game.
 * @returns {Record<string, {modifier: number, description: string}>} Map of
 *   bait data keyed by bait name.
 */
function getBaitOptions() {
  return {
    worm: { modifier: 0.0, description: 'a wriggling worm' },
    insect: { modifier: 0.05, description: 'a lively insect' },
    bread: { modifier: -0.05, description: 'a slice of bread' },
    cheese: { modifier: 0.1, description: 'a pungent piece of cheese' },
    'shiny bait': { modifier: 0.15, description: 'a glittering lure' },
    doughnut: { modifier: 0.2, description: 'a tempting doughnut' },
    grub: { modifier: 0.05, description: 'a succulent grub' },
    minnow: { modifier: 0.1, description: 'a darting minnow' },
    sausage: { modifier: 0.2, description: 'a savory sausage' },
    maggot: { modifier: -0.1, description: 'a squirming maggot' },
  };
}

/**
 * Create the seasonal and time-of-day context used for mood descriptions.
 * @param {() => number} getCurrentTime - Function returning the current time in
 *   milliseconds since the epoch.
 * @returns {{season: string, timeOfDay: string}} Time context for the game.
 */
function getTimeContext(getCurrentTime) {
  const date = new Date(getCurrentTime());
  const month = date.getMonth();
  const hour = date.getHours();
  const season = getSeason(month);
  const timeOfDay = getTimeOfDay(hour);
  return { season, timeOfDay };
}

/**
 * Main entry point for the fishing mini game.
 * @param {string} input - Raw player input representing bait choice.
 * @param {{get: (name: string) => any}} env - Environment accessor used to get
 *   utilities like random number generation.
 * @returns {string} Message describing the outcome of the cast.
 */
function fishingGame(input, env) {
  const { season, timeOfDay } = getTimeContext(env.get('getCurrentTime'));

  const moodDescription = getMoodDescription(season, timeOfDay);

  const baitOptions = getBaitOptions();

  const baitDataOrError = getBaitData(input, baitOptions, moodDescription);
  if (baitDataOrError.isError) {
    return baitDataOrError.message;
  }
  const baitData = baitDataOrError;

  const getRandomNumber = env.get('getRandomNumber');
  const baseChance = getRandomNumber();
  const effectiveChance = Math.min(
    1,
    Math.max(0, baseChance + baitData.modifier)
  );

  const outcome = getFishingOutcome(
    effectiveChance,
    baitData.description,
    moodDescription
  );

  return `Casting your line with ${baitData.description}, you await a catch. ${outcome}`;
}

export { fishingGame };
