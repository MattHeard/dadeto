import { toFramePayload } from '../mosslight-valley/renderer.js';
import { spriteShapes } from '../mosslight-valley/sprites.js';
import { THREEFOLD_SIGNAL_STATION_GEOMETRY_ID } from './episode.js';
import { isGatehouseRatInReach } from './encounter.js';
import { getThreefoldGateOutcome } from './outcome.js';
import { previewThreefoldGrowthEffects } from './simulation.js';
import { heightAtScale, projectGeometryForScale } from './spatial.js';

const TILE_PIXELS = 12;
const VIEW_ORIGIN = { x: 7, y: 4 };
const PALETTE = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];
/** @typedef {{type: string, x: number, y: number, width: number, height: number, fill: string, geometryId?: string, growthPreview?: boolean}} ThreefoldSpriteShape */
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
  const frame = toFramePayload(
    {
      world,
      mode: 'world',
      dialogue:
        state.crisis.elapsedMinutes === 0
          ? {
              actorId: 'dock-worker',
              lines: [
                { text: 'The tide is climbing. That gate will not hold.' },
              ],
              index: 0,
              choices: [],
            }
          : null,
      battle: null,
      journal: [],
      inventory: {},
      menu: null,
      quickAction: creatureIds.includes('gatehouse-rat')
        ? 'grow'
        : isGatehouseRatInReach(state)
          ? 'fight'
          : 'grow',
      ending: null,
      tick: 0,
      toast: getThreefoldToast(state, gateOutcome.drainageState),
      presentation: {
        palette: PALETTE,
        status: `SCALE ${formatScale(state.player.scale)} · A ${state.player.anchor}/${state.player.maximumAnchor} · ${state.crisis.stage.toUpperCase()}`,
      },
    },
    {
      frameType: 'threefold',
      spriteRenderer: (actor, camera, tick) => {
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
    }
  );
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
    creatureIds.includes('gatehouse-rat') ? 'A KILLS RAT' : null,
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
    growthPreviewIds: geometryIds,
    growthPreviewOccupantIds: occupantIds,
    growthPreviewCreatureIds: creatureIds,
    ratFate: state.encounter.ratFate,
    ratAction: state.encounter.ratAction,
  };
  return frame;
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
  const ratObjects =
    state.encounter.ratFate === 'present'
      ? scene.creatures
          .filter(creature => creature.id === 'gatehouse-rat')
          .map(creature => ({
            ...creature,
            growthPreview: growthPreviewIds.has(creature.id),
          }))
      : [];
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
        ...ratObjects,
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
