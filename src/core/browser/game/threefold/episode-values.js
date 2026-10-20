/** Valid passenger states shared by save validation and witness snapshots. */
export const PASSENGER_OUTCOMES = new Set([
  'aboard',
  'partial',
  'evacuated',
  'lost',
]);
/** Valid ferry states shared by save validation and witness snapshots. */
export const FERRY_OUTCOMES = new Set(['afloat', 'lost']);
/** Valid Latchfolk states shared by save validation and witness snapshots. */
export const LATCHFOLK_OUTCOMES = new Set([
  'unwarned',
  'warned',
  'safe',
  'lost',
]);
/** Valid episode closure routes. */
export const EPISODE_CLOSURES = new Set(['reported', 'departed']);
