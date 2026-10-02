import {
  obstaclePixels,
  crossingPixels,
} from '../../../../src/core/browser/game/mosslight-valley/scenery.js';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import {
  createSimulation,
  stepGame,
} from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { movePlayer } from '../../../../src/core/browser/game/mosslight-valley/world.js';

const palette = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];

test('regional architecture has distinct bounded art, roofs, windows and transparent silhouettes', () => {
  const art = ['village', 'shore', 'orchard', 'hollow', 'unknown'].map(region =>
    obstaclePixels({ region, roof: false, palette })
  );
  expect(new Set(art.map(JSON.stringify)).size).toBe(4);
  const roof = obstaclePixels({ region: 'village', roof: true, palette });
  expect(roof).not.toEqual(art[0]);
  expect(obstaclePixels({ region: 'shore', roof: true, palette })).toEqual(
    art[1]
  );
  for (const tile of [...art, roof]) {
    expect(tile.length).toBeGreaterThan(40);
    expect(tile.length).toBeLessThan(144);
    expect(new Set(tile.map(pixel => pixel.fill)).size).toBeGreaterThanOrEqual(
      3
    );
    expect(
      tile.every(
        pixel => pixel.x >= 0 && pixel.x < 12 && pixel.y >= 0 && pixel.y < 12
      )
    ).toBe(true);
  }
});

test('all arrow orientations are distinct and the barred arch opens visibly', () => {
  const options = {
    direction: 'right',
    gateway: false,
    locked: false,
    palette,
  };
  const arrows = ['right', 'left', 'up', 'down'].map(direction =>
    crossingPixels({ ...options, direction })
  );
  expect(new Set(arrows.map(JSON.stringify)).size).toBe(4);
  expect(crossingPixels({ ...options, direction: 'unknown' })).toEqual(
    arrows[0]
  );
  for (const tile of arrows)
    expect(
      tile.every(
        pixel => pixel.x >= 0 && pixel.x < 12 && pixel.y >= 0 && pixel.y < 12
      )
    ).toBe(true);
  expect(
    crossingPixels({ ...options, gateway: true, locked: true })
  ).not.toEqual(crossingPixels({ ...options, gateway: true }));
});

test('every crossing has a destination sign and still follows its original story gate', () => {
  for (const [mapId, map] of Object.entries(CONTENT.maps))
    for (const exit of map.exits) {
      const state = createSimulation();
      const direction =
        exit.x === 0
          ? 'left'
          : exit.x === map.width - 1
            ? 'right'
            : exit.y === 0
              ? 'up'
              : 'down';
      const deltas = {
        left: [1, 0],
        right: [-1, 0],
        up: [0, 1],
        down: [0, -1],
      };
      state.world = {
        ...state.world,
        map,
        mapId,
        npcs: [],
        player: {
          ...state.world.player,
          x: exit.x + deltas[direction][0],
          y: exit.y + deltas[direction][1],
        },
      };
      const shapes = toFramePayload(state).shapes;
      expect(
        shapes.some(
          shape =>
            shape.text ===
            `${exit.map.toUpperCase()}${exit.requires ? ' SEALED' : ''}`
        )
      ).toBe(true);
      if (exit.requires) {
        expect(movePlayer(state.world, direction, CONTENT).mapId).toBe(mapId);
        state.world.flags[exit.requires] = true;
        expect(
          toFramePayload(state).shapes.some(
            shape => shape.text === exit.map.toUpperCase()
          )
        ).toBe(true);
      }
      expect(movePlayer(state.world, direction, CONTENT).mapId).toBe(exit.map);
    }
});

test('opening HUD gives a first task and Start explains the mystery and scrolling crossings', () => {
  const initial = createSimulation();
  expect(initial.toast).toContain('First: listen at the well');
  const guide = stepGame(initial, ['menu']);
  expect(guide.dialogue.lines[0].text).toContain('You never wrote it');
  expect(
    guide.dialogue.lines.some(line => line.text.includes('northeast'))
  ).toBe(true);
  expect(
    guide.dialogue.lines.some(line => line.text.includes('Each area scrolls'))
  ).toBe(true);
  expect(guide.world).toEqual(initial.world);
});
