/**
 *
 * @param baitKey
 * @param baitOptions
 */
function isRecognizedBait(baitKey, baitOptions) {
  return baitKey in baitOptions;
}

/**
 *
 * @param baitKey
 */
function isEmptyBait(baitKey) {
  return baitKey.length === 0;
}

/**
 *
 * @param moodDescription
 */
function getDefaultBaitResponse(moodDescription) {
  return {
    isError: true,
    message: `You cast your line with nothing but hesitation. Without any bait, the waters remain undisturbed in their ${moodDescription}.`,
  };
}

/**
 *
 * @param baitKey
 * @param baitOptions
 */
function getRecognizedBait(baitKey, baitOptions) {
  return baitOptions[baitKey];
}

/**
 *
 */
function getUnrecognizedBait() {
  return { modifier: 0, description: 'an unconventional bait' };
}

/**
 *
 * @param baitKey
 * @param moodDescription
 */
function getEmptyOrUnrecognizedBaitResponse(baitKey, moodDescription) {
  if (isEmptyBait(baitKey)) {
    return getDefaultBaitResponse(moodDescription);
  } else {
    return getUnrecognizedBait();
  }
}

/**
 *
 * @param input
 * @param baitOptions
 * @param moodDescription
 */
function getBaitData(input, baitOptions, moodDescription) {
  const baitKey = input.trim().toLowerCase();
  if (isRecognizedBait(baitKey, baitOptions)) {
    return getRecognizedBait(baitKey, baitOptions);
  }
  return getEmptyOrUnrecognizedBaitResponse(baitKey, moodDescription);
}

/**
 *
 * @param hour
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
 *
 * @param month
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
 *
 * @param season
 * @param timeOfDay
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
 *
 * @param chance
 */
function isSilentCatch(chance) {
  return chance < 0.3;
}

/**
 *
 * @param chance
 */
function isCommonCatch(chance) {
  return chance < 0.6;
}

/**
 *
 * @param chance
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
 *
 * @param effectiveChance
 * @param baitDescription
 * @param moodDescription
 */
function getFishingOutcome(effectiveChance, baitDescription, moodDescription) {
  return fishingOutcomes
    .find(({ check }) => check(effectiveChance))
    .describe(baitDescription, moodDescription);
}

/**
 *
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
 *
 * @param getCurrentTime
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
 *
 * @param input
 * @param env
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
