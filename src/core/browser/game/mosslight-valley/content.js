/** @typedef {[string, number, number]} ScheduleLocation */
/** @typedef {{morning: ScheduleLocation, afternoon: ScheduleLocation, evening: ScheduleLocation}} DailySchedule */
/** @typedef {{label: string, set?: Record<string, string | number>, bond?: number}} AuthoredChoice */
/**
 * Immutable authored content for The Sleeping Valley chapter.
 */
/**
 * Build a daily schedule from authored morning, afternoon, and evening placements.
 * @param {ScheduleLocation} morning Morning scene location.
 * @param {ScheduleLocation} afternoon Afternoon scene location.
 * @param {ScheduleLocation} evening Evening scene location.
 * @returns {DailySchedule} Complete daily schedule.
 */
const routine = (morning, afternoon, evening) => ({
  morning,
  afternoon,
  evening,
});
/**
 * Keep dialogue lines compact while retaining optional branching choices.
 * @param {string} text - The line spoken by the character.
 * @param {AuthoredChoice[]} [choices] Optional player responses.
 * @returns {{text: string, choices?: AuthoredChoice[]}} Authored dialogue line.
 */
const dialogueLine = (text, choices) =>
  choices ? { text, choices } : { text };
/**
 * Build a chapter ending response with its unique valley trait.
 * @param {string} label - Choice displayed to the player.
 * @param {string} ending - Ending identifier to persist.
 * @param {string} trait - Valley-state trait key.
 * @returns {AuthoredChoice} Authored ending choice.
 */
const resolution = (label, ending, trait) => ({
  label,
  set: { ending, [trait]: 2 },
});
export const CONTENT = Object.freeze({
  start: { map: 'village', x: 6, y: 6, facing: 'up', name: 'Aster' },
  maps: {
    village: {
      name: 'Mosslight Village',
      width: 16,
      height: 12,
      weather: 'mist',
      palette: 'village',
      blocked: [
        '3,2',
        '4,2',
        '5,2',
        '10,2',
        '11,2',
        '12,2',
        '3,3',
        '12,3',
        '3,4',
        '12,4',
        '2,8',
        '3,8',
        '12,8',
        '13,8',
        '2,9',
        '3,9',
        '12,9',
        '13,9',
      ],
      exits: [
        { x: 0, y: 6, map: 'shore', to: [14, 6] },
        { x: 15, y: 6, map: 'orchard', to: [1, 6] },
        { x: 8, y: 0, map: 'hollow', to: [8, 10], requires: 'wellOpen' },
      ],
      objects: [
        { id: 'well', x: 8, y: 5, kind: 'well' },
        { id: 'noticeboard', x: 6, y: 3, kind: 'noticeboard' },
        { id: 'garden', x: 5, y: 9, kind: 'farm' },
        { id: 'bed', x: 7, y: 7, kind: 'rest' },
      ],
    },
    shore: {
      name: 'Glasswater Shore',
      width: 16,
      height: 12,
      weather: 'breeze',
      palette: 'shore',
      blocked: Array.from({ length: 16 }, (_, x) => `${x},0`).concat(
        Array.from({ length: 16 }, (_, x) => `${x},11`),
        Array.from({ length: 7 }, (_, i) => `8,${i + 2}`)
      ),
      exits: [{ x: 15, y: 6, map: 'village', to: [1, 6] }],
      objects: [
        { id: 'fishing', x: 6, y: 6, kind: 'fishing' },
        { id: 'shells', x: 11, y: 8, kind: 'memory' },
      ],
    },
    orchard: {
      name: 'Old Orchard',
      width: 16,
      height: 12,
      weather: 'sun',
      palette: 'orchard',
      blocked: ['3,3', '4,3', '10,4', '11,4', '5,8', '6,8', '12,8'],
      exits: [
        { x: 0, y: 6, map: 'village', to: [14, 6] },
        { x: 15, y: 6, map: 'hollow', to: [1, 6] },
      ],
      objects: [
        { id: 'orchardplot', x: 5, y: 6, kind: 'farm' },
        { id: 'fox', x: 10, y: 6, kind: 'memory' },
      ],
    },
    hollow: {
      name: 'The Listening Hollow',
      width: 16,
      height: 12,
      weather: 'dream',
      palette: 'hollow',
      blocked: ['2,2', '3,2', '12,2', '13,2', '2,9', '13,9'],
      exits: [
        { x: 8, y: 11, map: 'village', to: [8, 1] },
        { x: 0, y: 6, map: 'orchard', to: [14, 6] },
      ],
      objects: [
        { id: 'echo', x: 8, y: 5, kind: 'memory' },
        { id: 'heartdoor', x: 8, y: 2, kind: 'heartdoor' },
        { id: 'altar', x: 6, y: 5, kind: 'crafting' },
        {
          id: 'guardian',
          x: 8,
          y: 8,
          kind: 'encounter',
          creature: 'mossmurmur',
        },
      ],
    },
  },
  npcs: [
    {
      id: 'mira',
      name: 'Mira Fen',
      map: 'village',
      x: 7,
      y: 5,
      role: 'ferryperson',
      schedule: routine(['village', 7, 5], ['shore', 5, 5], ['village', 8, 6]),
      scheduleAfter: { miraTrust: { evening: ['village', 7, 6] } },
      bond: 0,
    },
    {
      id: 'uncle-vale',
      name: 'Uncle Vale',
      map: 'village',
      x: 5,
      y: 6,
      role: 'farmer',
      schedule: routine(
        ['village', 5, 6],
        ['orchard', 5, 5],
        ['village', 5, 6]
      ),
      scheduleAfter: { gardenShared: { afternoon: ['village', 6, 6] } },
      bond: 0,
    },
    {
      id: 'juniper',
      name: 'Juniper Bell',
      map: 'village',
      x: 10,
      y: 6,
      role: 'bellmaker',
      schedule: routine(
        ['village', 10, 6],
        ['village', 11, 6],
        ['village', 10, 7]
      ),
      bond: 0,
    },
    {
      id: 'pip',
      name: 'Pip',
      map: 'village',
      x: 9,
      y: 7,
      role: 'child',
      schedule: routine(['village', 9, 7], ['shore', 7, 8], ['village', 9, 7]),
      bond: 0,
    },
    {
      id: 'moth',
      name: 'The Moth Saint',
      map: 'hollow',
      x: 8,
      y: 7,
      role: 'dream-guide',
      schedule: {
        morning: ['hollow', 8, 7],
        afternoon: ['hollow', 7, 7],
        evening: ['hollow', 8, 7],
      },
      bond: 0,
    },
  ],
  dialogue: {
    mira: {
      default: [
        dialogueLine(
          'The valley has been humming in its sleep. I can hear it through the ferry rope.'
        ),
        dialogueLine(
          'If you listen at the old well, tell it we are still here.',
          [
            { label: 'I will listen.', set: { miraTrust: 1 }, bond: 1 },
            {
              label: 'Maybe it needs a lullaby.',
              set: { miraSong: 1 },
              bond: 1,
            },
          ]
        ),
      ],
      wellOpen: [
        dialogueLine('You went below? Then it has started remembering us.'),
        dialogueLine('Please bring back something that belongs to nobody.'),
      ],
    },
    'uncle-vale': {
      default: [
        { text: 'I planted turnips. The turnips planted a rumor.' },
        {
          text: 'Water the plot, then let one day pass. Farming is mostly faith and damp shoes.',
        },
      ],
    },
    juniper: {
      default: [
        { text: 'I make bells for doors that have not been built yet.' },
        {
          text: 'This one rings when someone forgets a name. It has been very busy.',
        },
      ],
    },
    pip: {
      default: [
        { text: 'The fox told me the moon is a seed.' },
        {
          text: 'Adults say the fox is imaginary. The fox says adults are imaginary.',
        },
      ],
    },
    moth: {
      default: [
        dialogueLine('I am not a saint. I am a moth with excellent posture.'),
        dialogueLine(
          'The valley is dreaming of a door. What should it dream when it wakes?',
          [
            resolution('A home with open windows.', 'gentle', 'valleyKindness'),
            resolution(
              'A road that keeps going.',
              'wandering',
              'valleyFreedom'
            ),
            resolution('A name it chose itself.', 'awake', 'valleyIdentity'),
          ]
        ),
      ],
    },
  },
  quests: {
    firstListen: {
      title: 'A Noise Under the Well',
      description: 'Visit the old well and answer Mira honestly.',
      requires: [],
      goal: 'wellHeard',
    },
    gardenSong: {
      title: 'A Garden for the Dreaming',
      description: 'Grow a moon turnip and bring a lantern fish to Vale.',
      requires: ['wellHeard'],
      goal: 'gardenShared',
    },
    hollowMemory: {
      title: 'The Borrowed Memory',
      description: 'Find three dream fragments across the valley.',
      requires: ['wellOpen'],
      goal: 'memoryCount:3',
    },
    valleyWake: {
      title: 'What Wakes a Valley?',
      description: 'Carry the villagers’ answer to the heart door.',
      requires: ['wellOpen', 'gardenShared', 'heartOpen'],
      goal: 'ending',
    },
  },
  items: {
    moonSeed: { name: 'Moon Seed', kind: 'seed' },
    moonTurnip: { name: 'Moon Turnip', kind: 'gift' },
    lanternFish: { name: 'Lantern Fish', kind: 'gift' },
    dreamFragment: { name: 'Dream Fragment', kind: 'memory' },
    reedFlute: { name: 'Reed Flute', kind: 'key' },
    hearthTea: { name: 'Hearth Tea', kind: 'healing' },
  },
  crops: {
    moonTurnip: {
      days: 2,
      seasons: ['spring', 'summer'],
      item: 'moonTurnip',
    },
  },
  fish: {
    lanternFish: {
      weather: ['breeze', 'mist', 'dream'],
      hours: [17, 24],
      item: 'lanternFish',
    },
  },
  creatures: [
    {
      id: 'mossmurmur',
      name: 'Mossmurmur',
      hp: 12,
      power: 2,
      weakness: 'song',
      intent: ['Nuzzle', 'Spore cloud', 'Listen'],
    },
    {
      id: 'bellwether',
      name: 'Bellwether',
      hp: 18,
      power: 3,
      weakness: 'memory',
      intent: ['Ring out', 'Borrow a beat', 'Wait'],
    },
  ],
  endings: {
    gentle:
      'The valley wakes slowly, keeping a little moss over its old scars.',
    wandering:
      'The valley opens its paths and carries the village toward the coast.',
    awake:
      'The valley speaks its chosen name, and every villager remembers their own.',
  },
});
