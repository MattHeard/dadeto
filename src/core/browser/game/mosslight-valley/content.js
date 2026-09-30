// @ts-nocheck -- runtime game state is intentionally data-driven.
/** Original, data-driven content for the Mosslight Valley episode. */
export const CONTENT = Object.freeze({
  map: { width: 12, height: 8, blocked: ['5,1', '5,2', '5,3', '8,5'] },
  player: { x: 2, y: 5, facing: 'up', name: 'Aster' },
  npcs: [
    {
      id: 'mira',
      name: 'Mira',
      x: 4,
      y: 4,
      schedule: 'village',
      relationship: 0,
    },
    {
      id: 'bramble',
      name: 'Bramble',
      x: 9,
      y: 2,
      schedule: 'dungeon',
      relationship: 0,
    },
  ],
  items: {
    turnip: { name: 'Moon Turnip', value: 3 },
    fish: { name: 'Lantern Fish', value: 5 },
  },
  quest: { id: 'mosslight', title: 'The Lantern Beneath', target: 2 },
  creatures: [{ id: 'mothkin', name: 'Mothkin', hp: 8, power: 3 }],
  dialogue: {
    mira: [
      'The old well is humming again.',
      'Bring me a Moon Turnip and a Lantern Fish.',
    ],
    bramble: ['The dungeon remembers everyone who enters.', 'Take this light.'],
  },
});
