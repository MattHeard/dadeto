/** Authored content for the first Commons of Tomorrow chapter. */
const positions = Object.freeze({
  elian: 'wild-continuity',
  june: 'shared-belonging',
  autonomy: 'personal-autonomy',
  tomas: 'shared-stewardship',
});

export const COMMONS_CONTENT = Object.freeze({
  start: { map: 'commons', x: 6, y: 8, facing: 'up', name: 'Sola' },
  maps: {
    commons: {
      name: 'Canopy Commons',
      width: 18,
      height: 12,
      weather: 'sun',
      palette: 'village',
      walkways: [
        ...Array.from({ length: 11 }, (_, index) => `${6 + index},8`),
        ...Array.from({ length: 3 }, (_, index) => `16,${7 - index}`),
        '17,6',
      ],
      blocked: [
        '2,2',
        '3,2',
        '4,2',
        '13,2',
        '14,2',
        '15,2',
        '2,3',
        '15,3',
        '2,4',
        '15,4',
        '3,9',
        '4,9',
        '13,9',
        '14,9',
      ],
      exits: [{ x: 17, y: 6, map: 'weir', to: [1, 6] }],
      objects: [
        { id: 'assembly-board', x: 8, y: 3, kind: 'noticeboard' },
        { id: 'charter-table', x: 9, y: 5, kind: 'charter' },
        { id: 'flood-marker', x: 10, y: 4, kind: 'flood-marker' },
        { id: 'meal-crates', x: 7, y: 7, kind: 'crates' },
        { id: 'solar-kitchen', x: 4, y: 6, kind: 'community' },
        { id: 'canopy-stair', x: 14, y: 7, kind: 'landmark' },
      ],
    },
    weir: {
      name: 'The Living Weir',
      width: 18,
      height: 12,
      weather: 'breeze',
      palette: 'shore',
      walkways: [
        ...Array.from({ length: 5 }, (_, index) => `${index},6`),
        ...Array.from({ length: 3 }, (_, index) => `${5 + index},6`),
      ],
      blocked: [
        ...Array.from({ length: 18 }, (_, x) => `${x},0`),
        ...Array.from({ length: 18 }, (_, x) => `${x},11`),
        '7,3',
        '8,3',
        '9,3',
        '7,4',
        '9,4',
        '7,5',
        '9,5',
        '3,8',
        '4,8',
        '12,7',
        '13,7',
        '14,7',
      ],
      exits: [{ x: 0, y: 6, map: 'commons', to: [16, 6] }],
      objects: [
        { id: 'old-gauge', x: 12, y: 3, kind: 'evidence' },
        { id: 'flow-board', x: 8, y: 6, kind: 'puzzle' },
        { id: 'seasonal-footbridge', x: 5, y: 6, kind: 'bridge' },
        { id: 'reed-island', x: 14, y: 5, kind: 'discovery' },
      ],
    },
  },
  chapter: 'Tandem watershed',
  npcs: [
    {
      id: 'elian',
      name: 'Elian Reed',
      role: 'wetland steward',
      values: [positions.elian],
      reason:
        'The marsh is a living neighbor, not spare land waiting for a use.',
      map: 'commons',
      x: 13,
      y: 7,
      schedule: {
        morning: ['commons', 13, 7],
        afternoon: ['weir', 12, 5],
        evening: ['weir', 10, 6],
      },
    },
    {
      id: 'june',
      name: 'June Sol',
      role: 'gathering host',
      values: [positions.june],
      reason:
        'A shared weekly meal is how neighbors become more than passersby.',
      map: 'commons',
      x: 6,
      y: 6,
      schedule: {
        morning: ['commons', 6, 6],
        afternoon: ['weir', 5, 6],
        evening: ['commons', 7, 6],
      },
    },
    {
      id: 'sari',
      name: 'Sari Nwosu',
      role: 'archive keeper',
      values: [positions.autonomy],
      reason:
        'People deserve control over when their personal stories are shared.',
      map: 'commons',
      x: 11,
      y: 6,
      schedule: {
        morning: ['commons', 11, 6],
        afternoon: ['commons', 12, 5],
        evening: ['commons', 11, 6],
      },
    },
    {
      id: 'tomas',
      name: 'Tomas Vale',
      role: 'water engineer',
      values: [positions.tomas],
      reason:
        'Shared systems need understandable rules and ways to repair mistakes.',
      map: 'weir',
      x: 5,
      y: 7,
      schedule: {
        morning: ['weir', 5, 7],
        afternoon: ['weir', 8, 7],
        evening: ['commons', 8, 7],
      },
    },
  ],
  quest: {
    id: 'river-keeps-its-own-time',
    title: 'The River Keeps Its Own Time',
    description:
      'Learn why the footbridge is closed and help the district choose how to share the floodplain.',
    evidence: ['gauge-reading'],
    choices: [
      {
        id: 'give-river-room',
        label: 'Give the river room',
        valuesProtected: ['wild-continuity'],
        agreement:
          'The marsh may reclaim the old path; gatherings move to the canopy.',
        effects: {
          marshRestored: true,
          bridgeOpen: false,
          gatheringMoved: true,
        },
      },
      {
        id: 'restore-crossing',
        label: 'Restore the shared crossing',
        valuesProtected: ['shared-belonging'],
        agreement:
          'Rebuild the footbridge and keep the weekly gathering at the weir.',
        effects: {
          marshRestored: false,
          bridgeOpen: true,
          gatheringMoved: false,
        },
      },
      {
        id: 'seasonal-pact',
        label: 'Make a seasonal pact',
        requires: ['gauge-reading'],
        valuesProtected: [
          'wild-continuity',
          'shared-belonging',
          'shared-stewardship',
        ],
        agreement:
          'Use a reversible crossing; close it during the marsh high-water season.',
        effects: {
          marshRestored: true,
          bridgeOpen: true,
          seasonalClosure: true,
          gatheringMoved: false,
        },
      },
    ],
  },
  practices: [
    {
      id: 'habitat-listening',
      name: 'Habitat Listening',
      unlock: 'gauge-reading',
      action: 'Read signs left by birds, insects, and water.',
    },
    {
      id: 'open-circle',
      name: 'Open Circle',
      unlock: 'river-agreement',
      action: 'Invite a quiet participant into a group conversation.',
    },
    {
      id: 'living-repair',
      name: 'Living Repair',
      unlock: 'river-agreement',
      action: 'Make a reversible change to a shared system.',
    },
  ],
  charter: {
    clauses: [
      'Seasonal ecological boundaries are reviewed with affected residents.',
      'Shared spaces retain accessible alternatives when their route closes.',
      'Personal stories are shared only with the storyteller’s consent.',
    ],
  },
});

/**
 * Check the minimum authored content contract before a chapter is playable.
 * @param {Record<string, any>} content Authored chapter.
 * @returns {boolean} Whether maps, values, evidence and distinct resolutions exist.
 */
export function validCommonsContent(content = COMMONS_CONTENT) {
  if (
    !content?.maps ||
    !content?.quest ||
    !Array.isArray(content.quest.choices)
  )
    return false;
  const ids = new Set(Object.keys(content.maps));
  const choices = content.quest.choices;
  return Boolean(
    ids.has('commons') &&
      ids.has('weir') &&
      content.maps.commons.exits.some(
        (/** @type {Record<string, any>} */ exit) => ids.has(exit.map)
      ) &&
      content.maps.weir.exits.some((/** @type {Record<string, any>} */ exit) =>
        ids.has(exit.map)
      ) &&
      content.npcs.length >= 4 &&
      content.npcs.every(
        (/** @type {Record<string, any>} */ npc) =>
          npc.values?.length && npc.reason && npc.schedule
      ) &&
      content.quest.evidence.includes('gauge-reading') &&
      choices.length === 3 &&
      new Set(
        choices.map((/** @type {Record<string, any>} */ choice) => choice.id)
      ).size === 3 &&
      choices.every(
        (/** @type {Record<string, any>} */ choice) =>
          choice.agreement && choice.valuesProtected?.length
      ) &&
      choices.some((/** @type {Record<string, any>} */ choice) =>
        choice.requires?.includes('gauge-reading')
      ) &&
      content.practices.length >= 3 &&
      content.charter.clauses.length >= 3
  );
}
