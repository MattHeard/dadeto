import { generateCommonsTile } from '../../../../src/core/browser/game/the-commons-of-tomorrow/tiles.js';
import { commonsSpriteShapes } from '../../../../src/core/browser/game/the-commons-of-tomorrow/sprites.js';
import { createCommonsState } from '../../../../src/core/browser/game/the-commons-of-tomorrow/simulation.js';
import { renderCommons } from '../../../../src/core/browser/game/the-commons-of-tomorrow/renderer.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { COMMONS_CONTENT } from '../../../../src/core/browser/game/the-commons-of-tomorrow/content.js';

const palette = ['#193b43', '#c7b98f', '#789c7f', '#e29162', '#397e89'];

describe('Commons visual identity', () => {
  test('builds coordinate-stable solar path and wetland tile motifs', () => {
    const path = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'village',
    });
    expect(
      generateCommonsTile({ x: 2, y: 4, palette, region: 'village' })
    ).toEqual(path);
    expect(path).toHaveLength(1);
    const walkway = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'village',
      walkway: true,
    });
    expect(walkway.map(pixel => pixel.fill)).toContain('#d8c78f');
    expect(walkway).not.toEqual(path);
    const terrace = generateCommonsTile({
      x: 1,
      y: 1,
      palette,
      region: 'village',
    });
    expect(terrace[0]).toMatchObject({
      width: 12,
      height: 12,
      fill: '#416d56',
    });
    const wetland = generateCommonsTile({
      x: 2,
      y: 4,
      palette,
      region: 'shore',
    });
    expect(wetland).not.toEqual(path);
    expect(wetland.map(pixel => pixel.fill)).toContain('#355760');
    expect(wetland.map(pixel => pixel.fill)).toContain('#617369');
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'village',
        blocked: true,
        roof: true,
      })
    ).toHaveLength(8);
    expect(
      generateCommonsTile({
        x: 1,
        y: 1,
        palette,
        region: 'shore',
        blocked: true,
      })
    ).toHaveLength(4);
  });

  test('draws original Commons clothing and landmark glyphs as clipped pixels', () => {
    const resident = commonsSpriteShapes(
      { id: 'elian', x: 2, y: 3 },
      { x: 0, y: 0 },
      4
    );
    const prop = commonsSpriteShapes(
      { kind: 'charter', x: 3, y: 3 },
      { x: 0, y: 0 },
      4
    );
    expect(new Set(resident.map(pixel => pixel.fill))).toEqual(
      new Set(['#11121e', '#fff078', '#5887ff', '#fff4d4'])
    );
    expect(resident.some(pixel => pixel.fill === '#e29162')).toBe(false);
    const player = commonsSpriteShapes(
      { id: 'player', controlled: true, facing: 'up', x: 2, y: 3 },
      { x: 0, y: 0 },
      4
    );
    expect(
      player.filter(pixel => pixel.fill === '#fff078').length
    ).toBeGreaterThan(
      resident.filter(pixel => pixel.fill === '#fff078').length
    );
    expect(prop.length).toBeGreaterThan(10);
    const playerDirections = ['up', 'right', 'down', 'left'].map(facing =>
      commonsSpriteShapes(
        { id: 'player', controlled: true, facing, x: 5, y: 5 },
        { x: 0, y: 0 },
        4
      ).filter(pixel => pixel.fill === '#fff078')
    );
    expect(playerDirections).toHaveLength(4);
    expect(
      new Set(
        playerDirections.map(points =>
          points
            .map(point => `${point.x},${point.y}`)
            .slice(-3)
            .join('|')
        )
      ).size
    ).toBe(4);
    const npcShapes = commonsSpriteShapes(
      { id: 'autonomy', x: 5, y: 5 },
      { x: 0, y: 0 },
      4
    );
    expect(playerDirections[0]).not.toEqual(
      npcShapes.filter(pixel => pixel.fill === '#fff078')
    );
    expect(
      commonsSpriteShapes({ id: 'player', x: -1, y: 0 }, { x: 0, y: 0 }, 4)
    ).toHaveLength(0);
    expect(
      commonsSpriteShapes(
        { id: 'unlisted', x: 2, y: 3, facing: 'left' },
        { x: 0, y: 0 },
        12
      )
    ).toHaveLength(
      commonsSpriteShapes(
        { id: 'player', x: 2, y: 3, facing: 'left' },
        { x: 0, y: 0 },
        12
      ).length
    );
    expect(
      commonsSpriteShapes({ kind: 'unlisted', x: 3, y: 3 }, { x: 0, y: 0 }, 4)
    ).toEqual(
      commonsSpriteShapes({ kind: 'discovery', x: 3, y: 3 }, { x: 0, y: 0 }, 4)
    );
  });

  test('gives Weir water and bank tiles strong foreground separation', () => {
    const weir = generateCommonsTile({
      x: 4,
      y: 4,
      palette: ['#182f36', '#617369', '#68786d', '#e29162', '#355760'],
      region: 'shore',
    });
    expect(weir.map(pixel => pixel.fill)).toContain('#355760');
    expect(weir.map(pixel => pixel.fill)).toContain('#617369');
    const luminance = hex => {
      const values = hex
        .match(/[a-f0-9]{2}/gi)
        .map(value => parseInt(value, 16) / 255);
      const linear = values.map(value =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      );
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    expect(
      Math.abs(luminance('#617369') - luminance('#355760'))
    ).toBeGreaterThan(0.07);
    const state = createCommonsState();
    state.world.mapId = 'weir';
    state.world.map = COMMONS_CONTENT.maps.weir;
    const frame = renderCommons(state);
    expect(frame.palette).toEqual([
      '#182f36',
      '#617369',
      '#68786d',
      '#e29162',
      '#355760',
    ]);
    expect(frame.shapes.some(shape => shape.fill === '#21b6cb')).toBe(true);
    expect(
      Math.abs(luminance('#21b6cb') - luminance('#355760'))
    ).toBeGreaterThan(0.2);
    const terrainLuminances = [...new Set(weir.map(pixel => pixel.fill))].map(
      luminance
    );
    expect(
      Math.max(...terrainLuminances) - Math.min(...terrainLuminances)
    ).toBeLessThan(0.15);
  });

  test('includes Commons-specific pixel art in serialized page and toy frames', () => {
    const frame = renderCommons(createCommonsState());
    expect(frame.palette).toEqual(palette);
    expect(frame.shapes.some(shape => shape.fill === '#fff078')).toBe(true);
    expect(frame.shapes.some(shape => shape.fill === '#315744')).toBe(false);
    expect(frame.commons.path).toContain('6,8');
    expect(
      frame.shapes.some(shape => shape.text === 'RIVER UP · CHECK FLOOD MARK')
    ).toBe(true);
    const openingPrompt = frame.shapes.find(
      shape => shape.text === 'RIVER UP · CHECK FLOOD MARK'
    );
    expect(openingPrompt.x + openingPrompt.text.length * 5).toBeLessThanOrEqual(
      160
    );
    const informed = renderCommons({
      ...createCommonsState(),
      world: {
        ...createCommonsState().world,
        flags: {
          earlyFloodMarkRead: true,
          'heard-june': true,
          'heard-elian': true,
        },
      },
      toast: '',
    });
    expect(
      informed.shapes.some(shape => shape.text === 'WEIR → · FOLLOW LIGHT PATH')
    ).toBe(true);
    expect(palette).toContain('#397e89');
    expect(JSON.stringify(frame)).not.toContain('commonsSpriteShapes');
    expect(toFramePayload(createCommonsState()).width).toBe(160);
  });

  test('shows the next useful water-board action as puzzle state changes', () => {
    const state = { ...createCommonsState(), mode: 'puzzle' };
    const routed = {
      ...state,
      puzzle: { ...state.puzzle, route: 'commons' },
    };
    expect(
      renderCommons(routed).shapes.some(
        shape => shape.text === 'NEXT: ARROWS TO 12 · A CARVE'
      )
    ).toBe(true);
    const carved = {
      ...routed,
      puzzle: {
        ...routed.puzzle,
        fluid: {
          ...routed.puzzle.fluid,
          solids: routed.puzzle.fluid.solids.map((solid, index) =>
            index === 11 ? false : solid
          ),
        },
      },
    };
    expect(
      renderCommons(carved).shapes.some(
        shape => shape.text === 'NEXT: ARROWS TO G · A OPEN'
      )
    ).toBe(true);
    const exhausted = {
      ...routed,
      puzzle: { ...routed.puzzle, editsUsed: 3 },
    };
    const exhaustedFrame = renderCommons(exhausted);
    expect(
      exhaustedFrame.shapes.some(
        shape => shape.text === 'X BACK · ACTIONS: RESET BOARD'
      )
    ).toBe(true);
    expect(
      exhaustedFrame.shapes
        .filter(shape => shape.type === 'text')
        .every(shape => shape.x + shape.text.length * 5 <= 160)
    ).toBe(true);
    const gateOpen = {
      ...carved,
      puzzle: { ...carved.puzzle, gateOpen: true },
    };
    expect(
      renderCommons(gateOpen).shapes.some(
        shape => shape.text === 'NEXT: Y TEST FLOW UNTIL INLET'
      )
    ).toBe(true);
    const solved = {
      ...gateOpen,
      puzzle: { ...gateOpen.puzzle, completed: true },
    };
    const solvedTexts = renderCommons(solved).shapes.filter(
      shape => shape.type === 'text'
    );
    expect(
      solvedTexts.some(shape => shape.text === 'PUZZLE SOLVED · INLET FILLED')
    ).toBe(true);
    expect(
      solvedTexts.some(shape => shape.text === 'X RETURN · FOOTBRIDGE WEST')
    ).toBe(true);
    expect(
      solvedTexts.some(shape => shape.text === 'Y TEST FLOW · X RETURN')
    ).toBe(false);
    expect(
      solvedTexts.every(shape => shape.x + shape.text.length * 5 <= 160)
    ).toBe(true);
  });

  test('gives water-board cells varied motifs and a readable visual key', () => {
    const frame = renderCommons({
      ...createCommonsState(),
      mode: 'puzzle',
    });
    const texts = frame.shapes.filter(shape => shape.type === 'text');
    expect(texts.some(shape => shape.text === 'ROCK #   CUT <>   FLOW ~')).toBe(
      true
    );
    expect(texts.every(shape => shape.x + shape.text.length * 5 <= 160)).toBe(
      true
    );
    const groundMarks = frame.shapes.filter(
      shape => shape.fill === '#315744' && shape.y >= 22 && shape.y < 99
    );
    const rockSignatures = groundMarks
      .filter(shape => shape.width >= 5 && shape.height >= 2)
      .map(shape => `${shape.x},${shape.y},${shape.width},${shape.height}`);
    expect(new Set(rockSignatures).size).toBeGreaterThan(12);
    expect(frame.shapes.some(shape => shape.fill === '#e9d88d')).toBe(true);
    expect(frame.shapes.some(shape => shape.fill === '#246774')).toBe(true);
  });

  test('renders crossing destinations and every compact field-note state', () => {
    const initial = createCommonsState();
    const commons = renderCommons({
      ...initial,
      world: {
        ...initial.world,
        player: { x: 16, y: 6, facing: 'right' },
      },
    });
    expect(commons.shapes.some(shape => shape.text === 'WEIR →')).toBe(true);

    const weir = {
      ...initial,
      world: {
        ...initial.world,
        mapId: 'weir',
        map: COMMONS_CONTENT.maps.weir,
        player: { x: 1, y: 6, facing: 'left' },
      },
      toast: ' ',
    };
    const weirFrame = renderCommons(weir);
    expect(weirFrame.shapes.some(shape => shape.text === '← COMMONS')).toBe(
      true
    );
    expect(
      weirFrame.shapes
        .filter(shape => shape.type === 'text' && shape.y >= 110)
        .map(shape => shape.text)
    ).toEqual(['WEIR · GAUGE / REEDS / FLOW', 'BOARD']);

    const heardJune = renderCommons({
      ...initial,
      toast: '',
      world: {
        ...initial.world,
        flags: { ...initial.world.flags, earlyFloodMarkRead: true },
      },
    });
    expect(
      heardJune.shapes.some(shape => shape.text === 'TALK TO JUNE AND ELIAN')
    ).toBe(true);
    const decided = renderCommons({
      ...weir,
      puzzle: { ...weir.puzzle, completed: true },
    });
    expect(
      decided.shapes.some(
        shape => shape.text === 'RETURN TO FOOTBRIDGE · DECIDE'
      )
    ).toBe(true);
    const charter = renderCommons({
      ...weir,
      agreements: [{ choice: 'restore-crossing', terms: 'Recorded.' }],
    });
    expect(
      charter.shapes
        .filter(shape => shape.type === 'text' && shape.y >= 110)
        .map(shape => shape.text)
        .join(' ')
    ).toContain('RETURN TO CANOPY · RECORD CHARTER');

    const longNote =
      'The gauge was installed before the reed beds shifted. The high-water mark is still legible. This record helps the assembly compare today with older seasons.';
    const reading = renderCommons({
      ...initial,
      toast: longNote,
      hudReading: true,
    });
    expect(
      reading.shapes.some(shape => shape.type === 'rect' && shape.x === 153)
    ).toBe(true);
    expect(
      renderCommons({ ...initial, toast: longNote }).shapes.filter(
        shape => shape.type === 'text' && shape.y >= 110
      )
    ).toHaveLength(2);
  });

  test('renders selected channel and gate guidance on their target cells', () => {
    const state = { ...createCommonsState(), mode: 'puzzle' };
    const route = {
      ...state,
      puzzle: { ...state.puzzle, route: 'commons', selectedCell: 11 },
    };
    expect(
      renderCommons(route).shapes.some(
        shape => shape.text === 'NEXT: A CARVE CHANNEL 12'
      )
    ).toBe(true);
    const gate = {
      ...route,
      puzzle: {
        ...route.puzzle,
        selectedCell: 13,
        fluid: {
          ...route.puzzle.fluid,
          solids: route.puzzle.fluid.solids.map((solid, index) =>
            index === 11 ? false : solid
          ),
        },
      },
    };
    expect(
      renderCommons(gate).shapes.some(
        shape => shape.text === 'NEXT: A OPEN GATE'
      )
    ).toBe(true);
  });

  test('falls back to up markers and clips markers beyond the screen edge', () => {
    const upMarkers = commonsSpriteShapes(
      { id: 'player', controlled: true, facing: 'up', x: 2, y: 2 },
      { x: 0, y: 0 },
      0
    )
      .filter(shape => shape.fill === '#fff078')
      .slice(-3);
    const unknownFacing = commonsSpriteShapes(
      { id: 'player', controlled: true, facing: 'diagonal', x: 2, y: 2 },
      { x: 0, y: 0 },
      0
    )
      .filter(shape => shape.fill === '#fff078')
      .slice(-3);
    expect(unknownFacing).toEqual(upMarkers);
    expect(
      commonsSpriteShapes(
        { id: 'player', controlled: true, facing: 'left', x: 0, y: 2 },
        { x: 0, y: 0 },
        0
      ).some(shape => shape.x < 0)
    ).toBe(false);
  });

  test('renders acquired practices in their menu page', () => {
    const state = {
      ...createCommonsState(),
      practices: ['habitat-listening'],
      menu: { page: 'practices', selected: 0 },
    };
    expect(
      renderCommons(state)
        .shapes.filter(shape => shape.type === 'text')
        .map(shape => shape.text)
        .join(' ')
    ).toContain('Practice learned: habitat-listening');
  });
});
