/**
 * @typedef {'winter'|'spring'|'summer'|'fall'} SeasonLabel
 */

/**
 * @typedef {'morning'|'afternoon'|'evening'|'night'} TimeOfDayLabel
 */

/**
 * @typedef {object} BaitDetails
 * @property {number} modifier - Numeric modifier applied to the random chance.
 * @property {string} description - Textual description of the bait.
 * @property {false} [isError] - Distinguishes successful lookups from error responses.
 */

/**
 * @typedef {{isError: true, message: string}} BaitError
 */

/**
 * @typedef {BaitDetails | BaitError} BaitResponse
 */

/**
 * @typedef {object} FishingOutcome
 * @property {(chance: number) => boolean} check - Predicate describing when this outcome triggers.
 * @property {(bait: string, mood: string) => string} describe - Narrative builder for the outcome.
 */

/**
 * Determine whether the provided bait key exists in the collection of options.
 * @param {string} baitKey - Key identifying the bait.
 * @param {Record<string, BaitDetails>} baitOptions -
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
 * @returns {BaitError} Error object describing the failure.
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
 * @param {Record<string, BaitDetails>} baitOptions -
 *   Map of available bait data.
 * @returns {BaitDetails} Data describing the bait.
 */
function getRecognizedBait(baitKey, baitOptions) {
  return baitOptions[baitKey];
}

/**
 * Provide a default bait representation for unrecognized input.
 * @returns {BaitDetails} Placeholder bait details.
 */
function getUnrecognizedBait() {
  return { modifier: 0, description: 'an unconventional bait' };
}

/**
 * Choose the correct bait response for an empty or unknown bait key.
 * @param {string} baitKey - Key supplied by the user.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {BaitResponse} Bait data or an error response.
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
 * @param {Record<string, BaitDetails>} baitOptions - Collection of available bait data.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {BaitResponse} Bait data or an error object.
 */
function getBaitData(input, baitOptions, moodDescription) {
  const baitKey = input.trim().toLowerCase();
  if (isRecognizedBait(baitKey, baitOptions)) {
    return getRecognizedBait(baitKey, baitOptions);
  }
  return getEmptyOrUnrecognizedBaitResponse(baitKey, moodDescription);
}

/**
 * Determine whether a bait response is an error payload.
 * @param {BaitResponse} response - Response emitted by `getBaitData`.
 * @returns {response is BaitError} True when the response describes an error.
 */
function isBaitError(response) {
  return Boolean(response && response.isError);
}

/**
 * Time-of-day periods mapped by start and end hours (exclusive).
 * @type {Array<{start: number, end: number, label: TimeOfDayLabel}>}
 */
const timeOfDayPeriods = [
  { start: 0, end: 5, label: 'night' },
  { start: 5, end: 12, label: 'morning' },
  { start: 12, end: 17, label: 'afternoon' },
  { start: 17, end: 21, label: 'evening' },
  { start: 21, end: 24, label: 'night' },
];

/**
 * Season periods mapped by start and end months (exclusive).
 * @type {Array<{start: number, end: number, label: SeasonLabel}>}
 */
const seasonPeriods = [
  { start: 0, end: 2, label: 'winter' },
  { start: 2, end: 5, label: 'spring' },
  { start: 5, end: 8, label: 'summer' },
  { start: 8, end: 11, label: 'fall' },
  { start: 11, end: 12, label: 'winter' },
];

/**
 * Check if hour falls within period range.
 * @param {number} hour - Hour to check.
 * @param {{start: number, end: number}} period - Period with start and end.
 * @returns {boolean} True when hour is in range.
 */
function isHourInPeriod(hour, period) {
  return hour >= period.start && hour < period.end;
}

/**
 * Check if month falls within period range.
 * @param {number} month - Month to check.
 * @param {{start: number, end: number}} period - Period with start and end.
 * @returns {boolean} True when month is in range.
 */
function isMonthInPeriod(month, period) {
  return month >= period.start && month < period.end;
}

/**
 * Extract the label from a configured period when available.
 * @param {{label?: TimeOfDayLabel | SeasonLabel} | undefined} period Configured period.
 * @returns {TimeOfDayLabel | SeasonLabel | undefined} Period label or undefined.
 */
function getPeriodLabel(period) {
  return period?.label;
}

/**
 * Choose the matching time-of-day label from the configured ranges.
 * @param {number} hour - Hour of the day used as lookup key.
 * @returns {TimeOfDayLabel} The best matching time-of-day label.
 */
function findTimeOfDayLabel(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = timeOfDayPeriods.find(p => isHourInPeriod(normalizedHour, p));
  const label = getPeriodLabel(period);
  return label ?? 'night';
}

/**
 * Choose the season label covering the supplied month index.
 * @param {number} month - Month index between 0 and 11.
 * @returns {SeasonLabel} The season that contains the given month.
 */
function findSeasonLabel(month) {
  const normalizedMonth = ((month % 12) + 12) % 12;
  const period = seasonPeriods.find(p => isMonthInPeriod(normalizedMonth, p));
  const label = getPeriodLabel(period);
  return label ?? 'winter';
}

/**
 * Determine a textual time of day description from the hour.
 * @param {number} hour - Hour of the day in 24 hour format.
 * @returns {TimeOfDayLabel} Time of day label.
 */
function getTimeOfDay(hour) {
  return /** @type {TimeOfDayLabel} */ (findTimeOfDayLabel(hour));
}

/**
 * Convert a month index into a season label.
 * @param {number} month - Month index from 0 to 11.
 * @returns {SeasonLabel} Season label.
 */
function getSeason(month) {
  return /** @type {SeasonLabel} */ (findSeasonLabel(month));
}

/**
 * Build a descriptive phrase for the current season and time of day.
 * @param {SeasonLabel} season - Season label from getSeason().
 * @param {TimeOfDayLabel} timeOfDay - Time-of-day label from getTimeOfDay().
 * @returns {string} Human readable mood description.
 */
function getMoodDescription(season, timeOfDay) {
  /** @type {Record<SeasonLabel, string>} */
  const seasonDescriptions = {
    winter: 'crisp, icy waters',
    spring: 'bubbling, fresh currents',
    summer: 'warm, shimmering waves',
    fall: 'cool, reflective ponds',
  };
  /** @type {Record<TimeOfDayLabel, string>} */
  const timeDescriptions = {
    morning: 'as dawn breaks with promise',
    afternoon: 'under a vibrant sun',
    evening: 'in the glow of twilight',
    night: 'beneath a silent, starry sky',
  };
  const seasonLabel = /** @type {SeasonLabel} */ (season);
  const timeLabel = /** @type {TimeOfDayLabel} */ (timeOfDay);
  return `${seasonDescriptions[seasonLabel]} ${timeDescriptions[timeLabel]}`;
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

const fishingOutcomes = /** @type {FishingOutcome[]} */ ([
  {
    check: isSilentCatch,
    describe: /** @type {(bait: string, mood: string) => string} */ (
      (bait, mood) =>
        `the water stays silent. Despite your use of ${bait}, no fish disturb the ${mood}.`
    ),
  },
  {
    check: isCommonCatch,
    describe: /** @type {(bait: string, mood: string) => string} */ (
      (bait, mood) =>
        `a common carp surfaces gently, a modest reward for your effort with ${bait}, set against ${mood}.`
    ),
  },
  {
    check: isTroutCatch,
    describe: /** @type {(bait: string, mood: string) => string} */ (
      (bait, mood) =>
        `a glimmering trout appears briefly, its shimmer echoing the beauty of ${mood}. Your choice of ${bait} worked well.`
    ),
  },
  {
    check: () => true,
    describe: /** @type {(bait: string, mood: string) => string} */ (
      (bait, mood) =>
        `in a burst of brilliance, a legendary golden fish leaps forth—its radiance matching the splendor of ${mood}. Your ${bait} has yielded a prize.`
    ),
  },
]);

/**
 * Describe the result of a fishing attempt based on the random chance and mood.
 * @param {number} effectiveChance - Chance value between 0 and 1 after
 *   modifiers are applied.
 * @param {string} baitDescription - Description of the bait used.
 * @param {string} moodDescription - Description of the water mood.
 * @returns {string} Narrative describing the catch.
 */
function getFishingOutcome(effectiveChance, baitDescription, moodDescription) {
  const fallbackOutcome = fishingOutcomes[fishingOutcomes.length - 1];
  const outcome =
    fishingOutcomes.find(({ check }) => check(effectiveChance)) ??
    fallbackOutcome;
  return outcome.describe(baitDescription, moodDescription);
}

/**
 * Provide the default set of bait options used by the game.
 * @returns {Record<string, BaitDetails>} Map of bait data keyed by bait name.
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
 * @returns {{season: SeasonLabel, timeOfDay: TimeOfDayLabel}} Time context for the game.
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
 * Ensure an environment function is available and typed as a number supplier.
 * @param {{get: (name: string) => any}} env - Environment accessor provided by the toy harness.
 * @param {string} name - Name of the dependency to load from the environment.
 * @returns {() => number} The requested function cast to a numeric supplier.
 */
function requireNumericEnvFunction(env, name) {
  const candidate = env.get(name);
  if (typeof candidate !== 'function') {
    throw new Error(`Fishing game missing ${name} dependency`);
  }
  return /** @type {() => number} */ (candidate);
}

/**
 * Main entry point for the fishing mini game.
 * @param {string} input - Raw player input representing bait choice.
 * @param {{get: (name: string) => any}} env - Environment accessor used to get
 *   utilities like random number generation.
 * @returns {string} Message describing the outcome of the cast.
 */
function fishingGame(input, env) {
  const getCurrentTimeFn = requireNumericEnvFunction(env, 'getCurrentTime');
  const { season, timeOfDay } = getTimeContext(getCurrentTimeFn);

  const moodDescription = getMoodDescription(season, timeOfDay);

  const baitOptions = getBaitOptions();

  const baitDataOrError = getBaitData(input, baitOptions, moodDescription);
  if (isBaitError(baitDataOrError)) {
    return baitDataOrError.message;
  }
  const baitData = baitDataOrError;

  const getRandomNumber = requireNumericEnvFunction(env, 'getRandomNumber');
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
