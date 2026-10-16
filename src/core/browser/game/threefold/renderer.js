import { toFramePayload } from '../mosslight-valley/renderer.js';
import { spriteShapes } from '../mosslight-valley/sprites.js';
import { heightAtScale, projectGeometryForScale } from './spatial.js';

const TILE_PIXELS = 12;
const VIEW_ORIGIN = { x: 7, y: 4 };
const PALETTE = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];

/**
 * Adapt the canonical Broken Gate simulation to Mosslight's shared handheld renderer.
 * World geometry scales around Mara while her 12x12 pixel sprite stays fixed.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current gatehouse simulation.
 * @returns {Record<string, any>} Shared 160x144 Mosslight frame plus THREEFOLD metadata.
 */
export function renderThreefoldFrame(state) {
  const heightMeters = heightAtScale(state.player.scale);
  const world = createRenderWorld(state, heightMeters);
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
      quickAction: 'grow',
      ending: null,
      tick: 0,
      toast:
        state.crisis.elapsedMinutes === 0
          ? 'INVESTIGATE THE FAILING GATE. DECIDE HOW TO RESPOND.'
          : `${state.crisis.stage.toUpperCase()} · ARROWS MOVE · A GROW · B SHRINK · X WAIT`,
      presentation: {
        palette: PALETTE,
        status: `SCALE ${formatScale(state.player.scale)} · A ${state.player.anchor}/${state.player.maximumAnchor} · ${state.crisis.stage.toUpperCase()}`,
      },
    },
    {
      frameType: 'threefold',
      spriteRenderer: (actor, camera, tick) => {
        const worldActor =
          /** @type {typeof actor & {id: string, bounds?: {min: {x: number, y: number}, max: {x: number, y: number}}}} */ (
            actor
          );
        const bounds = worldActor.bounds;
        if (typeof worldActor.id === 'string' && bounds)
          return geometrySprite(
            { ...worldActor, bounds },
            camera,
            heightMeters
          );
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
  frame.threefold = {
    scale: state.player.scale,
    heightMeters,
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    crisisStage: state.crisis.stage,
    elapsedMinutes: state.crisis.elapsedMinutes,
    tideProgress,
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
 * Convert canonical scene coordinates to the tile world used by Mosslight's camera.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {number} heightMeters Mara's current physical height.
 * @returns {Record<string, any>} Mosslight-compatible world snapshot.
 */
function createRenderWorld(state, heightMeters) {
  const { scene, player, crisis } = state;
  const { geometry } = projectGeometryForScale(player, scene.geometry);
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
      objects: geometry.map(object => ({
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
 * @param {{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}} actor Projected world object.
 * @param {{x: number, y: number}} camera Mosslight tile camera.
 * @param {number} heightMeters Mara's current physical height.
 * @returns {Array<{type: string, geometryId: string, x: number, y: number, width: number, height: number, fill: string}>} Pixelated structure shape.
 */
function geometrySprite(actor, camera, heightMeters) {
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
  if (x + width <= 0 || x >= 160 || y + height <= 0 || y >= 108) return [];
  return [
    {
      type: 'rect',
      geometryId: actor.id,
      x,
      y,
      width,
      height,
      fill: actor.id === 'relief-gate' ? PALETTE[2] : PALETTE[3],
    },
  ];
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
