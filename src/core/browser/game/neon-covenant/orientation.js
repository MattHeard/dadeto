import { manageLab } from './management.js';
import { LAB_CONTENT } from './content.js';

/**
 * Read the first-shift curriculum without inventing history for older saves.
 * @param {Record<string, any>} state Campaign being inspected.
 * @returns {number} Lesson index, or five when the curriculum is complete.
 */
export function orientationStage(state) {
  if (state.world.day > 1 || state.lab.firstShiftGuide === undefined) return 5;
  return state.lab.firstShiftGuide;
}

/** @type {string[][][]} Controller rows for actual operations and free inspection. */
const LESSONS = [
  [
    [
      `Accept clinic / +${LAB_CONTENT.contracts.clinic.advance}k`,
      'lesson:clinic',
    ],
    ['Decline for now', 'lesson:decline'],
    ['Inspect contract terms', 'lesson:terms'],
  ],
  [
    ['Repair cooling / 20k', 'lesson:cooling'],
    ['Keep four cooling units', 'lesson:decline'],
    ['Compare before buying', 'lesson:forecast'],
  ],
  [
    ['Inspect named staff', 'page:recruitment'],
    ['Keep current assignments', 'lesson:decline'],
    ['Read employee concerns', 'page:inbox'],
  ],
  [
    ['Read closing forecast', 'lesson:forecast'],
    ['Inspect staff again', 'page:recruitment'],
    ['Return to the lab', 'close'],
  ],
  [
    ['End shift / settle costs', 'shift'],
    ['Review forecast again', 'lesson:forecast'],
    ['Keep planning / no time', 'close'],
  ],
  [
    ['Read last shift report', 'page:report'],
    ['Inspect next forecast', 'preview-shift'],
    ['Return to the lab', 'close'],
  ],
];

/** @type {string[][]} Measured two-line context for each lesson. */
const CONTEXT = [
  [
    'MAE NEEDS CLINIC ATLAS',
    `${LAB_CONTENT.contracts.clinic.advance}k NOW; RELEASE BY SHIFT 12`,
  ],
  ['8 COMPUTE; ONLY 4 COOLING', '20k REPAIR RESTORES 8'],
  ['ADA + JUN: RESEARCH', 'SABLE: SAFETY; ION: SERVICE'],
  ['INSPECTION COSTS NOTHING', 'READ CASH, FATIGUE, LIMITS'],
  ['ONLY SETTLEMENT RUNS TIME', 'PAYROLL + RESEARCH THEN'],
  ['FIRST SHIFT SETTLED', 'NO RELEASE WITHOUT TESTS'],
];

/**
 * Author the current lesson's three actual controller choices.
 * @param {Record<string, any>} state Campaign being inspected.
 * @returns {string[][]} Label and command pairs.
 */
export function orientationEntries(state) {
  return LESSONS[orientationStage(state)];
}

/**
 * Produce a bounded handheld panel, not another text-only introduction.
 * @param {Record<string, any>} state Campaign with an open curriculum.
 * @returns {string[]} Title, context, choices and controller footer.
 */
export function orientationRows(state) {
  return [
    'FIRST SHIFT / MAE + ION',
    ...CONTEXT[orientationStage(state)],
    ...orientationEntries(state).map(
      ([label], index) =>
        `${index === state.menu.selected ? '>' : ' '} ${label}`
    ),
    'A CHOOSE B BACK X MENU',
  ];
}

/**
 * Commit a curriculum choice using the real order accounting, never a demo ledger.
 * @param {Record<string, any>} state Campaign with no active modal.
 * @param {string} command Lesson command.
 * @returns {Record<string, any>} Campaign ready for the next lesson or rejection.
 */
export function orientationOrder(state, command) {
  const stage = orientationStage(state);
  let next = state;
  if (command !== 'lesson:decline') {
    next = manageLab(
      state,
      command === 'lesson:clinic' ? 'contract:clinic' : 'cooling'
    );
    if (next.lab === state.lab || next.lab.decisions === state.lab.decisions)
      return next;
  }
  return {
    ...next,
    lab: { ...next.lab, firstShiftGuide: Math.min(4, stage + 1) },
    menu: { page: 'orientation', selected: 0 },
    toast: 'Choices are real. X: first-shift guide. Only END SHIFT runs time.',
  };
}
