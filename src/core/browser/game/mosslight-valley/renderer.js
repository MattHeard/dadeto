// @ts-nocheck -- runtime game state is intentionally data-driven.
/** Convert game state into the shared canvas presenter payload. */
/** @param {object} state Game state. @returns {object} Canvas frame payload. */
/* eslint-disable jsdoc/require-jsdoc -- compact game-state contracts are documented at module boundaries. */
export function toFramePayload(state) {
  const shapes = [
    { type: 'rect', x: 0, y: 0, width: 160, height: 144, fill: '#9bbc0f' },
  ];
  for (let y = 0; y < state.world.map.height; y += 1)
    for (let x = 0; x < state.world.map.width; x += 1)
      shapes.push({
        type: 'rect',
        x: x * 12,
        y: y * 12,
        width: 12,
        height: 12,
        fill: state.world.map.blocked.includes(`${x},${y}`)
          ? '#306230'
          : '#8bac0f',
      });
  shapes.push({
    type: 'rect',
    x: state.world.player.x * 12 + 2,
    y: state.world.player.y * 12 + 2,
    width: 8,
    height: 8,
    fill: '#0f380f',
  });
  for (const npc of state.world.npcs)
    shapes.push({
      type: 'rect',
      x: npc.x * 12 + 3,
      y: npc.y * 12 + 3,
      width: 6,
      height: 6,
      fill: '#8b0000',
    });
  if (state.dialogue)
    shapes.push(
      { type: 'rect', x: 4, y: 108, width: 152, height: 32, fill: '#e0f8cf' },
      {
        type: 'text',
        x: 8,
        y: 120,
        text: state.dialogue.lines[state.dialogue.index],
        fill: '#0f380f',
        font: '7px monospace',
      }
    );
  if (state.battle)
    shapes.push({
      type: 'text',
      x: 8,
      y: 12,
      text: `${state.battle.creature.name} HP ${state.battle.enemyHp}`,
      fill: '#0f380f',
      font: '8px monospace',
    });
  return {
    type: 'mosslight-valley',
    width: 160,
    height: 144,
    pixelated: true,
    shapes,
    hud: {
      inventory: state.inventory,
      quest: state.quest,
      location: state.world.location,
    },
  };
}
