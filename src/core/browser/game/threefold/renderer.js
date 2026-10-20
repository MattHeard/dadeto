import { createRectShapeFromBounds } from '../../canvasShapes.js';
import { toFramePayload } from '../mosslight-valley/renderer.js';
import { spriteShapes } from '../mosslight-valley/sprites.js';
import { THREEFOLD_SIGNAL_STATION_GEOMETRY_ID } from './episode.js';
import { isGatehouseRatInReach } from './encounter.js';
import {
  THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
  THREEFOLD_SILT_MARGIN_SIGNAL_ID,
} from './silt-margin.js';
import { getThreefoldGateOutcome } from './outcome.js';
import { presentThreefoldWitnessEntry } from './witness-ledger.js';
import { presentThreefoldTestimony } from './testimony.js';
import {
  isSluiceSimulationState,
  isSiltMarginSimulationState,
  previewThreefoldGrowthEffects,
} from './simulation.js';
import { heightAtScale, projectGeometryForScale } from './spatial.js';
import { getThreefoldSluicePuzzleStatus } from './water-puzzle.js';

const TILE_PIXELS = 12;
const GRID_PIXELS = 8;
const VIEW_ORIGIN = { x: 7, y: 4 };
const PALETTE = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];
/** @typedef {{type: string, x: number, y: number, width?: number, height?: number, fill: string, text?: string, font?: string, geometryId?: string, growthPreview?: boolean}} ThreefoldSpriteShape */
const createThreefoldRectShape =
  /** @type {(bounds: [number, number, number, number], fill: string) => ThreefoldSpriteShape} */
  (createRectShapeFromBounds);
/** @type {Array<[number, number, number, number, string]>} */
const RAT_SILHOUETTE = [
  [0.16, 0.3, 0.7, 0.62, '#b46b55'],
  [0.22, 0.08, 0.2, 0.3, '#d28b69'],
  [0.66, 0.08, 0.2, 0.3, '#d28b69'],
  [0.68, 0.48, 0.08, 0.08, PALETTE[0]],
];

/**
 * Adapt the canonical Broken Gate simulation to Mosslight's shared handheld renderer.
 * World geometry scales around Mara while her 12x12 pixel sprite stays fixed.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current gatehouse simulation.
 * @returns {Record<string, any>} Shared 160x144 Mosslight frame plus THREEFOLD metadata.
 */
export function renderThreefoldFrame(state) {
  if (isSluiceSimulationState(state)) return renderThreefoldSluiceFrame(state);
  if (isSiltMarginSimulationState(state))
    return renderThreefoldSiltMarginFrame(state);
  const heightMeters = heightAtScale(state.player.scale);
  const gateOutcome = getThreefoldGateOutcome(state);
  const growthPreview = previewThreefoldGrowthEffects(state);
  const { geometryIds, occupantIds, creatureIds } = growthPreview;
  const growthPreviewSet = new Set([
    ...geometryIds,
    ...occupantIds,
    ...creatureIds,
  ]);
  const world = createRenderWorld(state, heightMeters, growthPreviewSet);
  const frame = createThreefoldFramePayload({
    world,
    dialogue:
      state.crisis.elapsedMinutes === 0
        ? {
            actorId: 'dock-worker',
            lines: [
              {
                text: 'The tide is climbing. That gate will not hold. I shouted that the gate would fail toward the lower path.',
              },
            ],
            index: 0,
            choices: [],
          }
        : null,
    quickAction: creatureIds.includes('gatehouse-rat')
      ? 'grow'
      : isGatehouseRatInReach(state)
        ? 'fight'
        : 'grow',
    toast: getThreefoldToast(state, gateOutcome.drainageState),
    presentation: {
      palette: PALETTE,
      status: `SCALE ${formatScale(state.player.scale)} · A ${state.player.anchor}/${state.player.maximumAnchor} · ${state.crisis.stage.toUpperCase()}`,
    },
    spriteRenderer: (
      /** @type {Parameters<typeof spriteShapes>[0]} */ actor,
      /** @type {Parameters<typeof spriteShapes>[1]} */ camera,
      /** @type {Parameters<typeof spriteShapes>[2]} */ tick
    ) => {
      const worldActor =
        /** @type {typeof actor & {id: string, growthPreview?: boolean, bounds?: {min: {x: number, y: number}, max: {x: number, y: number}}}} */ (
          actor
        );
      const bounds = worldActor.bounds;
      if (typeof worldActor.id === 'string' && bounds)
        return worldActor.id === 'gatehouse-rat'
          ? ratSprite({ ...worldActor, bounds }, camera, heightMeters)
          : geometrySprite({ ...worldActor, bounds }, camera, heightMeters);
      return spriteShapes(actor, camera, tick).map(shape => ({
        ...shape,
        actorId: 'mara',
      }));
    },
  });
  frame.quest = 'The Broken Gate';
  const tideProgress =
    state.crisis.elapsedMinutes / state.crisis.thresholds.aftermathAtMinutes;
  frame.shapes.push(
    { type: 'rect', x: 104, y: 4, width: 52, height: 12, fill: PALETTE[0] },
    {
      type: 'text',
      x: 107,
      y: 11,
      text: 'TIDE',
      fill: PALETTE[2],
      font: '5px monospace',
    },
    tideBar(26, PALETTE[1]),
    tideBar(Math.round(26 * tideProgress), tideColor(state.crisis.stage))
  );
  const growthLabels = [
    geometryIds.length > 0 ? getGrowthPreviewLabel(geometryIds) : null,
    occupantIds.length > 0 ? 'A KILLS LATCHFOLK' : null,
    creatureIds.length > 0 ? getCreatureGrowthPreviewLabel(creatureIds) : null,
  ].filter(label => label !== null);
  growthLabels.forEach((text, index) => {
    const y = 17 + index * 12;
    frame.shapes.push(
      { type: 'rect', x: 3, y, width: 98, height: 11, fill: PALETTE[0] },
      {
        type: 'text',
        x: 5,
        y: y + 8,
        text,
        fill: '#e16b5a',
        font: '5px monospace',
      }
    );
  });
  frame.threefold = {
    scale: state.player.scale,
    heightMeters,
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    crisisStage: state.crisis.stage,
    elapsedMinutes: state.crisis.elapsedMinutes,
    tideProgress,
    gateState: gateOutcome.gateState,
    drainageState: gateOutcome.drainageState,
    passengers: state.episode.passengers,
    ferry: state.episode.ferry,
    latchfolk: state.episode.latchfolk,
    withdrawn: state.episode.withdrawn === true,
    gateRepaired: state.episode.gateRepaired === true,
    gateRepairedBeforeSurge: state.episode.gateRepairedBeforeSurge === true,
    signalStationDestroyed: state.player.destroyedGeometryIds.includes(
      THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
    ),
    closedBy: state.episode.closedBy ?? null,
    witnessLedger: (state.episode.witnessLedger || []).map(
      presentThreefoldWitnessEntry
    ),
    testimony: presentThreefoldTestimony(),
    growthPreviewIds: geometryIds,
    growthPreviewOccupantIds: occupantIds,
    growthPreviewCreatureIds: creatureIds,
    ratFate: state.encounter.ratFate,
    ratAction: state.encounter.ratAction,
  };
  return alignThreefoldFrame(frame);
}

/**
 * Render the small-world water cutaway through Mosslight's shared frame contract.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'small-world-sluice'}}>} state Current sluice simulation.
 * @returns {Record<string, any>} Pixelated 160x144 water puzzle frame.
 */
function renderThreefoldSluiceFrame(state) {
  const heightMeters = heightAtScale(state.player.scale);
  const water = getThreefoldSluicePuzzleStatus(
    state.sluicePuzzle,
    state.player.scale
  );
  const frame = createThreefoldFramePayload({
    world: createSmallWorldFrameWorld(
      state.scene.id,
      'THE TIDAL ARCHIVE',
      state.elapsedGameSeconds,
      { x: 7, y: 4 }
    ),
    dialogue: null,
    quickAction: 'interact',
    toast: sluiceToast(water),
    presentation: {
      palette: PALETTE,
      status: `SCALE ${formatScale(state.player.scale)} · WATER MOVES WITH GAME TIME`,
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Tidal Archive';
  frame.toast = sluiceToast(water);
  frame.shapes = sluiceShapes(state, water);
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters,
    elapsedGameSeconds: state.elapsedGameSeconds,
    portOpen: water.portOpen,
    upperWaterSurfaceElevationMeters: water.upperWaterSurfaceElevationMeters,
    lowerWaterSurfaceElevationMeters: water.lowerWaterSurfaceElevationMeters,
    lowerBasinRaised: water.lowerBasinRaised,
    crossingAvailable: water.crossingAvailable,
    witnessLedger: [],
  });
}

/**
 * Render the Silt Margin branch through the shared 160×144 Mosslight renderer.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'silt-margin'}}>} state Current Silt Margin simulation.
 * @returns {Record<string, any>} Mosslight frame and branch metadata.
 */
function renderThreefoldSiltMarginFrame(state) {
  const guardian = state.siltMargin.guardian;
  const signal = state.siltMargin.signal;
  const growth = previewThreefoldGrowthEffects(state);
  const status =
    guardian === 'killed'
      ? 'GUARDIAN KILLED · CHOIR DISRUPTED'
      : guardian === 'guided-aside'
        ? signal === 'sent'
          ? 'GUARDIAN GUIDED · SIGNAL SENT'
          : 'GUARDIAN GUIDED · REACH THE ROOT'
        : 'GUARDIAN BLOCKS THE CHOIR · GROW OR GUIDE';
  const frame = createThreefoldFramePayload({
    world: createSmallWorldFrameWorld(
      state.scene.id,
      'THE SILT MARGIN',
      state.elapsedGameSeconds,
      { x: 6, y: 5 }
    ),
    dialogue: null,
    quickAction: 'grow',
    toast: status,
    presentation: {
      palette: PALETTE,
      status: `MARA ${(heightAtScale(state.player.scale) * 100).toFixed(2)} CM · ${status}`,
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Silt Margin';
  frame.toast = status;
  const playerX = snapCanvasCoordinate(
    8 + (state.player.position.x / 0.32) * 144
  );
  const playerY = snapCanvasCoordinate(
    28 + ((0.18 - state.player.position.y) / 0.18) * 72
  );
  const guardianShapes =
    guardian === 'present'
      ? [
          createThreefoldRectShape([56, 64, 16, 16], '#b46b55'),
          createThreefoldRectShape([64, 56, 16, 8], '#d28b69'),
          createThreefoldRectShape([56, 56, 8, 8], '#e9d88d'),
          createThreefoldRectShape([72, 56, 8, 8], '#e9d88d'),
        ]
      : [];
  const rootColor = signal === 'sent' ? '#25a9b8' : '#bfd77c';
  frame.shapes = [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 8, y: 12 }, 'THE SILT MARGIN', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    createThreefoldRectShape([8, 28, 144, 72], '#315744'),
    ...[16, 32, 48, 88, 104, 136].map((x, index) =>
      createThreefoldRectShape(
        [x, 36 + (index % 3) * 8, 8, 8],
        index % 2 === 0 ? '#526e4b' : '#71915b'
      )
    ),
    createThreefoldRectShape([88, 60, 24, 16], '#25a9b8'),
    createThreefoldRectShape([112, 60, 8, 24], '#526e4b'),
    createThreefoldRectShape([120, 52, 8, 40], rootColor),
    createThreefoldRectShape([112, 52, 8, 8], rootColor),
    createThreefoldRectShape([128, 44, 8, 16], rootColor),
    ...guardianShapes,
    createThreefoldRectShape([playerX, playerY, 8, 8], PALETTE[3]),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      guardian === 'killed'
        ? 'A GROWTH KILLED THE GUARDIAN'
        : guardian === 'guided-aside'
          ? signal === 'sent'
            ? 'THE CHOIR SIGNAL CROSSED'
            : 'THE SIGNAL ROOT IS OPEN'
          : 'GROW THROUGH OR GUIDE THE GUARDIAN'
    ),
    captionShape(
      { x: 8, y: 136 },
      'ARROWS MOVE · A GROW · B SHRINK · E INTERACT'
    ),
  ];
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters: heightAtScale(state.player.scale),
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    elapsedGameSeconds: state.elapsedGameSeconds,
    guardian,
    signal,
    growthPreviewCreatureIds: growth.creatureIds,
    guardianId: THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
    signalId: THREEFOLD_SILT_MARGIN_SIGNAL_ID,
    witnessLedger: [],
  });
}

/**
 * Attach scene-specific metadata and align the finished small-world frame.
 * @param {Record<string, any>} frame Completed Mosslight frame.
 * @param {Record<string, any>} threefold Scene metadata.
 * @returns {Record<string, any>} Grid-aligned THREEFOLD frame.
 */
function finishSmallWorldFrame(frame, threefold) {
  frame.threefold = threefold;
  return alignThreefoldFrame(frame);
}

/**
 * Build the common world-model input for selectable small-world regions.
 * @param {string} mapId Authored region identifier.
 * @param {string} name Visible map name.
 * @param {number} elapsedGameSeconds Explicit in-world elapsed time.
 * @param {{x: number, y: number}} player Grid-map player coordinate.
 * @returns {Record<string, any>} Mosslight world model.
 */
function createSmallWorldFrameWorld(mapId, name, elapsedGameSeconds, player) {
  return {
    mapId,
    map: {
      name,
      width: 14,
      height: 9,
      blocked: [],
      exits: [],
      objects: [],
      palette: 'shore',
    },
    player,
    npcs: [],
    day: 1,
    time: elapsedGameSeconds / 3600,
    flags: {},
  };
}

/**
 * Snap a complete THREEFOLD frame after all presentation layers are added.
 * @param {Record<string, any>} frame Completed Mosslight-compatible frame.
 * @returns {Record<string, any>} Frame with aligned canvas shapes.
 */
function alignThreefoldFrame(frame) {
  frame.shapes = snapCanvasShapesToGrid(frame.shapes);
  return frame;
}

/**
 * Align all visible THREEFOLD canvas art to an eight-pixel logical lattice.
 * Simulation coordinates and fluid levels remain continuous; only the final
 * handheld presentation is quantized.
 * @param {ThreefoldSpriteShape[]} shapes Mosslight canvas shapes.
 * @returns {ThreefoldSpriteShape[]} Canvas shapes placed on the display grid.
 */
function snapCanvasShapesToGrid(shapes) {
  return shapes.map(shape => {
    const snapped = {
      ...shape,
      x: snapCanvasCoordinate(shape.x),
      y: snapCanvasCoordinate(shape.y),
    };
    if (shape.type !== 'rect') return snapped;
    return {
      ...snapped,
      width: snapCanvasDimension(/** @type {number} */ (shape.width)),
      height: snapCanvasDimension(/** @type {number} */ (shape.height)),
    };
  });
}

/**
 * Snap a canvas coordinate to the nearest eight-pixel line.
 * @param {number} value Logical-screen position.
 * @returns {number} Grid-aligned logical-screen position.
 */
function snapCanvasCoordinate(value) {
  return Math.round(value / GRID_PIXELS) * GRID_PIXELS;
}

/**
 * Snap a positive shape dimension to a visible grid cell.
 * @param {number} value Logical-screen size.
 * @returns {number} Grid-aligned dimension, preserving a zero-width bar.
 */
function snapCanvasDimension(value) {
  if (value === 0) return 0;
  return Math.max(GRID_PIXELS, Math.ceil(value / GRID_PIXELS) * GRID_PIXELS);
}

/**
 * Apply shared Mosslight world-frame defaults to one THREEFOLD presentation.
 * @param {Record<string, any>} options Scene frame inputs.
 * @returns {Record<string, any>} Shared Mosslight canvas payload.
 */
function createThreefoldFramePayload(options) {
  return toFramePayload(
    {
      world: options.world,
      mode: 'world',
      dialogue: options.dialogue,
      battle: null,
      journal: [],
      inventory: {},
      menu: null,
      quickAction: options.quickAction,
      ending: null,
      tick: 0,
      toast: options.toast,
      presentation: options.presentation,
    },
    { frameType: 'threefold', spriteRenderer: options.spriteRenderer }
  );
}

/**
 * Draw the authored chamber cutaway and current physical water levels.
 * @param {Record<string, any>} state Current sluice simulation.
 * @param {ReturnType<typeof getThreefoldSluicePuzzleStatus>} water Current puzzle readout.
 * @returns {ThreefoldSpriteShape[]} Shapes for Mosslight's pixel canvas.
 */
function sluiceShapes(state, water) {
  const baseY = 94;
  const pixelsPerMeter = 60;
  const upperFloorY = baseY - 0.5 * pixelsPerMeter;
  const upperSurfaceY =
    baseY - water.upperWaterSurfaceElevationMeters * pixelsPerMeter;
  const lowerSurfaceY =
    baseY - water.lowerWaterSurfaceElevationMeters * pixelsPerMeter;
  const playerX = 8 + (state.player.position.x / 6) * 144;
  const playerY = 30 + ((4.5 - state.player.position.y) / 4.5) * 64;
  const waterColor = '#25a9b8';
  return [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 7, y: 12 }, 'THE TIDAL ARCHIVE', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    captionShape({ x: 11, y: 30 }, 'UPPER'),
    captionShape({ x: 92, y: 50 }, 'LOWER'),
    ...[14, 62].map(x =>
      createThreefoldRectShape([x, 36, 5, upperFloorY - 36], PALETTE[1])
    ),
    createThreefoldRectShape([19, upperFloorY, 43, 4], PALETTE[1]),
    createThreefoldRectShape(
      [19, upperSurfaceY, 43, upperFloorY - upperSurfaceY],
      waterColor
    ),
    ...[90, 138].map(x =>
      createThreefoldRectShape([x, 56, 5, baseY - 56], PALETTE[1])
    ),
    createThreefoldRectShape([95, baseY, 43, 4], PALETTE[1]),
    createThreefoldRectShape(
      [95, lowerSurfaceY, 43, baseY - lowerSurfaceY],
      waterColor
    ),
    createThreefoldRectShape([67, 83, 23, 4], PALETTE[1]),
    createThreefoldRectShape(
      [76, 79, 5, 12],
      water.portOpen ? waterColor : '#e16b5a'
    ),
    createThreefoldRectShape(
      [149, 54, 3, 43],
      water.crossingAvailable ? waterColor : '#e16b5a'
    ),
    createThreefoldRectShape([playerX, playerY, 4, 4], '#e9d88d'),
    captionShape({ x: 69, y: 102 }, water.portOpen ? 'OPEN' : 'VALVE'),
    captionShape(
      { x: 116, y: 106 },
      water.crossingAvailable ? 'CROSS' : 'SEALED'
    ),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      `PORT ${water.portOpen ? 'OPEN' : 'CLOSED'} · LOWER ${water.lowerBasinRaised ? 'RAISED' : 'LOW'}`
    ),
    captionShape(
      { x: 8, y: 136 },
      'ARROWS MOVE · A/B SCALE · E VALVE · X WAIT'
    ),
  ];
}

/**
 * @param {{x: number, y: number}} position Text anchor.
 * @param {string} text Display label.
 * @param {boolean} [large] Whether this is the scene title.
 * @returns {ThreefoldSpriteShape} Text for the shared pixel presenter.
 */
function captionShape(position, text, large = false) {
  const { x, y } = position;
  return {
    type: 'text',
    x,
    y,
    text,
    fill: PALETTE[2],
    font: large ? '6px monospace' : '5px monospace',
  };
}

/**
 * Summarize water and crossing readiness for accessibility/status surfaces.
 * @param {ReturnType<typeof getThreefoldSluicePuzzleStatus>} water Current puzzle readout.
 * @returns {string} Current sluice status.
 */
function sluiceToast(water) {
  const crossing = water.crossingAvailable
    ? 'CROSSING OPEN'
    : 'CROSSING SEALED';
  return `PORT ${water.portOpen ? 'OPEN' : 'CLOSED'} · ${crossing}`;
}

/**
 * Color the tide gauge by the deterministic crisis stage.
 * @param {'rising'|'urgent'|'surge'|'aftermath'} stage Current crisis stage.
 * @returns {string} Pixel palette color for that stage.
 */
function tideColor(stage) {
  if (stage === 'urgent') return PALETTE[3];
  if (stage === 'surge' || stage === 'aftermath') return '#e16b5a';
  return PALETTE[2];
}

/**
 * Create a screen-space tide meter bar.
 * @param {number} width Pixel width of the meter segment.
 * @param {string} fill Pixel color.
 * @returns {{type: 'rect', x: number, y: number, width: number, height: number, fill: string}} Mosslight canvas rectangle.
 */
function tideBar(width, fill) {
  return { type: 'rect', x: 126, y: 8, width, height: 4, fill };
}

/**
 * Describe the authored warning or the consequence of forcing the relief gate.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {'dry'|'at-risk'|'flooded'|'receded'} drainageState Derived lower-channel outcome.
 * @returns {string} Compact player-facing status.
 */
function getThreefoldToast(state, drainageState) {
  const signalStationDestroyed = state.player.destroyedGeometryIds.includes(
    THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
  );
  if (state.episode.closedBy === 'reported')
    return 'EPISODE CLOSED · REPORT SENT THROUGH THE SIGNAL STATION';
  if (state.episode.closedBy === 'departed') {
    const passengers = getPassengerOutcomeLabel(state.episode);
    const latchfolk = state.episode.latchfolk === 'safe' ? 'SAFE' : 'LOST';
    const communication = signalStationDestroyed
      ? 'SIGNAL STATION LOST · NO REPORT SENT'
      : 'MARA LEFT THE GATEHOUSE';
    return `EPISODE CLOSED BY DEPARTURE · ${communication} · ${passengers} · LATCHFOLK ${latchfolk}`;
  }
  if (state.crisis.elapsedMinutes === 0)
    return 'INVESTIGATE THE FAILING GATE. DECIDE HOW TO RESPOND.';
  if (state.episode.withdrawn) {
    const passengers = getPassengerOutcomeLabel(state.episode);
    const latchfolk = state.episode.latchfolk === 'safe' ? 'SAFE' : 'LOST';
    return `MARA WITHDREW · ${passengers} · LATCHFOLK ${latchfolk}`;
  }
  if (state.episode.gateRepaired) {
    if (state.episode.gateRepairedBeforeSurge === true) {
      const crisisOutcomes =
        state.crisis.stage === 'surge' || state.crisis.stage === 'aftermath'
          ? ` · ${getPassengerOutcomeLabel(state.episode)} · LATCHFOLK ${state.episode.latchfolk.toUpperCase()}`
          : '';
      const message = `GATE REPAIRED BEFORE SURGE · LOWER CHANNEL HELD${crisisOutcomes}`;
      return state.crisis.stage === 'aftermath'
        ? addClosurePrompt(state, message, signalStationDestroyed)
        : message;
    }
    const message =
      drainageState === 'receded'
        ? 'GATE REPAIRED AFTER FERRY LOSS · LOWER WATER RECEDED'
        : 'GATE REPAIRED AFTER FERRY LOSS · LOWER CHANNEL STILL FLOODED';
    return addClosurePrompt(state, message, signalStationDestroyed);
  }
  let message;
  if (state.episode.passengers === 'lost')
    message = 'PASSENGERS LOST WITH THE FERRY · THE SURGE HAS PASSED';
  else if (
    state.episode.passengers === 'evacuated' &&
    state.episode.ferry === 'lost'
  )
    message = 'PASSENGERS SAFE · FERRY LOST IN THE SURGE';
  else if (state.episode.passengers === 'evacuated')
    message = 'PASSENGERS EVACUATED · FERRY STILL AT RISK';
  else if (state.episode.passengers === 'partial')
    message = getPassengerOutcomeLabel(state.episode);
  else if (drainageState === 'flooded')
    message =
      'LOWER CHANNEL FLOODED · ARROWS MOVE · A GROW · B SHRINK · E WARN/RESCUE · X WAIT';
  else if (drainageState === 'at-risk')
    message = 'GATE FORCED OPEN · LOWER CHANNEL AT RISK · X WAIT';
  else
    message = `${state.crisis.stage.toUpperCase()} · ARROWS MOVE · A GROW · B SHRINK · E WARN/RESCUE · X WAIT`;

  const latchfolkStatus =
    state.episode.latchfolk === 'warned'
      ? 'LATCHFOLK WARNED · HEADING TO HIGHER GROUND'
      : state.episode.latchfolk === 'safe'
        ? 'LATCHFOLK SAFE'
        : state.episode.latchfolk === 'lost'
          ? 'LATCHFOLK LOST'
          : '';
  const status = latchfolkStatus ? `${message} · ${latchfolkStatus}` : message;
  const growthKillsRat =
    previewThreefoldGrowthEffects(state).creatureIds.includes('gatehouse-rat');
  const encounterStatus = growthKillsRat
    ? `${status} · RAT INSIDE · A GROW · X BYPASS`
    : isGatehouseRatInReach(state)
      ? `${status} · RAT IN REACH · A FIGHT · X BYPASS`
      : status;
  return addClosurePrompt(state, encounterStatus, signalStationDestroyed);
}

/**
 * Describe the two passenger groups across ferry and surge outcomes.
 * @param {ReturnType<import('./episode.js').createThreefoldEpisodeState>} episode Current episode outcomes.
 * @returns {string} Passenger rescue result for the shared Mosslight frame.
 */
function getPassengerOutcomeLabel(episode) {
  if (episode.passengers === 'evacuated') return 'PASSENGERS SAFE';
  if (episode.passengers === 'partial')
    return episode.ferry === 'lost'
      ? 'PASSENGERS 1/2 SAFE · 1/2 LOST'
      : 'PASSENGERS 1/2 SAFE · 1/2 STILL ABOARD';
  return episode.passengers === 'lost'
    ? 'PASSENGERS LOST'
    : 'PASSENGERS STILL ABOARD';
}

/**
 * Explain the available episode closure route once the storm has passed.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {string} message Existing branch status.
 * @param {boolean} signalStationDestroyed Whether report transmission is unavailable.
 * @returns {string} Branch status with the surviving closure route.
 */
function addClosurePrompt(state, message, signalStationDestroyed) {
  if (state.crisis.stage !== 'aftermath') return message;
  const prompt = signalStationDestroyed
    ? 'SIGNAL STATION LOST · DEPART UPLAND TO CLOSE'
    : 'STORM PASSED · FILE A REPORT OR DEPART UPLAND';
  return `${message} · ${prompt}`;
}

/**
 * Convert canonical scene coordinates to the tile world used by Mosslight's camera.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {number} heightMeters Mara's current physical height.
 * @param {Set<string>} growthPreviewIds Geometry, occupants, or creatures affected by the next growth step.
 * @returns {Record<string, any>} Mosslight-compatible world snapshot.
 */
function createRenderWorld(state, heightMeters, growthPreviewIds) {
  const { scene, player, crisis } = state;
  const { drainageState } = getThreefoldGateOutcome(state);
  const { geometry } = projectGeometryForScale(player, scene.geometry);
  const growthDeathIds = new Set(
    (state.encounter.growthDeaths ?? []).map(({ creatureId }) => creatureId)
  );
  const creatureObjects = scene.creatures
    .filter(
      creature =>
        !growthDeathIds.has(creature.id) &&
        (creature.id !== 'gatehouse-rat' ||
          state.encounter.ratFate === 'present')
    )
    .map(creature => ({
      ...creature,
      growthPreview: growthPreviewIds.has(creature.id),
    }));
  const mapWidth = Math.max(
    14,
    Math.ceil((scene.bounds.max.x - scene.bounds.min.x) / heightMeters) +
      VIEW_ORIGIN.x * 2
  );
  const mapHeight = Math.max(
    9,
    Math.ceil((scene.bounds.max.y - scene.bounds.min.y) / heightMeters) +
      VIEW_ORIGIN.y * 2
  );
  return {
    mapId: scene.id,
    location: scene.id,
    map: {
      name: 'BROKEN GATE',
      width: mapWidth,
      height: mapHeight,
      blocked: [],
      exits: [],
      palette: 'shore',
      objects: [
        ...scene.interactables
          .filter(
            ({ id }) =>
              id !== 'signal-station-console' ||
              !player.destroyedGeometryIds.includes(
                THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
              )
          )
          .map(({ id, bounds }) => ({
            id,
            bounds,
            growthPreview: growthPreviewIds.has(id),
          })),
        ...(drainageState === 'flooded'
          ? [
              {
                id: 'drainage-floodwater',
                bounds: {
                  min: { x: 9.5, y: 6.2, z: 0 },
                  max: { x: 11.5, y: 8.5, z: 0.1 },
                },
              },
            ]
          : []),
        ...creatureObjects,
        ...geometry.map(object => ({
          ...object,
          growthPreview: growthPreviewIds.has(object.id),
        })),
      ].map(object => ({
        ...object,
        x:
          VIEW_ORIGIN.x +
          centerOf(object.bounds.min.x, object.bounds.max.x) / heightMeters,
        y:
          VIEW_ORIGIN.y +
          centerOf(object.bounds.min.y, object.bounds.max.y) / heightMeters,
      })),
    },
    player: {
      x: VIEW_ORIGIN.x + player.position.x / heightMeters,
      y: VIEW_ORIGIN.y + player.position.y / heightMeters,
      facing: 'down',
    },
    time: crisis.elapsedMinutes / 60,
    day: 1,
    flags: {},
    npcs: [],
  };
}

/**
 * Paint one physical geometry footprint at the current world scale.
 * @param {{id: string, growthPreview?: boolean, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}} actor Projected world object.
 * @param {{x: number, y: number}} camera Mosslight tile camera.
 * @param {number} heightMeters Mara's current physical height.
 * @returns {Array<{type: string, geometryId: string, x: number, y: number, width: number, height: number, fill: string, growthPreview: boolean}>} Pixelated structure shape.
 */
function geometrySprite(actor, camera, heightMeters) {
  const footprint = screenFootprint(actor, camera, heightMeters);
  if (!footprint) return [];
  return [
    {
      type: 'rect',
      geometryId: actor.id,
      ...footprint,
      fill:
        actor.growthPreview === true
          ? '#e16b5a'
          : actor.id === 'drainage-floodwater'
            ? '#25a9b8'
            : actor.id === 'ferry-mooring-line'
              ? PALETTE[3]
              : actor.id === 'latchfolk-watchkeeper'
                ? '#b6d8dc'
                : actor.id === 'upland-road-exit'
                  ? '#f1ead0'
                  : actor.id === 'relief-gate'
                    ? PALETTE[2]
                    : PALETTE[3],
      growthPreview: actor.growthPreview === true,
    },
  ];
}

/**
 * Paint the authored rat as a tiny pixel silhouette inside its physical bounds.
 * @param {{bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, id: string, growthPreview?: boolean}} actor Rat footprint.
 * @param {{x: number, y: number}} camera Mosslight tile camera.
 * @param {number} heightMeters Mara's current physical height.
 * @returns {Array<ThreefoldSpriteShape>} Pixel shapes tagged with the rat identity.
 */
function ratSprite(actor, camera, heightMeters) {
  const footprint = screenFootprint(actor, camera, heightMeters);
  if (!footprint) return [];
  return RAT_SILHOUETTE.map(([left, top, width, height, fill], index) => ({
    type: 'rect',
    geometryId: actor.id,
    x: footprint.x + footprint.width * left,
    y: footprint.y + footprint.height * top,
    width: Math.max(1, footprint.width * width),
    height: Math.max(1, footprint.height * height),
    fill: actor.growthPreview === true && index < 3 ? '#e16b5a' : fill,
    growthPreview: actor.growthPreview === true,
  }));
}

/**
 * Project a physical object's bounds into the visible Mosslight viewport.
 * @param {{bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}} actor Physical footprint.
 * @param {{x: number, y: number}} camera Mosslight tile camera.
 * @param {number} heightMeters Mara's current physical height.
 * @returns {{x: number, y: number, width: number, height: number}|null} Visible pixel bounds.
 */
function screenFootprint(actor, camera, heightMeters) {
  const x =
    (actor.bounds.min.x / heightMeters + VIEW_ORIGIN.x - camera.x) *
    TILE_PIXELS;
  const y =
    (actor.bounds.min.y / heightMeters + VIEW_ORIGIN.y - camera.y) *
    TILE_PIXELS;
  const width =
    ((actor.bounds.max.x - actor.bounds.min.x) / heightMeters) * TILE_PIXELS;
  const height =
    ((actor.bounds.max.y - actor.bounds.min.y) / heightMeters) * TILE_PIXELS;
  if (x + width <= 0 || x >= 160 || y + height <= 0 || y >= 108) return null;
  return { x, y, width, height };
}

/**
 * Identify the known structures affected by the next growth action.
 * @param {string[]} geometryIds Identifiers returned by the growth preview.
 * @returns {string} Compact handheld message.
 */
function getGrowthPreviewLabel(geometryIds) {
  const labels = geometryIds.map(id =>
    id
      .replace(/^gatehouse-/, '')
      .replaceAll('-', ' ')
      .toUpperCase()
  );
  const shown =
    labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0];
  return `A BREAKS ${shown}`;
}

/**
 * Describe the creature outcomes while keeping the rat's established label.
 * @param {string[]} creatureIds Sorted creatures affected by the next growth action.
 * @returns {string} Compact handheld message.
 */
function getCreatureGrowthPreviewLabel(creatureIds) {
  if (creatureIds.length === 1 && creatureIds[0] === 'gatehouse-rat')
    return 'A KILLS RAT';
  const creatureCount = creatureIds.length;
  const countLabel =
    creatureCount === 1 ? '1 CREATURE' : `${creatureCount} CREATURES`;
  return `A KILLS ${countLabel}`;
}

/**
 * Find the center of one canonical interval.
 * @param {number} minimum Lower physical bound.
 * @param {number} maximum Upper physical bound.
 * @returns {number} Canonical midpoint.
 */
function centerOf(minimum, maximum) {
  return (minimum + maximum) / 2;
}

/**
 * Format the integer scale for the compact handheld HUD.
 * @param {number} scale Current scale rung.
 * @returns {string} Signed scale label.
 */
function formatScale(scale) {
  return scale > 0 ? `+${scale}` : String(scale);
}
