import { isThreefoldResidentAvailable } from './return-tide-world.js';
import {
  createThreefoldPressureNetwork,
  getThreefoldNurseryWaterDepthMeters,
} from './pressure-network.js';
import { createRectShapeFromBounds } from '../../canvasShapes.js';
import { toFramePayload } from '../mosslight-valley/renderer.js';
import { spriteShapes } from '../mosslight-valley/sprites.js';
import {
  canHelpThreefoldDisplacedLatchfolk,
  canHearThreefoldLatchfolkLead,
  canSearchThreefoldFerryWreck,
  THREEFOLD_SIGNAL_STATION_DETAIL_SCALE,
  THREEFOLD_SIGNAL_STATION_GEOMETRY_ID,
  THREEFOLD_SIGNAL_STATION_HIERARCHY,
} from './episode.js';
import { isGatehouseRatInReach } from './encounter.js';
import {
  isThreefoldCrownbackTharnInReach,
  THREEFOLD_CROWNBACK_REACH_SCENE_ID,
} from './crownback-reach.js';
import {
  isThreefoldWakeformInReach,
  THREEFOLD_WAKEFORM_SHOALS_SCENE_ID,
} from './wakeform-shoals.js';
import {
  THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
  THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID,
  THREEFOLD_SILT_MARGIN_SIGNAL_ID,
} from './silt-margin.js';
import {
  THREEFOLD_HEARTHGAPS_BRIN_HOME_ID,
  THREEFOLD_HEARTHGAPS_BRIN_GATE_ID,
  THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID,
} from './hearthgaps.js';
import * as weftways from './weftways.js';
import * as grainlands from './grainlands.js';
import { getThreefoldSiltMarginWaterStatus } from './silt-margin-water.js';
import { getThreefoldGateOutcome } from './outcome.js';
import { presentThreefoldWitnessEntry } from './witness-ledger.js';
import { presentThreefoldTestimony } from './testimony.js';
import {
  isSluiceSimulationState,
  isSiltMarginSimulationState,
  isHearthgapsSimulationState,
  isHighWorldSimulationState,
  previewThreefoldGrowthEffects,
  isWeftwaysSimulationState,
  isThreefoldGrainlandsSimulationState,
} from './simulation.js';
import { heightAtScale, projectGeometryForScale } from './spatial.js';
import {
  packSceneLayout,
  projectEntity,
  resolveSceneLayout,
} from './logical-grid.js';
import { getThreefoldSluicePuzzleStatus } from './water-puzzle.js';

const TILE_PIXELS = 12;
const GRID_PIXELS = 8;
const VIEW_ORIGIN = { x: 7, y: 4 };
const PALETTE = ['#182f36', '#315744', '#bfd77c', '#e9d88d'];
/** @typedef {{type: string, x: number, y: number, width?: number, height?: number, fill: string, text?: string, font?: string, geometryId?: string, growthPreview?: boolean, logicalCellBounds?: {x: number, y: number, width: number, height: number}, logicalGridKinds?: string[], fluidChamberId?: string, logicalContainerBounds?: {x: number, y: number, width: number, height: number}, surfaceMeters?: number}} ThreefoldSpriteShape */
/** @typedef {'structure'|'interactable'|'creature'} ThreefoldGridRenderKind */
/** @typedef {{id: string, bounds: {min: {x: number, y: number, z?: number}, max: {x: number, y: number, z?: number}}, logicalGridKind: ThreefoldGridRenderKind, parentId?: string, overlapGroupId?: string, hierarchy?: {parentId?: string, expandAtScale?: number}, growthPreview?: boolean, logicalCellBounds?: {x: number, y: number, width: number, height: number}}} ThreefoldGridRenderEntity */
/** @typedef {Pick<ThreefoldGridRenderEntity, 'id'|'bounds'|'parentId'|'overlapGroupId'|'hierarchy'> & {kind:string}} HearthgapsGridFacet */
/** @typedef {Pick<ThreefoldGridRenderEntity, 'id'|'parentId'|'overlapGroupId'|'hierarchy'> & {bounds:{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}},kind:string}} GrainlandsGridFacet */
/** @typedef {Pick<ThreefoldGridRenderEntity, 'id'|'bounds'|'parentId'|'overlapGroupId'|'hierarchy'> & {bounds:{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}},kind:string}} WeftwaysGridFacet */
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
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} [pressureNetwork] Shared campaign water.
 * @param {ReturnType<typeof import('./quay-regulator.js').getThreefoldQuayContent>} [quayContent] Current physical Quay operation.
 * @returns {Record<string, any>} Shared 160x144 Mosslight frame plus THREEFOLD metadata.
 */
export function renderThreefoldFrame(
  state,
  pressureNetwork = createThreefoldPressureNetwork(),
  quayContent = null
) {
  if (isSluiceSimulationState(state)) return renderThreefoldSluiceFrame(state);
  if (isSiltMarginSimulationState(state))
    return renderThreefoldSiltMarginFrame(state);
  if (isHearthgapsSimulationState(state))
    return renderThreefoldHearthgapsFrame(state);
  if (isWeftwaysSimulationState(state))
    return renderThreefoldWeftwaysFrame(state);
  if (isThreefoldGrainlandsSimulationState(state))
    return renderThreefoldGrainlandsFrame(state, pressureNetwork);
  const isHighWorld = isHighWorldSimulationState(state);
  const heightMeters = heightAtScale(state.player.scale);
  const gateOutcome = isHighWorld
    ? {
        gateState: null,
        drainageState: /** @type {'dry'|'at-risk'|'flooded'|'receded'} */ (
          'dry'
        ),
      }
    : getThreefoldGateOutcome(state);
  const growthPreview = previewThreefoldGrowthEffects(state);
  const { geometryIds, occupantIds, creatureIds } = growthPreview;
  const growthPreviewSet = new Set([
    ...geometryIds,
    ...occupantIds,
    ...creatureIds,
  ]);
  const world = createRenderWorld(state, heightMeters, growthPreviewSet);
  const logicalGridLayout = world.logicalGridLayout;
  const frame = createThreefoldFramePayload({
    world,
    dialogue:
      !isHighWorld && state.crisis.elapsedMinutes === 0
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
    toast: quayContent
      ? quayContent.hud
      : isHighWorld
        ? getHighWorldToast(state)
        : getThreefoldToast(state, gateOutcome.drainageState),
    presentation: {
      palette: PALETTE,
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: (
      /** @type {Parameters<typeof spriteShapes>[0]} */ actor,
      /** @type {Parameters<typeof spriteShapes>[1]} */ camera,
      /** @type {Parameters<typeof spriteShapes>[2]} */ tick
    ) => {
      const worldActor =
        /** @type {typeof actor & {id: string, growthPreview?: boolean, logicalGridKind?: ThreefoldGridRenderKind, logicalCellBounds?: {x: number, y: number, width: number, height: number}, bounds?: {min: {x: number, y: number}, max: {x: number, y: number}}}} */ (
          actor
        );
      const bounds = worldActor.bounds;
      if (typeof worldActor.id === 'string' && bounds)
        return worldActor.id === 'gatehouse-rat'
          ? ratSprite(
              {
                ...worldActor,
                bounds,
                logicalGridKind: /** @type {ThreefoldGridRenderKind} */ (
                  worldActor.logicalGridKind
                ),
                logicalCellBounds:
                  /** @type {{x: number, y: number, width: number, height: number}} */ (
                    worldActor.logicalCellBounds
                  ),
              },
              camera,
              heightMeters
            )
          : geometrySprite({ ...worldActor, bounds }, camera, heightMeters);
      return spriteShapes(actor, camera, tick).map(shape => ({
        ...shape,
        actorId: 'mara',
      }));
    },
  });
  frame.quest = isHighWorld ? state.scene.displayName : 'The Broken Gate';
  const tideProgress =
    state.crisis.elapsedMinutes / state.crisis.thresholds.aftermathAtMinutes;
  if (!isHighWorld)
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
    geometryIds.length > 0
      ? getGrowthPreviewLabel(geometryIds, state.scene.geometry)
      : null,
    occupantIds.length > 0 ? 'A KILLS LATCHFOLK' : null,
    creatureIds.length > 0
      ? getCreatureGrowthPreviewLabel(creatureIds, state.scene.creatures)
      : null,
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
    ...(isHighWorld
      ? { elapsedGameSeconds: state.elapsedGameSeconds }
      : {
          crisisStage: state.crisis.stage,
          elapsedMinutes: state.crisis.elapsedMinutes,
          tideProgress,
        }),
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
    episodeEpilogue: getThreefoldEpisodeEpilogue(state, gateOutcome),
    iriRepairLog:
      state.episode.closedBy === 'reported'
        ? {
            title: "Iri's pressure-regulator log",
            text:
              'An earlier log credits Iri with an emergency pressure-regulator bypass. ' +
              'It records that downstream messages were lost, but cannot establish ' +
              'which warnings reached each settlement or what Iri understood about ' +
              'the wider consequences.',
          }
        : null,
    iriRecordedConfession:
      state.episode.closedBy === 'reported' && hasLatchfolkIriLead(state)
        ? {
            title: "Iri's recorded confession",
            text:
              'Iri writes: I saw downstream relay messages thinning after I ' +
              'opened the emergency bypass. I could not tell which settlements ' +
              'had missed warnings, but I suspected they were in danger. I kept ' +
              'the bypass open to hold Harrowfen’s pressure line and left my ' +
              'uncertainty out of the handover. The note does not identify the ' +
              'final sender or what anyone else knew.',
          }
        : null,
    iriWitnessLead: hasLatchfolkIriLead(state)
      ? {
          title: "The Watchkeeper's relay account",
          text:
            'After the surge, the watchkeeper remembers a faint relay call asking for Iri. ' +
            'They cannot say who sent it or whether Iri heard.',
        }
      : null,
    ferryWreckSearch: hasFerryWreckSearch(state)
      ? {
          title: 'Ferry wreck search',
          text: getFerryWreckSearchText(state.episode),
        }
      : null,
    latchfolkAid: hasLatchfolkDisplacementAid(state)
      ? {
          title: 'Help for displaced Latchfolk',
          text: getLatchfolkDisplacementAidText(state),
        }
      : null,
    witnessLedger: (state.episode.witnessLedger || []).map(
      presentThreefoldWitnessEntry
    ),
    testimony: isHighWorld ? null : presentThreefoldTestimony(),
    logicalGridLayout,
    growthPreviewIds: geometryIds,
    growthPreviewOccupantIds: occupantIds,
    growthPreviewCreatureIds: creatureIds,
    ratFate: state.encounter.ratFate,
    ratAction: state.encounter.ratAction,
    crownbackReach:
      state.scene.id === THREEFOLD_CROWNBACK_REACH_SCENE_ID
        ? /** @type {Record<string, any>} */ (state).crownbackReach
        : null,
    wakeformShoals:
      state.scene.id === THREEFOLD_WAKEFORM_SHOALS_SCENE_ID
        ? /** @type {Record<string, any>} */ (state).wakeformShoals
        : null,
  };
  if (quayContent && !quayContent.craneAvailable)
    frame.shapes.push(
      captionShape(
        { x: 8, y: 104 },
        pressureNetwork.craneDestroyed ? 'CRANE LOST' : 'CRANE IDLE',
        true
      )
    );
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
  const logicalGridLayout = createSluiceGridLayout(state);
  const logicalEntities = new Map(
    logicalGridLayout.entities.map(entity => [entity.id, entity])
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
    toast: `${sluiceToast(water)} · WATER FOLLOWS SIM TIME`,
    presentation: {
      palette: PALETTE,
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Tidal Archive';
  frame.toast = `${sluiceToast(water)} · WATER FOLLOWS SIM TIME`;
  frame.shapes = sluiceShapes(state, water, logicalEntities, logicalGridLayout);
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters,
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    elapsedGameSeconds: state.elapsedGameSeconds,
    portOpen: water.portOpen,
    upperWaterSurfaceElevationMeters: water.upperWaterSurfaceElevationMeters,
    lowerWaterSurfaceElevationMeters: water.lowerWaterSurfaceElevationMeters,
    lowerBasinRaised: water.lowerBasinRaised,
    crossingAvailable: water.crossingAvailable,
    archiveTraceHeard: state.archiveTraceHeard,
    logicalGridLayout,
    archiveQuietingTrace: state.archiveTraceHeard
      ? {
          title: 'Tidal Archive coil register',
          text: 'A waxed maintenance strip records the emergency pressure-regulator bypass. The receiving-coil register shows downstream replies stopping afterward. It names no sender and says nothing about what Iri knew or who was responsible.',
        }
      : null,
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
  const quietingEvidenceHeard = state.siltMargin.quietingEvidenceHeard;
  const growth = previewThreefoldGrowthEffects(state);
  const water = getThreefoldSiltMarginWaterStatus(state.siltMargin.waterPuzzle);
  const logicalGridLayout = createSiltMarginGridLayout(state, water);
  const logicalEntities = new Map(
    logicalGridLayout.entities.map(entity => [entity.id, entity])
  );
  const rootArchBroken = state.player.destroyedGeometryIds.includes(
    THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID
  );
  const waterHeight = Math.max(
    8,
    snapCanvasCoordinate((water.upstreamSurfaceElevationMeters / 0.04) * 16)
  );
  const waterY = 88 - waterHeight;
  const status =
    guardian === 'killed'
      ? 'ROOT BROKEN · GUARDIAN KILLED · CHOIR DISRUPTED'
      : guardian === 'guided-aside'
        ? quietingEvidenceHeard
          ? 'NEME TRANSLATED A QUIETING TRACE'
          : signal === 'sent'
            ? 'SIGNAL SENT · NEME’S REPLY AWAITS'
            : 'GUARDIAN GUIDED · OPEN THE FINE VALVE'
        : 'DEW BLOCKS THE ROOT · GROW OR OPEN THE VALVE';
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
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Silt Margin';
  frame.toast = status;
  const guardianShapes =
    guardian === 'present'
      ? [
          createSiltMarginEntityShape(
            logicalEntities.get(THREEFOLD_SILT_MARGIN_GUARDIAN_ID),
            state.player.scale,
            '#b46b55'
          ),
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
    ...(!rootArchBroken
      ? [
          createSiltMarginEntityShape(
            logicalEntities.get(THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID),
            state.player.scale,
            growth.geometryIds.includes(THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID)
              ? '#e16b5a'
              : '#8b7950'
          ),
        ]
      : [
          createThreefoldRectShape([64, 72, 8, 8], '#8b7950'),
          createThreefoldRectShape([80, 72, 8, 8], '#8b7950'),
        ]),
    createThreefoldRectShape([88, waterY, 24, waterHeight], '#25a9b8'),
    ...(logicalEntities.has('silt-margin-fine-valve')
      ? [
          createSiltMarginEntityShape(
            logicalEntities.get('silt-margin-fine-valve'),
            state.player.scale,
            '#e9d88d'
          ),
        ]
      : []),
    createSiltMarginEntityShape(
      logicalEntities.get('silt-margin-signal-root'),
      state.player.scale,
      rootColor
    ),
    ...guardianShapes,
    createSiltMarginEntityShape(
      logicalEntities.get('mara'),
      state.player.scale,
      PALETTE[3]
    ),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      guardian === 'killed'
        ? 'ROOT BROKEN · CHOIR SIGNAL DISRUPTED'
        : guardian === 'guided-aside'
          ? quietingEvidenceHeard
            ? 'NEME’S TRACE · FINAL SENDER UNKNOWN'
            : signal === 'sent'
              ? 'SIGNAL CROSSED · NEME’S REPLY AWAITS'
              : water.crossingAvailable
                ? 'CROSSING OPEN · REACH THE CHOIR ROOT'
                : 'OPEN THE FINE VALVE · WAIT FOR THE DEW'
          : 'GROW THROUGH THE ROOT OR GUIDE THE GUARDIAN'
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
    quietingEvidenceHeard,
    siltMarginQuietingEvidence: quietingEvidenceHeard
      ? {
          title: 'Neme’s translated Choir trace',
          text: isThreefoldResidentAvailable(state, 'silt-margin-neme')
            ? 'Neme translates the Choir’s surviving pattern: downstream replies stopped after the emergency pressure-regulator bypass. The trace does not identify who sent the final message, what Iri knew, or who was responsible.'
            : 'Neme’s saved translation records that downstream replies stopped after the pressure-regulator bypass. Neme is no longer here; this surviving trace does not resolve the final sender, Iri’s knowledge, or responsibility.',
        }
      : null,
    siltMarginWater: water,
    rootArchBroken,
    growthPreviewGeometryIds: growth.geometryIds,
    growthPreviewCreatureIds: growth.creatureIds,
    guardianId: THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
    signalId: THREEFOLD_SILT_MARGIN_SIGNAL_ID,
    witnessLedger: [],
    logicalGridLayout,
  });
}

/**
 * Resolve the Tidal Archive's authored objects and Mara on one finite cell grid.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'small-world-sluice'}}>} state Current Archive simulation.
 * @returns {Omit<ReturnType<typeof resolveSceneLayout>, 'entities'> & {viewport: ReturnType<typeof projectEntity>['cellBounds'], entities: Array<ReturnType<typeof resolveSceneLayout>['entities'][number] & {logicalGridKinds: string[]}>}} Projected Archive objects and layout diagnostics.
 */
function createSluiceGridLayout(state) {
  const { scene, player } = state;
  const halfBodyWidth = (scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  /** @type {Array<{id: string, kind: string, bounds: {min: {x: number, y: number, z?: number}, max: {x: number, y: number, z?: number}}, parentId?: string, overlapGroupId?: string, hierarchy?: {parentId?: string, expandAtScale?: number}}>} */
  const facets = [
    ...scene.geometry.map(entity => ({ ...entity, kind: 'structure' })),
    ...scene.decorations.map(entity => ({ ...entity, kind: 'decoration' })),
    ...scene.interactables.map(entity => ({ ...entity, kind: 'interactable' })),
    {
      id: 'mara',
      kind: 'actor',
      bounds: {
        min: {
          x: player.position.x - halfBodyWidth,
          y: player.position.y - halfBodyWidth,
          z: 0,
        },
        max: {
          x: player.position.x + halfBodyWidth,
          y: player.position.y + halfBodyWidth,
          z: heightAtScale(player.scale),
        },
      },
    },
  ];
  const viewport = projectEntity(
    { id: scene.id, bounds: scene.bounds },
    player.scale
  ).cellBounds;
  const layout = packSceneLayout(
    facets.map(entity => ({
      id: entity.id,
      bounds: entity.bounds,
      parentId: entity.parentId,
      overlapGroupId: entity.overlapGroupId,
      hierarchy: entity.hierarchy,
    })),
    player.scale,
    viewport
  );
  const kindsById = new Map(facets.map(({ id, kind }) => [id, kind]));
  return {
    ...layout,
    viewport,
    entities: layout.entities.map(entity => ({
      ...entity,
      logicalGridKinds: [/** @type {string} */ (kindsById.get(entity.id))],
    })),
  };
}

/**
 * Convert a resolved Archive cell rectangle to the fixed Mosslight playfield.
 * @param {ReturnType<typeof createSluiceGridLayout>['entities'][number]} entity Projected Archive entity.
 * @param {ReturnType<typeof createSluiceGridLayout>} layout Resolved finite Archive map.
 * @returns {{x:number,y:number,width:number,height:number}} Canvas-aligned object bounds.
 */
function sluiceEntityScreenRect(entity, layout) {
  const bounds = entity.cellBounds;
  const viewport = layout.viewport;
  return {
    x: snapCanvasCoordinate(
      8 + ((bounds.x - viewport.x) / viewport.width) * 144
    ),
    y: snapCanvasCoordinate(
      100 - ((bounds.y + bounds.height - viewport.y) / viewport.height) * 72
    ),
    width: Math.max(
      GRID_PIXELS,
      snapCanvasDimension((bounds.width / viewport.width) * 144)
    ),
    height: Math.max(
      GRID_PIXELS,
      snapCanvasDimension((bounds.height / viewport.height) * 72)
    ),
  };
}

/**
 * Draw a resolved entity rectangle while retaining its logical-cell evidence.
 * @param {ReturnType<typeof createSluiceGridLayout>['entities'][number]} entity Projected Archive entity.
 * @param {ReturnType<typeof createSluiceGridLayout>} layout Resolved finite Archive map.
 * @param {string} fill Display color.
 * @returns {ThreefoldSpriteShape} Cell-derived Mosslight rectangle.
 */
function createSluiceGridEntityShape(entity, layout, fill) {
  const rectangle = sluiceEntityScreenRect(entity, layout);
  return sluiceGridRect(
    entity,
    [rectangle.x, rectangle.y, rectangle.width, rectangle.height],
    fill
  );
}

/**
 * Attach canonical source identity and cell bounds to a rendered Archive part.
 * @param {ReturnType<typeof createSluiceGridLayout>['entities'][number]} entity Projected source entity.
 * @param {[number, number, number, number]} rectangle Screen rectangle.
 * @param {string} fill Display color.
 * @returns {ThreefoldSpriteShape} Grid-sourced Archive shape.
 */
function sluiceGridRect(entity, rectangle, fill) {
  return {
    ...createThreefoldRectShape(rectangle, fill),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
    logicalGridKinds: entity.logicalGridKinds,
  };
}

/**
 * Draw continuous simulated water within a cell-projected chamber.
 * @param {ReturnType<typeof createSluiceGridLayout>['entities'][number]} chamber Projected chamber entity.
 * @param {[number, number, number, number]} rectangle Water surface screen rectangle.
 * @param {string} fill Water color.
 * @param {number} surfaceMeters Exact solver surface elevation.
 * @returns {ThreefoldSpriteShape} Fluid tied to its resolved chamber.
 */
function sluiceFluidRect(chamber, rectangle, fill, surfaceMeters) {
  return {
    ...createThreefoldRectShape(rectangle, fill),
    fluidChamberId: chamber.id,
    logicalContainerBounds: chamber.cellBounds,
    surfaceMeters,
  };
}

/**
 * Draw the authored vessel outline using only its resolved cell rectangle.
 * @param {ReturnType<typeof createSluiceGridLayout>['entities'][number]} entity Projected vessel.
 * @param {{x:number,y:number,width:number,height:number}} rectangle Vessel screen bounds.
 * @returns {ThreefoldSpriteShape[]} Cell-derived vessel walls and floor.
 */
function sluiceVesselShapes(entity, rectangle) {
  const wallWidth = GRID_PIXELS;
  const wallHeight = Math.max(GRID_PIXELS, rectangle.height - GRID_PIXELS);
  return [
    sluiceGridRect(
      entity,
      [rectangle.x, rectangle.y, wallWidth, wallHeight],
      PALETTE[1]
    ),
    sluiceGridRect(
      entity,
      [
        rectangle.x + rectangle.width - wallWidth,
        rectangle.y,
        wallWidth,
        wallHeight,
      ],
      PALETTE[1]
    ),
    sluiceGridRect(
      entity,
      [
        rectangle.x,
        rectangle.y + rectangle.height - GRID_PIXELS,
        rectangle.width,
        GRID_PIXELS,
      ],
      PALETTE[1]
    ),
  ];
}

/**
 * Convert a continuous solver water surface to its in-vessel screen height.
 * @param {number} availablePixels Interior vessel height.
 * @param {number} surfaceMeters Current solver surface elevation.
 * @param {number} floorMeters Chamber floor elevation.
 * @returns {number} Canvas-grid-aligned fluid fill height.
 */
function sluiceWaterHeight(availablePixels, surfaceMeters, floorMeters) {
  const fraction = Math.max(
    0,
    Math.min(1, (surfaceMeters - floorMeters) / 1.5)
  );
  return Math.min(
    availablePixels,
    snapCanvasDimension(availablePixels * fraction)
  );
}

/**
 * Project the Silt Margin's physical scene into one logical identity per object.
 * The guardian is authored as both an interactable and a creature; those roles
 * are retained together only when their physical bounds match exactly.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'silt-margin'}}>} state Current branch simulation.
 * @param {ReturnType<typeof getThreefoldSiltMarginWaterStatus>} water Hydraulic water state.
 * @returns {ReturnType<typeof resolveSceneLayout> & {entities: Array<ReturnType<typeof resolveSceneLayout>['entities'][number] & {logicalGridKinds: string[]}>}} Deterministic projected scene layout.
 */
function createSiltMarginGridLayout(state, water) {
  const { scene, player } = state;
  const halfBodyWidth = (scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const facets = [
    ...scene.geometry.map(entity => ({ ...entity, kind: 'structure' })),
    ...scene.decorations.map(entity => ({ ...entity, kind: 'decoration' })),
    ...scene.interactables.map(entity => ({ ...entity, kind: 'interactable' })),
    ...scene.creatures.map(entity => ({ ...entity, kind: 'creature' })),
    {
      id: 'mara',
      kind: 'actor',
      bounds: {
        min: {
          x: player.position.x - halfBodyWidth,
          y: player.position.y - halfBodyWidth,
          z: 0,
        },
        max: {
          x: player.position.x + halfBodyWidth,
          y: player.position.y + halfBodyWidth,
          z: heightAtScale(player.scale),
        },
      },
    },
    {
      id: 'silt-margin-water',
      kind: 'fluid',
      bounds: {
        min: { x: 0.1778, y: 0, z: 0 },
        max: {
          x: 0.2311,
          y: Math.max(Number.EPSILON, water.upstreamSurfaceElevationMeters),
          z: Math.max(Number.EPSILON, water.upstreamSurfaceElevationMeters),
        },
      },
    },
  ];
  const byId = new Map();
  for (const facet of facets) {
    const existing = byId.get(facet.id);
    if (!existing) {
      byId.set(facet.id, { ...facet, kinds: [facet.kind] });
      continue;
    }
    if (!sameSiltMarginBounds(existing.bounds, facet.bounds))
      throw new RangeError(`Conflicting Silt Margin geometry for ${facet.id}.`);
    existing.kinds.push(facet.kind);
  }
  const viewport = projectEntity(
    { id: scene.id, bounds: scene.bounds },
    player.scale
  ).cellBounds;
  const entities = [...byId.values()].map(entity => ({
    id: entity.id,
    bounds: entity.bounds,
    parentId: entity.parentId,
    overlapGroupId: entity.overlapGroupId,
    hierarchy: entity.hierarchy,
  }));
  const resolved = resolveSceneLayout(entities, player.scale, viewport);
  /**
   * @param {ReturnType<typeof projectEntity>['cellBounds']} bounds Projected cell bounds.
   * @returns {boolean} Whether the bounds fit inside the authored viewport.
   */
  const isInsideViewport = bounds =>
    bounds.x >= viewport.x &&
    bounds.y >= viewport.y &&
    bounds.x + bounds.width <= viewport.x + viewport.width &&
    bounds.y + bounds.height <= viewport.y + viewport.height;
  const inViewportIds = new Set(
    resolved.entities
      .filter(entity => isInsideViewport(entity.cellBounds))
      .map(entity => entity.id)
  );
  const packed = packSceneLayout(
    entities.filter(entity => inViewportIds.has(entity.id)),
    player.scale,
    viewport
  );
  return {
    ...resolved,
    ...packed,
    entities: [
      ...packed.entities,
      ...resolved.entities.filter(entity => !inViewportIds.has(entity.id)),
    ]
      .map(entity => ({
        ...entity,
        logicalGridKinds: [...byId.get(entity.id).kinds].sort(),
      }))
      .sort((first, second) => first.id.localeCompare(second.id)),
    overflow: [
      ...packed.overflow,
      ...resolved.overflow.filter(
        ({ entityId }) => !inViewportIds.has(entityId)
      ),
    ],
    hierarchy: resolved.hierarchy,
    containments: resolved.containments,
    intentionalOverlaps: resolved.intentionalOverlaps,
    relationshipIssues: resolved.relationshipIssues,
  };
}

/**
 * Compare the planar physical bounds used by duplicate scene facets.
 * @param {{min: {x: number, y: number, z?: number}, max: {x: number, y: number, z?: number}}} first First facet bounds.
 * @param {{min: {x: number, y: number, z?: number}, max: {x: number, y: number, z?: number}}} second Second facet bounds.
 * @returns {boolean} Whether both facets describe identical physical geometry.
 */
function sameSiltMarginBounds(first, second) {
  return (
    first.min.x === second.min.x &&
    first.min.y === second.min.y &&
    first.min.z === second.min.z &&
    first.max.x === second.max.x &&
    first.max.y === second.max.y &&
    first.max.z === second.max.z
  );
}

/**
 * Compare Grainlands facets while allowing floating-point reconstruction noise.
 * @param {GrainlandsGridFacet['bounds']} first First authored bounds.
 * @param {GrainlandsGridFacet['bounds']} second Reconstructed duplicate bounds.
 * @returns {boolean} Whether both facets represent the same physical bounds.
 */
function sameGrainlandsBounds(first, second) {
  const differences = [
    Math.abs(first.min.x - second.min.x),
    Math.abs(first.min.y - second.min.y),
    Math.abs(first.min.z - second.min.z),
    Math.abs(first.max.x - second.max.x),
    Math.abs(first.max.y - second.max.y),
    Math.abs(first.max.z - second.max.z),
  ];
  return Math.max(...differences) <= Number.EPSILON;
}

/**
 * Create a static Silt Margin sprite whose screen rectangle comes from its logical cells.
 * @param {ReturnType<typeof resolveSceneLayout>['entities'][number] | undefined} entity Projected entity.
 * @param {number} scale Current scale.
 * @param {string} fill Sprite color.
 * @returns {ThreefoldSpriteShape} Grid-derived sprite shape.
 */
function createSiltMarginEntityShape(entity, scale, fill) {
  if (!entity) throw new RangeError('Silt Margin render entity is missing.');
  const cellSize = heightAtScale(scale);
  const bounds = entity.cellBounds;
  const pitchX = (144 / 0.32) * cellSize;
  const pitchY = (72 / 0.18) * cellSize;
  const x = snapCanvasCoordinate(8 + bounds.x * pitchX);
  const y = snapCanvasCoordinate(100 - (bounds.y + bounds.height) * pitchY);
  const width = Math.max(
    GRID_PIXELS,
    snapCanvasDimension(bounds.width * pitchX)
  );
  const height = Math.max(
    GRID_PIXELS,
    snapCanvasDimension(bounds.height * pitchY)
  );
  return {
    ...createThreefoldRectShape([x, y, width, height], fill),
    geometryId: entity.id,
    logicalCellBounds: bounds,
  };
}

/**
 * Render the Latchfolk runoff choice through Mosslight's shared handheld frame.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'hearthgaps'}}>} state Current Hearthgaps simulation.
 * @returns {Record<string, any>} Snapped pixel frame and route metadata.
 */
function renderThreefoldHearthgapsFrame(state) {
  const { runoffChoice, floodedHomeIds } = state.hearthgaps;
  const heightMeters = heightAtScale(state.player.scale);
  const growth = previewThreefoldGrowthEffects(state);
  const logicalGridLayout = createHearthgapsGridLayout(state);
  const logicalCreatures = logicalGridLayout.entities.filter(entity =>
    entity.logicalGridKinds.includes('creature')
  );
  const logicalEntities = new Map(
    logicalGridLayout.entities.map(entity => [entity.id, entity])
  );
  const brinFlooded = floodedHomeIds.includes(
    THREEFOLD_HEARTHGAPS_BRIN_HOME_ID
  );
  const downstreamFlooded = floodedHomeIds.includes(
    THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID
  );
  const brinDamaged = state.player.destroyedGeometryIds.includes(
    THREEFOLD_HEARTHGAPS_BRIN_HOME_ID
  );
  const downstreamDamaged = state.player.destroyedGeometryIds.includes(
    THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID
  );
  const flowRight = runoffChoice === 'brin-diversion';
  const flowLeft = runoffChoice === 'shared-bypass';
  const status =
    runoffChoice === 'brin-diversion'
      ? "Brin's homes stay dry; downstream homes flood."
      : runoffChoice === 'shared-bypass'
        ? "Brin's homes flood; downstream homes stay dry."
        : 'Choose where to send the culvert runoff.';
  const culvertEntity =
    /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
      logicalEntities.get('hearthgaps-culvert')
    );
  const culvert =
    culvertEntity?.placement === 'overflow'
      ? null
      : hearthgapsEntityRect(culvertEntity, logicalGridLayout);
  const maraEntity =
    /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
      logicalEntities.get('mara')
    );
  const mara =
    maraEntity?.placement === 'overflow'
      ? null
      : hearthgapsEntityRect(maraEntity, logicalGridLayout);
  const waterCount = !culvert
    ? 0
    : flowRight
      ? Math.max(1, Math.floor(culvert.width / GRID_PIXELS) - 1)
      : flowLeft
        ? 2
        : Math.min(4, Math.max(1, Math.floor(culvert.width / GRID_PIXELS) - 1));
  const waterStart = !culvert
    ? 0
    : flowLeft
      ? culvert.x + GRID_PIXELS
      : flowRight
        ? culvert.x + culvert.width - waterCount * GRID_PIXELS
        : culvert.x +
          Math.floor(
            (culvert.width / 2 - (waterCount * GRID_PIXELS) / 2) / GRID_PIXELS
          ) *
            GRID_PIXELS;
  const frame = createThreefoldFramePayload({
    world: createSmallWorldFrameWorld(
      state.scene.id,
      'HEARTHGAPS',
      state.elapsedGameSeconds,
      { x: 7, y: 5 }
    ),
    dialogue: null,
    quickAction: 'grow',
    toast: status,
    presentation: {
      palette: PALETTE,
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'Hearthgaps';
  frame.toast = status;
  frame.shapes = [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 8, y: 12 }, 'HEARTHGAPS', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    createThreefoldRectShape([8, 28, 144, 72], '#315744'),
    ...(culvert
      ? [
          hearthgapsEntityShape(culvertEntity, logicalGridLayout, '#526e4b'),
          ...Array.from({ length: waterCount }, (_, index) =>
            createThreefoldRectShape(
              [
                waterStart + index * GRID_PIXELS,
                culvert.y +
                  Math.floor(culvert.height / (2 * GRID_PIXELS)) * GRID_PIXELS,
                GRID_PIXELS,
                GRID_PIXELS,
              ],
              '#25a9b8'
            )
          ),
        ]
      : []),
    ...hearthgapsHomeShapes(
      /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
        logicalEntities.get(THREEFOLD_HEARTHGAPS_BRIN_HOME_ID)
      ),
      logicalGridLayout,
      {
        flooded: brinFlooded,
        damaged: brinDamaged,
        threatened: growth.geometryIds.includes(
          THREEFOLD_HEARTHGAPS_BRIN_HOME_ID
        ),
      }
    ),
    ...hearthgapsHomeShapes(
      /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
        logicalEntities.get(THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID)
      ),
      logicalGridLayout,
      {
        flooded: downstreamFlooded,
        damaged: downstreamDamaged,
        threatened: growth.geometryIds.includes(
          THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID
        ),
      }
    ),
    ...state.scene.interactables.flatMap(({ id }) => {
      const shape = hearthgapsControlShape(
        /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
          logicalEntities.get(id)
        ),
        logicalGridLayout
      );
      return shape ? [shape] : [];
    }),
    ...logicalCreatures.flatMap(creature => {
      const shape = hearthgapsActorShape(
        /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
          logicalEntities.get(creature.id)
        ),
        logicalGridLayout,
        '#b46b55'
      );
      return shape ? [shape] : [];
    }),
    ...(mara
      ? [
          {
            ...createThreefoldRectShape(
              [
                mara.x +
                  Math.floor((mara.width - GRID_PIXELS) / (2 * GRID_PIXELS)) *
                    GRID_PIXELS,
                mara.y +
                  Math.floor((mara.height - GRID_PIXELS) / (2 * GRID_PIXELS)) *
                    GRID_PIXELS,
                GRID_PIXELS,
                GRID_PIXELS,
              ],
              PALETTE[3]
            ),
            geometryId: 'mara',
            logicalCellBounds: maraEntity.cellBounds,
          },
        ]
      : []),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      runoffChoice === 'brin-diversion'
        ? 'BRIN SAFE · DOWNSTREAM FLOODS'
        : runoffChoice === 'shared-bypass'
          ? 'BRIN FLOODS · DOWNSTREAM SAFE'
          : 'CHOOSE WHICH HOMES FLOOD'
    ),
    captionShape({ x: 8, y: 136 }, 'MOVE · E CHOOSE · A GROW · B SHRINK'),
  ];
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters,
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    elapsedGameSeconds: state.elapsedGameSeconds,
    runoffChoice,
    floodedHomeIds: [...floodedHomeIds],
    growthPreviewGeometryIds: growth.geometryIds,
    witnessLedger: [],
    logicalGridLayout,
  });
}

/**
 * Resolve Grainlands entities and Mara into a camera-sized logical-cell view.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'grainlands'}}>} state Current Grainlands simulation.
 * @returns {Omit<ReturnType<typeof resolveSceneLayout>, 'entities'> & {viewport: ReturnType<typeof projectEntity>['cellBounds'], entities: Array<ReturnType<typeof resolveSceneLayout>['entities'][number] & {logicalGridKinds: string[]}>}} Finite camera layout.
 */
function createGrainlandsGridLayout(state) {
  const { scene, player } = state;
  const halfBodyWidth = (scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const authoredFacets = /** @type {GrainlandsGridFacet[]} */ ([
    ...scene.geometry.map(entity => ({ ...entity, kind: 'structure' })),
    .../** @type {Array<{id:string,bounds:GrainlandsGridFacet['bounds']}>} */ (
      scene.decorations
    ).map(entity => ({ ...entity, kind: 'decoration' })),
    ...scene.interactables.map(entity => ({ ...entity, kind: 'interactable' })),
    ...scene.creatures.map(entity => ({ ...entity, kind: 'creature' })),
    {
      id: 'mara',
      kind: 'actor',
      bounds: {
        min: {
          x: player.position.x - halfBodyWidth,
          y: player.position.y - halfBodyWidth,
          z: 0,
        },
        max: {
          x: player.position.x + halfBodyWidth,
          y: player.position.y + halfBodyWidth,
          z: heightAtScale(player.scale),
        },
      },
    },
  ]);
  const sceneCells = projectEntity(
    { id: scene.id, bounds: scene.bounds },
    player.scale
  ).cellBounds;
  const maraCells = projectEntity(
    authoredFacets[authoredFacets.length - 1],
    player.scale
  ).cellBounds;
  const viewport = {
    x: grainlandsViewportAxisOrigin(
      { start: sceneCells.x, size: sceneCells.width },
      { start: maraCells.x, size: maraCells.width },
      18
    ),
    y: grainlandsViewportAxisOrigin(
      { start: sceneCells.y, size: sceneCells.height },
      { start: maraCells.y, size: maraCells.height },
      8
    ),
    width: 18,
    height: 8,
  };
  const facetsById = new Map();
  for (const facet of authoredFacets) {
    const existing = facetsById.get(facet.id);
    if (!existing) {
      facetsById.set(facet.id, { ...facet, kinds: [facet.kind] });
      continue;
    }
    if (!sameGrainlandsBounds(existing.bounds, facet.bounds))
      throw new RangeError(`Conflicting Grainlands geometry for ${facet.id}.`);
    existing.kinds.push(facet.kind);
  }
  const facets = [...facetsById.keys()].sort().map(id => facetsById.get(id));
  const entities = facets.map(entity => ({
    id: entity.id,
    bounds: entity.bounds,
    parentId: entity.parentId,
    overlapGroupId: entity.overlapGroupId,
    hierarchy: entity.hierarchy,
  }));
  const resolved = resolveSceneLayout(entities, player.scale, viewport);
  const offViewportIds = new Set(
    resolved.overflow.map(({ entityId }) => entityId)
  );
  const packed = packSceneLayout(
    entities.filter(entity => !offViewportIds.has(entity.id)),
    player.scale,
    viewport
  );
  return {
    ...resolved,
    ...packed,
    viewport,
    entities: [
      ...packed.entities,
      ...resolved.entities.filter(entity => offViewportIds.has(entity.id)),
    ].map(entity => ({
      ...entity,
      logicalGridKinds: [...facetsById.get(entity.id).kinds].sort(),
    })),
    overflow: [...packed.overflow, ...resolved.overflow],
    hierarchy: resolved.hierarchy,
    containments: resolved.containments,
    intentionalOverlaps: packed.intentionalOverlaps,
    relationshipIssues: resolved.relationshipIssues,
  };
}

/**
 * Center a camera on an entity while keeping it inside the authored scene.
 * @param {{start:number,size:number}} sceneBounds Scene cells on one axis.
 * @param {{start:number,size:number}} actorBounds Actor cells on that axis.
 * @param {number} viewportSize Finite camera cell count on that axis.
 * @returns {number} Camera origin for the selected axis.
 */
function grainlandsViewportAxisOrigin(sceneBounds, actorBounds, viewportSize) {
  const centered =
    sceneBounds.size <= viewportSize
      ? sceneBounds.start - Math.floor((viewportSize - sceneBounds.size) / 2)
      : Math.floor(actorBounds.start + actorBounds.size / 2 - viewportSize / 2);
  let origin =
    sceneBounds.size <= viewportSize
      ? centered
      : Math.max(
          sceneBounds.start,
          Math.min(
            sceneBounds.start + sceneBounds.size - viewportSize,
            centered
          )
        );
  const sceneEnd = sceneBounds.start + sceneBounds.size;
  const actorEnd = actorBounds.start + actorBounds.size;
  const actorIsWithinScene =
    actorBounds.start >= sceneBounds.start - 1 && actorEnd <= sceneEnd + 1;
  if (actorIsWithinScene && actorBounds.start < origin)
    origin = actorBounds.start;
  if (actorIsWithinScene && actorEnd > origin + viewportSize)
    origin = actorEnd - viewportSize;
  return origin;
}

/**
 * Convert a placed Grainlands identity into a screen rectangle.
 * @param {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} entity Projected identity.
 * @param {ReturnType<typeof createGrainlandsGridLayout>} layout Finite camera view.
 * @returns {{x:number,y:number,width:number,height:number}|null} Screen bounds, omitted off-camera.
 */
function grainlandsEntityRect(entity, layout) {
  if (entity.placement === 'overflow') return null;
  return logicalGridEntityRect(entity, layout);
}

/**
 * Render a single cell-sized actor marker inside its projected footprint.
 * @param {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} entity Projected actor.
 * @param {ReturnType<typeof createGrainlandsGridLayout>} layout Finite camera view.
 * @param {string} fill Actor color.
 * @returns {ThreefoldSpriteShape|null} Cell-derived actor sprite.
 */
function grainlandsActorShape(entity, layout, fill) {
  const rect = grainlandsEntityRect(entity, layout);
  if (!rect) return null;
  return {
    ...createThreefoldRectShape(
      [
        rect.x +
          Math.floor((rect.width - GRID_PIXELS) / (2 * GRID_PIXELS)) *
            GRID_PIXELS,
        rect.y +
          Math.floor((rect.height - GRID_PIXELS) / (2 * GRID_PIXELS)) *
            GRID_PIXELS,
        GRID_PIXELS,
        GRID_PIXELS,
      ],
      fill
    ),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
    logicalGridKinds: entity.logicalGridKinds,
  };
}

/**
 * Render one Grainlands source rectangle from resolved logical cells.
 * @param {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} entity Projected source identity.
 * @param {ReturnType<typeof createGrainlandsGridLayout>} layout Finite camera view.
 * @param {string} fill Source state color.
 * @returns {ThreefoldSpriteShape|null} Cell-derived source shape.
 */
function grainlandsEntityShape(entity, layout, fill) {
  const rect = grainlandsEntityRect(entity, layout);
  if (!rect) return null;
  return {
    ...createThreefoldRectShape(
      [rect.x, rect.y, rect.width, rect.height],
      fill
    ),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
    logicalGridKinds: entity.logicalGridKinds,
  };
}

/**
 * Draw one intact, flooded, damaged, or growth-threatened Latchfolk home.
 * @param {ReturnType<typeof resolveSceneLayout>['entities'][number]} entity Home's logical identity.
 * @param {ReturnType<typeof createHearthgapsGridLayout>} layout Finite map layout.
 * @param {{flooded:boolean,damaged:boolean,threatened:boolean}} status Home condition.
 * @returns {ThreefoldSpriteShape[]} Grid-aligned home and flood shapes.
 */
function hearthgapsHomeShapes(entity, layout, status) {
  if (entity.placement === 'overflow') return [];
  const bounds = hearthgapsEntityRect(entity, layout);
  const wall = status.damaged
    ? '#526e4b'
    : status.threatened
      ? '#e16b5a'
      : '#bfd77c';
  const roof = status.damaged
    ? '#526e4b'
    : status.threatened
      ? '#e16b5a'
      : '#d28b69';
  const centerX =
    bounds.x + Math.floor(bounds.width / (2 * GRID_PIXELS)) * GRID_PIXELS;
  const wallY =
    bounds.y + Math.min(2 * GRID_PIXELS, bounds.height - GRID_PIXELS);
  const wallHeight = Math.max(
    GRID_PIXELS,
    bounds.y + bounds.height - wallY - GRID_PIXELS
  );
  /**
   * Attach the home identity and projected bounds to one sprite.
   * @param {ThreefoldSpriteShape} shape Home sprite shape.
   * @returns {ThreefoldSpriteShape} Tagged home sprite.
   */
  function tag(shape) {
    return {
      ...shape,
      geometryId: entity.id,
      logicalCellBounds: entity.cellBounds,
    };
  }
  return [
    tag(
      createThreefoldRectShape(
        [bounds.x, bounds.y, bounds.width, GRID_PIXELS],
        roof
      )
    ),
    ...(bounds.height >= 3 * GRID_PIXELS
      ? [
          tag(
            createThreefoldRectShape(
              [centerX, bounds.y + GRID_PIXELS, GRID_PIXELS, GRID_PIXELS],
              roof
            )
          ),
        ]
      : []),
    tag(
      createThreefoldRectShape([centerX, wallY, GRID_PIXELS, wallHeight], wall)
    ),
    tag(
      createThreefoldRectShape(
        [
          bounds.x,
          bounds.y + bounds.height - GRID_PIXELS,
          bounds.width,
          GRID_PIXELS,
        ],
        '#182f36'
      )
    ),
    ...(status.flooded
      ? [
          tag(
            createThreefoldRectShape(
              [
                bounds.x,
                bounds.y + bounds.height - 2 * GRID_PIXELS,
                bounds.width,
                GRID_PIXELS,
              ],
              '#25a9b8'
            )
          ),
        ]
      : []),
  ];
}

/**
 * Resolve Hearthgaps geometry, controls, residents and Mara into finite cells.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'hearthgaps'}}>} state Current Hearthgaps simulation.
 * @returns {Omit<ReturnType<typeof resolveSceneLayout>, 'entities'> & {viewport: ReturnType<typeof projectEntity>['cellBounds'], entities: Array<ReturnType<typeof resolveSceneLayout>['entities'][number] & {logicalGridKinds: string[]}>}} Finite authored map layout.
 */
function createHearthgapsGridLayout(state) {
  const { scene, player } = state;
  const runoffFlowIds = new Set([
    'hearthgaps-culvert',
    'hearthgaps-brin-runoff-gate',
    'hearthgaps-shared-bypass',
    'mara',
  ]);
  const runoffFlowGroupId = 'hearthgaps-runoff-flow';
  const creatures =
    /** @type {Array<Pick<ThreefoldGridRenderEntity, 'id'|'bounds'>>} */ (
      scene.creatures
    );
  const halfBodyWidth = (scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const facets = /** @type {HearthgapsGridFacet[]} */ (
    [
      ...scene.geometry.map(entity => ({ ...entity, kind: 'structure' })),
      ...scene.decorations.map(entity => ({ ...entity, kind: 'decoration' })),
      ...scene.interactables.map(entity => ({
        ...entity,
        kind: 'interactable',
      })),
      ...creatures.map(entity => ({ ...entity, kind: 'creature' })),
      {
        id: 'mara',
        kind: 'actor',
        bounds: {
          min: {
            x: player.position.x - halfBodyWidth,
            y: player.position.y - halfBodyWidth,
            z: 0,
          },
          max: {
            x: player.position.x + halfBodyWidth,
            y: player.position.y + halfBodyWidth,
            z: heightAtScale(player.scale),
          },
        },
      },
    ].map(entity =>
      runoffFlowIds.has(entity.id)
        ? { ...entity, overlapGroupId: runoffFlowGroupId }
        : entity
    )
  );
  const sceneCells = projectEntity(
    { id: scene.id, bounds: scene.bounds },
    player.scale
  ).cellBounds;
  const viewport = {
    ...sceneCells,
    width: Math.max(sceneCells.width + 1, 4),
    height: Math.max(sceneCells.height + 1, 3),
  };
  const entities = facets.map(entity => ({
    id: entity.id,
    bounds: entity.bounds,
    parentId: entity.parentId,
    overlapGroupId: entity.overlapGroupId,
    hierarchy: entity.hierarchy,
  }));
  const resolved = resolveSceneLayout(entities, player.scale, viewport);
  const offViewportIds = new Set(
    resolved.overflow.map(({ entityId }) => entityId)
  );
  const packed = packSceneLayout(
    entities.filter(entity => !offViewportIds.has(entity.id)),
    player.scale,
    viewport
  );
  const kindsById = new Map(facets.map(({ id, kind }) => [id, kind]));
  return {
    ...resolved,
    ...packed,
    viewport,
    entities: [
      ...packed.entities,
      ...resolved.entities.filter(entity => offViewportIds.has(entity.id)),
    ]
      .map(entity => ({
        ...entity,
        logicalGridKinds: [/** @type {string} */ (kindsById.get(entity.id))],
      }))
      .sort((first, second) => first.id.localeCompare(second.id)),
    overflow: [...packed.overflow, ...resolved.overflow],
    hierarchy: resolved.hierarchy,
    containments: resolved.containments,
    intentionalOverlaps: packed.intentionalOverlaps,
    relationshipIssues: resolved.relationshipIssues,
  };
}

/**
 * Convert a logical entity into an 8px-aligned Hearthgaps screen rectangle.
 * @param {ReturnType<typeof resolveSceneLayout>['entities'][number]} entity Projected entity.
 * @param {ReturnType<typeof createHearthgapsGridLayout>} layout Finite layout.
 * @returns {{x:number,y:number,width:number,height:number}} Canvas rectangle derived from its cell bounds.
 */
function hearthgapsEntityRect(entity, layout) {
  return logicalGridEntityRect(
    /** @type {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} */ (
      entity
    ),
    layout
  );
}

/**
 * Map one logical cell rectangle into the shared 144 by 72 Mosslight field.
 * @param {ReturnType<typeof createHearthgapsGridLayout>['entities'][number] | ReturnType<typeof createGrainlandsGridLayout>['entities'][number] | ReturnType<typeof createWeftwaysGridLayout>['entities'][number]} entity Projected scene identity.
 * @param {ReturnType<typeof createHearthgapsGridLayout> | ReturnType<typeof createGrainlandsGridLayout> | ReturnType<typeof createWeftwaysGridLayout>} layout Finite logical view.
 * @returns {{x:number,y:number,width:number,height:number}} Screen rectangle.
 */
function logicalGridEntityRect(entity, layout) {
  const bounds = entity.cellBounds;
  const pitch = Math.max(
    GRID_PIXELS,
    Math.floor(
      Math.min(144 / layout.viewport.width, 72 / layout.viewport.height) /
        GRID_PIXELS
    ) * GRID_PIXELS
  );
  const mapWidth = pitch * layout.viewport.width;
  const mapHeight = pitch * layout.viewport.height;
  return {
    x: snapCanvasCoordinate(
      8 + (144 - mapWidth) / 2 + (bounds.x - layout.viewport.x) * pitch
    ),
    y: snapCanvasCoordinate(
      28 +
        (72 - mapHeight) / 2 +
        (layout.viewport.height -
          (bounds.y - layout.viewport.y) -
          bounds.height) *
          pitch
    ),
    width: pitch * bounds.width,
    height: pitch * bounds.height,
  };
}

/**
 * Draw a projected Hearthgaps source entity with its logical bounds.
 * @param {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} entity Projected entity.
 * @param {ReturnType<typeof createHearthgapsGridLayout>} layout Finite layout.
 * @param {string} fill Sprite color.
 * @returns {ThreefoldSpriteShape|null} Cell-derived sprite, omitted for overflow.
 */
function hearthgapsEntityShape(entity, layout, fill) {
  const rect = hearthgapsEntityRect(entity, layout);
  return {
    ...createThreefoldRectShape(
      [rect.x, rect.y, rect.width, rect.height],
      fill
    ),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
    logicalGridKinds: /** @type {string[]} */ (entity.logicalGridKinds),
  };
}

/**
 * Draw an in-cell runoff control marker from its resolved affordance.
 * @param {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} entity Projected control.
 * @param {ReturnType<typeof createHearthgapsGridLayout>} layout Finite layout.
 * @returns {ThreefoldSpriteShape|null} Cell-derived control marker, omitted for overflow.
 */
function hearthgapsControlShape(entity, layout) {
  if (entity.placement === 'overflow') return null;
  const rect = hearthgapsEntityRect(entity, layout);
  return {
    ...createThreefoldRectShape(
      [
        rect.x +
          Math.floor((rect.width - GRID_PIXELS) / (2 * GRID_PIXELS)) *
            GRID_PIXELS,
        rect.y +
          Math.floor((rect.height - GRID_PIXELS) / (2 * GRID_PIXELS)) *
            GRID_PIXELS,
        GRID_PIXELS,
        GRID_PIXELS,
      ],
      entity.id === THREEFOLD_HEARTHGAPS_BRIN_GATE_ID ? '#e9d88d' : '#d28b69'
    ),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
  };
}

/**
 * Draw a resident sprite at the center of its resolved logical cell.
 * @param {ReturnType<typeof createHearthgapsGridLayout>['entities'][number]} entity Projected actor.
 * @param {ReturnType<typeof createHearthgapsGridLayout>} layout Finite layout.
 * @param {string} fill Sprite color.
 * @returns {ThreefoldSpriteShape|null} Cell-sourced actor sprite, omitted for overflow.
 */
function hearthgapsActorShape(entity, layout, fill) {
  if (entity.placement === 'overflow') return null;
  const rect = hearthgapsEntityRect(entity, layout);
  const offset =
    Math.floor(
      (Math.min(rect.width, rect.height) - GRID_PIXELS) / (2 * GRID_PIXELS)
    ) * GRID_PIXELS;
  return {
    ...createThreefoldRectShape(
      [rect.x + offset, rect.y + offset, GRID_PIXELS, GRID_PIXELS],
      fill
    ),
    geometryId: entity.id,
    logicalGridKinds: /** @type {string[]} */ (entity.logicalGridKinds),
    logicalCellBounds: entity.cellBounds,
  };
}

/**
 * Project Weftways source identities and Mara into its authored finite view.
 * Pell keeps one identity for its interactable and creature roles.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'weftways'}}>} state Current Weftways simulation.
 * @returns {Omit<ReturnType<typeof resolveSceneLayout>, 'entities'> & {viewport: ReturnType<typeof projectEntity>['cellBounds'], entities: Array<ReturnType<typeof resolveSceneLayout>['entities'][number] & {logicalGridKinds: string[]}>}} Projected finite scene layout.
 */
function createWeftwaysGridLayout(state) {
  const { scene, player } = state;
  const halfBodyWidth = (scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const facets = /** @type {WeftwaysGridFacet[]} */ ([
    ...scene.geometry.map(entity => ({ ...entity, kind: 'structure' })),
    ...scene.decorations.map(entity => ({ ...entity, kind: 'decoration' })),
    ...scene.interactables.map(entity => ({ ...entity, kind: 'interactable' })),
    ...scene.creatures.map(entity => ({ ...entity, kind: 'creature' })),
    {
      id: 'mara',
      kind: 'actor',
      bounds: {
        min: {
          x: player.position.x - halfBodyWidth,
          y: player.position.y - halfBodyWidth,
          z: 0,
        },
        max: {
          x: player.position.x + halfBodyWidth,
          y: player.position.y + halfBodyWidth,
          z: heightAtScale(player.scale),
        },
      },
    },
  ]);
  const byId = new Map();
  for (const facet of facets) {
    const existing = byId.get(facet.id);
    if (!existing) {
      byId.set(facet.id, { ...facet, kinds: [facet.kind] });
      continue;
    }
    if (!sameGrainlandsBounds(existing.bounds, facet.bounds))
      throw new RangeError(`Conflicting Weftways geometry for ${facet.id}.`);
    existing.kinds.push(facet.kind);
  }
  const viewport = projectEntity(
    { id: scene.id, bounds: scene.bounds },
    player.scale
  ).cellBounds;
  const intentionalOverlapGroupById = new Map([
    ['weftways-pell', 'weftways-pell-accord'],
    ['return-tide-accord-threadbound', 'weftways-pell-accord'],
  ]);
  const entities = [...byId.keys()].sort().map(id => {
    const entity = byId.get(id);
    return {
      id: entity.id,
      bounds: entity.bounds,
      parentId: entity.parentId,
      overlapGroupId:
        entity.overlapGroupId ?? intentionalOverlapGroupById.get(id),
      hierarchy: entity.hierarchy,
    };
  });
  const resolved = resolveSceneLayout(entities, player.scale, viewport);
  const offViewportIds = new Set(
    resolved.overflow.map(({ entityId }) => entityId)
  );
  const packed = packSceneLayout(
    entities.filter(entity => !offViewportIds.has(entity.id)),
    player.scale,
    viewport
  );
  return {
    ...resolved,
    ...packed,
    viewport,
    entities: [
      ...packed.entities,
      ...resolved.entities.filter(entity => offViewportIds.has(entity.id)),
    ].map(entity => ({
      ...entity,
      logicalGridKinds: [...byId.get(entity.id).kinds].sort(),
    })),
    overflow: [...packed.overflow, ...resolved.overflow],
    hierarchy: resolved.hierarchy,
    containments: resolved.containments,
    intentionalOverlaps: packed.intentionalOverlaps,
    relationshipIssues: resolved.relationshipIssues,
  };
}

/**
 * Render the Threadbound crossing and its two flow choices on the handheld grid.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'weftways'}}>} state Current Weftways simulation.
 * @returns {Record<string, any>} Snapped Mosslight frame and route metadata.
 */
function renderThreefoldWeftwaysFrame(state) {
  const {
    flowChoice,
    floodedGeometryIds,
    relayRecordRead,
    relayRecordShared,
    relayRecordConcealed,
    relayRecordDestroyed,
    relayRestitutionNegotiated,
  } = state.weftways;
  const pellDied = weftways.hasThreefoldWeftwaysPellGrowthDeath(
    state.encounter
  );
  const rootFlooded = floodedGeometryIds.includes(
    weftways.THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID
  );
  const quayFlooded = floodedGeometryIds.includes(
    weftways.THREEFOLD_WEFTWAYS_LOW_QUAY_ID
  );
  const growth = previewThreefoldGrowthEffects(state);
  const beetleFates = new Set(
    (state.encounter.growthDeaths ?? []).map(({ creatureId }) => creatureId)
  );
  const flowMessage = relayRecordShared
    ? pellDied
      ? 'Mara shared Pell’s record with the relay keeper; responsibility remains unresolved.'
      : 'Mara shared the record; responsibility remains unresolved.'
    : relayRecordConcealed
      ? pellDied
        ? 'Mara keeps Pell’s record private from the relay keeper.'
        : 'Mara keeps Pell’s record private.'
      : relayRecordDestroyed
        ? 'Mara destroyed the record; responsibility remains unresolved.'
        : relayRestitutionNegotiated
          ? pellDied
            ? 'The relay keeper records Mara’s offer and will carry it onward; Pell’s answer is unknown.'
            : flowChoice === 'pell-bypass'
              ? 'Pell accepts Mara’s offer to carry relay tokens and help restore the route.'
              : 'Pell defers terms until root-channel damage is assessed.'
          : flowChoice === 'pell-bypass'
            ? pellDied
              ? 'The relay keeper preserves Pell’s crossing choice; roots hold, quay floods.'
              : 'Pell trusts Mara; roots hold, quay floods.'
            : flowChoice === 'quay-spill'
              ? pellDied
                ? 'The relay keeper preserves Pell’s crossing choice; quay stays dry, root crossing floods.'
                : 'Pell is wary; quay stays dry, root crossing floods.'
              : pellDied
                ? 'The relay keeper can discuss the crossing and preserve its evidence.'
                : 'Pell knows a bypass through the deep roots.';
  const threadboundIndependentPublication =
    flowChoice === 'quay-spill'
      ? {
          title: pellDied
            ? 'Caravan relay keeper’s independent notice'
            : 'Pell’s independent relay notice',
          text:
            `After the root crossing flooded, ${pellDied ? 'the caravan relay keeper published' : 'Pell posted'} a notice from the ` +
            'caravan’s own relay notes to help the downstream crews restore ' +
            'their route. The notes say relay tokens stopped arriving after ' +
            'the emergency pressure-regulator bypass. They do not identify ' +
            'the final sender, establish what Iri knew, or assign responsibility.',
        }
      : null;
  const logicalGridLayout = createWeftwaysGridLayout(state);
  const logicalEntities = new Map(
    logicalGridLayout.entities.map(entity => [entity.id, entity])
  );
  const frame = createThreefoldFramePayload({
    world: createSmallWorldFrameWorld(
      state.scene.id,
      'WEFTWAYS',
      state.elapsedGameSeconds,
      { x: 7, y: 5 }
    ),
    dialogue: null,
    quickAction: 'grow',
    toast: flowMessage,
    presentation: {
      palette: PALETTE,
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Threadbound Crossing';
  frame.toast = flowMessage;
  /**
   * Create a pixel shape for a resolved source identity.
   * @param {string} id Source identity.
   * @param {string} fill Pixel fill.
   * @returns {ThreefoldSpriteShape[]} Projected source shape, or none when omitted.
   */
  const sourceShape = (id, fill) => {
    const entity = logicalEntities.get(id);
    if (!entity || entity.placement === 'overflow') return [];
    return [weftwaysEntityShape(entity, logicalGridLayout, fill)];
  };
  /**
   * Select the saved-choice fill for a flow control.
   * @param {string} id Flow-control identity.
   * @returns {string} Selected control fill.
   */
  const flowControlFill = id =>
    id === weftways.THREEFOLD_WEFTWAYS_PELL_BYPASS_ID
      ? flowChoice === 'pell-bypass'
        ? '#bfd77c'
        : '#e9d88d'
      : flowChoice === 'quay-spill'
        ? '#bfd77c'
        : '#e9d88d';
  const rootThreatened = growth.geometryIds.includes(
    weftways.THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID
  );
  const shapes = [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 8, y: 12 }, 'WEFTWAYS', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    createThreefoldRectShape([8, 32, 144, 72], '#315744'),
    ...state.scene.geometry.flatMap(({ id }) =>
      sourceShape(
        id,
        id === weftways.THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID
          ? rootFlooded
            ? '#25a9b8'
            : rootThreatened
              ? '#e16b5a'
              : '#bfd77c'
          : quayFlooded
            ? '#25a9b8'
            : '#d28b69'
      )
    ),
    ...state.scene.decorations.flatMap(({ id }) => sourceShape(id, '#526e4b')),
    ...state.scene.interactables.flatMap(({ id }) => {
      if (id === weftways.THREEFOLD_WEFTWAYS_PELL_ID)
        return pellDied
          ? []
          : weftwaysPellShapes(logicalEntities.get(id), logicalGridLayout);
      return sourceShape(
        id,
        id === weftways.THREEFOLD_WEFTWAYS_PELL_BYPASS_ID ||
          id === weftways.THREEFOLD_WEFTWAYS_QUAY_SPILL_ID
          ? flowControlFill(id)
          : id === weftways.THREEFOLD_WEFTWAYS_BRAZIER_ID &&
              relayRecordDestroyed
            ? '#8aa27b'
            : id === weftways.THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID &&
                relayRecordShared
              ? '#bfd77c'
              : id === weftways.THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID &&
                  relayRestitutionNegotiated
                ? '#bfd77c'
                : '#d28b69'
      );
    }),
    ...state.scene.creatures.flatMap(({ id }) => {
      if (id === weftways.THREEFOLD_WEFTWAYS_PELL_ID) return [];
      return weftwaysBeetleShapes(
        logicalEntities.get(id),
        logicalGridLayout,
        beetleFates.has(id)
      );
    }),
    ...sourceShape('mara', PALETTE[3]),
    ...(threadboundIndependentPublication
      ? weftwaysPublicationShapes(
          logicalEntities.get(weftways.THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID),
          logicalGridLayout
        )
      : []),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      flowChoice === 'pell-bypass'
        ? pellDied
          ? 'RELAY KEEPER · ROOTS SAFE · QUAY FLOODS'
          : 'ROOTS SAFE · QUAY FLOODS'
        : flowChoice === 'quay-spill'
          ? pellDied
            ? 'RELAY KEEPER · QUAY SAFE · ROOTS FLOOD'
            : 'QUAY SAFE · ROOTS FLOOD'
          : pellDied
            ? 'CARAVAN KEEPER · CHOOSE A FLOW'
            : 'PELL · CHOOSE A FLOW'
    ),
    captionShape(
      { x: 8, y: 136 },
      flowChoice === 'undecided'
        ? 'MOVE · E CHOOSE · A GROW · B SHRINK'
        : relayRecordShared
          ? 'CARAVAN KNOWS THE RECORD'
          : relayRecordConcealed
            ? 'MARA KEPT THE RECORD PRIVATE'
            : relayRecordDestroyed
              ? 'LEDGER DESTROYED · FACTS UNRESOLVED'
              : relayRestitutionNegotiated
                ? pellDied
                  ? 'KEEPER CARRIES OFFER · PELL ANSWER UNKNOWN'
                  : flowChoice === 'pell-bypass'
                    ? 'PELL ACCEPTS · TOKENS AND ROUTE REPAIR'
                    : 'PELL DEFERS · ROOT DAMAGE TO ASSESS'
                : relayRecordRead
                  ? 'E SHARE · REPAIR · KEEP · DESTROY'
                  : pellDied
                    ? 'REACH CARAVAN CIRCLE · E READ COPY'
                    : 'REACH PELL · E READ RELAY LOG'
    ),
    ...(growth.creatureIds.includes(weftways.THREEFOLD_WEFTWAYS_PELL_ID)
      ? [captionShape({ x: 8, y: 24 }, 'A KILLS PELL', true)]
      : []),
  ];
  frame.shapes = shapes;
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters: heightAtScale(state.player.scale),
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    elapsedGameSeconds: state.elapsedGameSeconds,
    flowChoice,
    floodedGeometryIds: [...floodedGeometryIds],
    relayRecordRead,
    relayRecordShared,
    relayRecordConcealed,
    relayRecordDestroyed,
    relayRestitutionNegotiated,
    pellDied,
    threadboundPellOutcome: pellDied
      ? {
          title: 'Pell’s death and the caravan relay keeper',
          text:
            'Mara’s growth killed Pell. The caravan relay keeper now preserves ' +
            'his record and can discuss the crossing and carry route-repair ' +
            'offers onward. Pell does not return, and his response to any offer ' +
            'after his death is unknown.',
        }
      : null,
    threadboundIndependentPublication,
    threadboundRelayRecord:
      relayRecordRead && !relayRecordDestroyed
        ? {
            title: 'Threadbound relay ledger',
            text:
              `${pellDied ? 'The relay keeper preserves Pell’s caravan ledger, which shows' : 'Pell’s caravan ledger shows'} downstream relay tokens stopped ` +
              'arriving after an emergency pressure-regulator bypass. It does ' +
              'not identify who sent the final message, what Iri knew, or who ' +
              'was responsible.',
          }
        : null,
    threadboundRelayDestruction: relayRecordDestroyed
      ? {
          title: 'What happened to the Threadbound ledger',
          text:
            'Mara destroyed Pell’s relay ledger at the brazier. The record ' +
            'can no longer be read. It did not identify the final sender, ' +
            'establish what Iri knew, or assign responsibility.',
        }
      : null,
    threadboundRelayDisclosure: relayRecordShared
      ? {
          title: 'What Mara shared with the caravan',
          text:
            'Mara told the Threadbound caravan that downstream relay tokens ' +
            'stopped arriving after an emergency pressure-regulator bypass. ' +
            'The record still cannot identify the final sender, establish ' +
            'what Iri knew, or assign responsibility.',
        }
      : null,
    threadboundRelayConcealment: relayRecordConcealed
      ? {
          title: 'What Mara kept private',
          text:
            'Mara chose not to share Pell’s relay ledger with the caravan and ' +
            'kept the record for herself. It still cannot identify the final ' +
            'sender, establish what Iri knew, or assign responsibility.',
        }
      : null,
    threadboundRelayRestitution: relayRestitutionNegotiated
      ? {
          title: 'Threadbound relay restitution',
          text: pellDied
            ? 'Mara offered to carry replacement relay tokens to downstream settlements and help restore their route. The caravan relay keeper records the offer and will carry it onward; Pell’s answer is unknown. The offer does not identify the final sender, establish what Iri knew, or assign responsibility.'
            : flowChoice === 'pell-bypass'
              ? 'Mara offered to carry replacement relay tokens to downstream ' +
                'settlements and help restore their route. Pell accepts the ' +
                'plan. The agreement does not identify the final sender, ' +
                'establish what Iri knew, or assign responsibility.'
              : 'Mara offered to carry replacement relay tokens to downstream ' +
                'settlements and help restore their route. Pell defers final ' +
                'terms until the root-channel damage is assessed. The offer ' +
                'does not identify the final sender, establish what Iri knew, ' +
                'or assign responsibility.',
        }
      : null,
    packBeetleIds: state.scene.creatures
      .filter(({ id }) => id.startsWith('weftways-pack-beetle-'))
      .map(({ id }) => id),
    growthPreviewGeometryIds: growth.geometryIds,
    growthPreviewCreatureIds: growth.creatureIds,
    witnessLedger: [],
    logicalGridLayout,
  });
}

/**
 * Render Iru's nursery and the scale-aware spider decision on Mosslight's grid.
 * @param {Extract<ReturnType<typeof import('./simulation.js').createThreefoldSimulation>, {scene: {id: 'grainlands'}}>} state Current Grainlands simulation.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} pressureNetwork Shared campaign water.
 * @returns {Record<string, any>} Snapped handheld frame and route state.
 */
function renderThreefoldGrainlandsFrame(state, pressureNetwork) {
  const nurseryDepth = getThreefoldNurseryWaterDepthMeters(pressureNetwork);
  const growth = previewThreefoldGrowthEffects(state);
  const logicalGridLayout = createGrainlandsGridLayout(state);
  const logicalEntities = new Map(
    logicalGridLayout.entities.map(entity => [entity.id, entity])
  );
  const spiderFate = state.grainlands.spiderFate;
  const bridgeOutcome = state.grainlands.bridgeOutcome;
  const bridgeThreatened = growth.geometryIds.includes(
    grainlands.THREEFOLD_GRAINLANDS_BRIDGE_ID
  );
  const bridgeColor =
    bridgeOutcome === 'broken'
      ? '#526e4b'
      : bridgeThreatened
        ? '#e16b5a'
        : '#bfd77c';
  const status = describeGrainlandsIru(state);
  const nurseryEntity =
    /** @type {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} */ (
      logicalEntities.get(grainlands.THREEFOLD_GRAINLANDS_NURSERY_ID)
    );
  const spiderEntity = logicalEntities.get(
    grainlands.THREEFOLD_GRAINLANDS_SPIDER_ID
  );
  const maraEntity = logicalEntities.get('mara');
  const nurseryRect = grainlandsEntityRect(nurseryEntity, logicalGridLayout);
  const waterHeight = nurseryRect
    ? Math.min(
        nurseryRect.height,
        snapCanvasDimension((nurseryDepth / 0.04) * nurseryRect.height)
      )
    : 0;
  const frame = createThreefoldFramePayload({
    world: createSmallWorldFrameWorld(
      state.scene.id,
      'GRAINLANDS',
      state.elapsedGameSeconds,
      { x: 4, y: 5 }
    ),
    dialogue: null,
    quickAction: 'grow',
    toast: status,
    presentation: {
      palette: PALETTE,
      status: formatScaleStatus(state.player),
    },
    spriteRenderer: () => [],
  });
  frame.quest = 'The Nursery Crossing';
  frame.toast = status;
  frame.shapes = [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 8, y: 12 }, 'GRAINLANDS', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    createThreefoldRectShape([8, 28, 144, 72], '#315744'),
    ...state.scene.geometry.flatMap(({ id }) => {
      const entity =
        /** @type {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} */ (
          logicalEntities.get(id)
        );
      const fill =
        id === grainlands.THREEFOLD_GRAINLANDS_BRIDGE_ID
          ? bridgeColor
          : id === grainlands.THREEFOLD_GRAINLANDS_NURSERY_ID &&
              pressureNetwork.nurseryDamaged
            ? '#b46b55'
            : '#526e4b';
      const shape = grainlandsEntityShape(entity, logicalGridLayout, fill);
      if (!shape) return [];
      if (
        id !== grainlands.THREEFOLD_GRAINLANDS_BRIDGE_ID ||
        bridgeOutcome !== 'broken'
      )
        return [shape];
      const rect =
        /** @type {{x:number,y:number,width:number,height:number}} */ (
          grainlandsEntityRect(entity, logicalGridLayout)
        );
      return [
        shape,
        createThreefoldRectShape(
          [
            rect.x +
              Math.floor((rect.width - GRID_PIXELS) / (2 * GRID_PIXELS)) *
                GRID_PIXELS,
            rect.y +
              Math.floor((rect.height - GRID_PIXELS) / (2 * GRID_PIXELS)) *
                GRID_PIXELS,
            GRID_PIXELS,
            GRID_PIXELS,
          ],
          '#182f36'
        ),
      ];
    }),
    ...state.scene.decorations.flatMap(({ id }) => {
      const entity =
        /** @type {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} */ (
          logicalEntities.get(id)
        );
      const shape = grainlandsEntityShape(entity, logicalGridLayout, '#526e4b');
      return shape ? [shape] : [];
    }),
    ...(waterHeight > 0 && nurseryRect
      ? [
          {
            ...createThreefoldRectShape(
              [
                nurseryRect.x,
                nurseryRect.y + nurseryRect.height - waterHeight,
                nurseryRect.width,
                waterHeight,
              ],
              '#1b8a83'
            ),
            logicalContainerBounds: nurseryEntity.cellBounds,
            surfaceMeters: nurseryDepth,
          },
        ]
      : []),
    ...state.scene.interactables.flatMap(({ id }) => {
      const entity =
        /** @type {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} */ (
          logicalEntities.get(id)
        );
      const fill =
        id === grainlands.THREEFOLD_GRAINLANDS_HATCH_ID
          ? pressureNetwork.nurseryDamaged
            ? '#b46b55'
            : pressureNetwork.hatchClosed
              ? '#e9d88d'
              : '#526e4b'
          : id === grainlands.THREEFOLD_GRAINLANDS_IRU_ID
            ? '#d28b69'
            : '#bfd77c';
      const shape = grainlandsActorShape(entity, logicalGridLayout, fill);
      return shape ? [shape] : [];
    }),
    ...(spiderFate === 'baited-away' || !spiderEntity
      ? []
      : grainlandsSpiderShapes(
          spiderEntity,
          logicalGridLayout,
          spiderFate === 'overpowered'
        )),
    ...[
      grainlandsActorShape(
        /** @type {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} */ (
          maraEntity
        ),
        logicalGridLayout,
        PALETTE[3]
      ),
    ].filter(Boolean),
    createThreefoldRectShape([4, 116, 152, 24], '#182f36'),
    captionShape(
      { x: 8, y: 126 },
      spiderFate === 'baited-away'
        ? 'SPIDER BAITED · BRIDGE SAFE'
        : spiderFate === 'overpowered'
          ? 'SPIDER BEATEN · BRIDGE BROKE'
          : 'IRU · NURSERY · SPIDER'
    ),
    captionShape({ x: 8, y: 136 }, 'E IRU/HATCH · A GROW'),
  ];
  return finishSmallWorldFrame(frame, {
    scale: state.player.scale,
    heightMeters: heightAtScale(state.player.scale),
    anchor: state.player.anchor,
    maximumAnchor: state.player.maximumAnchor,
    elapsedGameSeconds: state.elapsedGameSeconds,
    spiderFate,
    bridgeOutcome,
    nurseryId: grainlands.THREEFOLD_GRAINLANDS_NURSERY_ID,
    nurseryWaterDepthMeters: nurseryDepth,
    nurseryFlooded: pressureNetwork.nurseryFlooded,
    shelterHatchClosed:
      pressureNetwork.hatchClosed && !pressureNetwork.nurseryDamaged,
    growthPreviewGeometryIds: growth.geometryIds,
    growthPreviewCreatureIds: growth.creatureIds,
    witnessLedger: [],
    logicalGridLayout,
  });
}

/**
 * Draw a scale-dependent spider sprite inside its projected physical bounds.
 * @param {ReturnType<typeof createGrainlandsGridLayout>['entities'][number]} entity Projected spider identity.
 * @param {ReturnType<typeof createGrainlandsGridLayout>} layout Finite camera view.
 * @param {boolean} overpowered Whether growth defeated the spider.
 * @returns {ThreefoldSpriteShape[]} Spider body and legs.
 */
function grainlandsSpiderShapes(entity, layout, overpowered) {
  const rect = grainlandsEntityRect(entity, layout);
  if (!rect) return [];
  const bodyColor = overpowered ? '#526e4b' : '#d28b69';
  const bodyWidth = Math.min(16, rect.width);
  const bodyX =
    rect.x +
    Math.floor((rect.width - bodyWidth) / (2 * GRID_PIXELS)) * GRID_PIXELS;
  const bodyY =
    rect.y +
    Math.floor((rect.height - GRID_PIXELS) / (2 * GRID_PIXELS)) * GRID_PIXELS;
  const shape = (
    /** @type {[number, number, number, number]} */ bounds,
    /** @type {string} */ fill
  ) => ({
    ...createThreefoldRectShape(bounds, fill),
    geometryId: entity.id,
    logicalCellBounds: entity.cellBounds,
  });
  return [
    shape([bodyX, bodyY, bodyWidth, GRID_PIXELS], bodyColor),
    ...(rect.width >= 24 && rect.height >= 16
      ? [
          shape(
            [rect.x, bodyY + GRID_PIXELS, GRID_PIXELS, GRID_PIXELS],
            '#182f36'
          ),
          shape(
            [
              rect.x + rect.width - GRID_PIXELS,
              bodyY + GRID_PIXELS,
              GRID_PIXELS,
              GRID_PIXELS,
            ],
            '#182f36'
          ),
        ]
      : []),
  ];
}

/**
 * Draw a static Weftways identity inside its projected screen cells.
 * @param {ReturnType<typeof createWeftwaysGridLayout>['entities'][number]} entity Projected identity.
 * @param {ReturnType<typeof createWeftwaysGridLayout>} layout Finite authored view.
 * @param {string} fill Identity state color.
 * @returns {ThreefoldSpriteShape} Cell-derived identity sprite.
 */
function weftwaysEntityShape(entity, layout, fill) {
  const rect = logicalGridEntityRect(entity, layout);
  return {
    ...createThreefoldRectShape(
      [rect.x, rect.y, rect.width, rect.height],
      fill
    ),
    geometryId: entity.id,
    logicalGridKinds: entity.logicalGridKinds,
    logicalCellBounds: entity.cellBounds,
  };
}

/**
 * Draw Pell within his projected identity cell.
 * @param {ReturnType<typeof createWeftwaysGridLayout>['entities'][number] | undefined} entity Projected Pell identity.
 * @param {ReturnType<typeof createWeftwaysGridLayout>} layout Finite authored view.
 * @returns {ThreefoldSpriteShape[]} Pell's cell-contained sprite.
 */
function weftwaysPellShapes(entity, layout) {
  if (!entity || entity.placement === 'overflow') return [];
  const rect = logicalGridEntityRect(entity, layout);
  const bodyWidth = Math.min(8, rect.width);
  const bodyX = rect.x + Math.floor((rect.width - bodyWidth) / 16) * 8;
  const bodyY = rect.y + Math.floor((rect.height - 8) / 16) * 8;
  return [
    {
      ...createThreefoldRectShape([bodyX, bodyY, bodyWidth, 8], '#d28b69'),
      geometryId: entity.id,
      logicalGridKinds: entity.logicalGridKinds,
      logicalCellBounds: entity.cellBounds,
    },
  ];
}

/**
 * Render the published relay notice within the projected root crossing.
 * @param {ReturnType<typeof createWeftwaysGridLayout>['entities'][number] | undefined} entity Projected crossing identity.
 * @param {ReturnType<typeof createWeftwaysGridLayout>} layout Finite authored view.
 * @returns {ThreefoldSpriteShape[]} Notice marker contained by the crossing cells.
 */
function weftwaysPublicationShapes(entity, layout) {
  if (!entity || entity.placement === 'overflow') return [];
  const rect = logicalGridEntityRect(entity, layout);
  const width = Math.min(16, rect.width);
  const x = rect.x + Math.floor((rect.width - width) / 16) * 8;
  const y = rect.y + Math.max(0, rect.height - 8);
  return [
    {
      ...createThreefoldRectShape([x, y, width, 8], '#d28b69'),
      geometryId: entity.id,
      logicalCellBounds: entity.cellBounds,
    },
  ];
}

/**
 * Draw a pack beetle or its remains inside projected caravan cells.
 * @param {ReturnType<typeof createWeftwaysGridLayout>['entities'][number] | undefined} entity Projected beetle identity.
 * @param {ReturnType<typeof createWeftwaysGridLayout>} layout Finite authored view.
 * @param {boolean} lost Whether growth permanently removed the beetle.
 * @returns {ThreefoldSpriteShape[]} Beetle silhouette.
 */
function weftwaysBeetleShapes(entity, layout, lost) {
  if (!entity || entity.placement === 'overflow') return [];
  const rect = logicalGridEntityRect(entity, layout);
  const shell = lost ? '#526e4b' : '#bfd77c';
  const bodyWidth = Math.min(16, rect.width);
  const bodyX = rect.x + Math.floor((rect.width - bodyWidth) / 16) * 8;
  const bodyY = rect.y + Math.floor((rect.height - 8) / 16) * 8;
  /**
   * Tag a beetle sprite part with its projected cell identity.
   * @param {[number, number, number, number]} bounds Pixel rectangle.
   * @param {string} fill Sprite fill.
   * @returns {ThreefoldSpriteShape} Cell-tagged beetle part.
   */
  const shape = (bounds, fill) => ({
    ...createThreefoldRectShape(bounds, fill),
    geometryId: entity.id,
    logicalGridKinds: entity.logicalGridKinds,
    logicalCellBounds: entity.cellBounds,
  });
  return [
    shape([bodyX, bodyY, bodyWidth, 8], shell),
    ...(rect.width >= 24 && rect.height >= 16
      ? [
          shape([bodyX + 8, rect.y, 8, 8], shell),
          shape([bodyX, rect.y + rect.height - 8, 8, 8], '#182f36'),
        ]
      : []),
  ];
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
 * Require one authored logical identity from the Archive's resolved layout.
 * @param {Map<string, ReturnType<typeof createSluiceGridLayout>['entities'][number]>} entities Projected scene records.
 * @param {string} id Stable authored identity.
 * @returns {ReturnType<typeof createSluiceGridLayout>['entities'][number]} Resolved identity.
 */
function requireSluiceEntity(entities, id) {
  const entity = entities.get(id);
  if (!entity)
    throw new RangeError(`Tidal Archive render entity is missing: ${id}`);
  return entity;
}

/**
 * Draw the authored chamber cutaway and current physical water levels.
 * @param {Record<string, any>} state Current sluice simulation.
 * @param {ReturnType<typeof getThreefoldSluicePuzzleStatus>} water Current puzzle readout.
 * @param {Map<string, ReturnType<typeof createSluiceGridLayout>['entities'][number]>} entities Projected Archive identities.
 * @param {ReturnType<typeof createSluiceGridLayout>} layout Resolved finite scene layout.
 * @returns {ThreefoldSpriteShape[]} Shapes for Mosslight's pixel canvas.
 */
function sluiceShapes(state, water, entities, layout) {
  const upperEntity = requireSluiceEntity(entities, 'sluice-upper-vessel');
  const lowerEntity = requireSluiceEntity(entities, 'sluice-lower-vessel');
  const valveEntity = requireSluiceEntity(entities, 'sluice-service-valve');
  const traceEntity = requireSluiceEntity(
    entities,
    'sluice-archive-coil-trace'
  );
  const barrierEntity = requireSluiceEntity(
    entities,
    'sluice-crossing-barrier'
  );
  const pipeEntity = requireSluiceEntity(entities, 'sluice-transfer-pipe');
  const maraEntity = requireSluiceEntity(entities, 'mara');
  const upper = sluiceEntityScreenRect(upperEntity, layout);
  const lower = sluiceEntityScreenRect(lowerEntity, layout);
  const upperFloorY = upper.y + upper.height - GRID_PIXELS;
  const lowerFloorY = lower.y + lower.height - GRID_PIXELS;
  const upperWaterHeight = sluiceWaterHeight(
    upper.height - GRID_PIXELS,
    water.upperWaterSurfaceElevationMeters,
    0.5
  );
  const lowerWaterHeight = sluiceWaterHeight(
    lower.height - GRID_PIXELS,
    water.lowerWaterSurfaceElevationMeters,
    0
  );
  const valve = createSluiceGridEntityShape(
    valveEntity,
    layout,
    water.portOpen ? '#25a9b8' : '#e16b5a'
  );
  const trace = createSluiceGridEntityShape(
    traceEntity,
    layout,
    state.archiveTraceHeard ? '#e9d88d' : '#789378'
  );
  const barrier = createSluiceGridEntityShape(
    barrierEntity,
    layout,
    water.crossingAvailable ? '#25a9b8' : '#e16b5a'
  );
  const pipe = createSluiceGridEntityShape(pipeEntity, layout, PALETTE[1]);
  const mara = createSluiceGridEntityShape(maraEntity, layout, '#e9d88d');
  return [
    createThreefoldRectShape([0, 0, 160, 144], PALETTE[0]),
    captionShape({ x: 7, y: 12 }, 'THE TIDAL ARCHIVE', true),
    createThreefoldRectShape([4, 20, 152, 92], '#102823'),
    createThreefoldRectShape([8, 28, 144, 72], '#315744'),
    sluiceFluidRect(
      upperEntity,
      [
        upper.x + GRID_PIXELS,
        upperFloorY - upperWaterHeight,
        upper.width - 2 * GRID_PIXELS,
        upperWaterHeight,
      ],
      '#25a9b8',
      water.upperWaterSurfaceElevationMeters
    ),
    sluiceFluidRect(
      lowerEntity,
      [
        lower.x + GRID_PIXELS,
        lowerFloorY - lowerWaterHeight,
        lower.width - 2 * GRID_PIXELS,
        lowerWaterHeight,
      ],
      '#25a9b8',
      water.lowerWaterSurfaceElevationMeters
    ),
    ...sluiceVesselShapes(upperEntity, upper),
    ...sluiceVesselShapes(lowerEntity, lower),
    pipe,
    valve,
    barrier,
    trace,
    captionShape(
      { x: upper.x + GRID_PIXELS, y: upper.y - GRID_PIXELS },
      'UPPER'
    ),
    captionShape(
      { x: lower.x + GRID_PIXELS, y: lower.y - GRID_PIXELS },
      'LOWER'
    ),
    captionShape({ x: trace.x - 8, y: trace.y - GRID_PIXELS }, 'LOG'),
    mara,
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
 * Summarize the branch-specific, saved consequences after the Broken Gate closes.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current simulation state.
 * @param {{gateState: 'held'|'forced-open'|'repaired'|null, drainageState: 'dry'|'at-risk'|'flooded'|'receded'}} gateOutcome Derived gate outcome.
 * @returns {{title: string, paragraphs: string[]}|null} Text-only epilogue for a closed episode.
 */
function getThreefoldEpisodeEpilogue(state, gateOutcome) {
  if (gateOutcome.gateState === null) return null;
  if (
    state.episode.closedBy !== 'reported' &&
    state.episode.closedBy !== 'departed'
  )
    return null;
  const signalStationDestroyed = state.player.destroyedGeometryIds.includes(
    THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
  );
  const closure =
    state.episode.closedBy === 'reported'
      ? 'Mara files the storm report from the intact signal station.'
      : signalStationDestroyed
        ? 'Mara leaves by the upland road; the signal station is rubble and no report is sent.'
        : 'The signal station stands, but Mara leaves by the upland road without filing a report.';
  const channel =
    gateOutcome.drainageState === 'dry'
      ? 'The lower channel stays dry.'
      : gateOutcome.drainageState === 'receded'
        ? 'Floodwater recedes from the lower channel during aftermath.'
        : 'Floodwater remains in the lower channel after the storm.';
  const latchfolkResponse =
    state.episode.closedBy === 'reported' &&
    state.episode.latchfolk === 'safe' &&
    hasLatchfolkIriLead(state)
      ? [
          'The report carries Iri’s account to the surviving Latchfolk watchkeeper. They ask for the downstream relay stations to be traced before responsibility is assigned; the final sender and missed warnings remain unknown.',
        ]
      : [];
  return {
    title: state.episode.closedBy === 'reported' ? 'Report filed' : 'Departure',
    paragraphs: [
      closure,
      ...latchfolkResponse,
      `Passenger outcome: ${getPassengerOutcomeLabel(state.episode).toLowerCase()}.`,
      `Latchfolk outcome: ${state.episode.latchfolk}.`,
      `Relief gate: ${gateOutcome.gateState}.`,
      channel,
    ],
  };
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
    : state.player.scale > THREEFOLD_SIGNAL_STATION_DETAIL_SCALE
      ? 'SHRINK TO -2 TO REPORT OR DEPART UPLAND'
      : 'STORM PASSED · FILE A REPORT OR DEPART UPLAND';
  const aftermathAction = canHelpThreefoldDisplacedLatchfolk(state)
    ? ' · E HELP LATCHFOLK'
    : canHearThreefoldLatchfolkLead(state)
      ? ' · E SPEAK WITH THE WATCHKEEPER'
      : canSearchThreefoldFerryWreck(state)
        ? ' · E SEARCH FERRY WRECK'
        : '';
  const aftermathRecord = hasLatchfolkDisplacementAid(state)
    ? ' · LATCHFOLK AID IN JOURNAL'
    : hasLatchfolkIriLead(state)
      ? ' · WATCHKEEPER ACCOUNT IN JOURNAL'
      : hasFerryWreckSearch(state)
        ? ' · FERRY SEARCH IN JOURNAL'
        : '';
  return `${message} · ${prompt}${aftermathAction}${aftermathRecord}`;
}

/**
 * Determine whether the optional displaced-resident aid was recorded.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the aid observation is saved.
 */
function hasLatchfolkDisplacementAid(state) {
  return (state.episode.witnessLedger || []).some(
    entry => entry.action === 'latchfolk-displacement-aid'
  );
}

/**
 * Describe the optional aid and current lower-home water condition.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {string} Factual record of the help and remaining damage.
 */
function getLatchfolkDisplacementAidText(state) {
  const homes = getThreefoldGateOutcome(state).drainageState;
  const homeCondition =
    homes === 'receded'
      ? 'Water has receded, but their homes remain damaged.'
      : 'Floodwater remains in their homes.';
  return `Mara and the watchkeeper help the displaced Latchfolk arrange temporary shelter. ${homeCondition}`;
}

/**
 * Determine whether the ferry wreck search was recorded in the witness ledger.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the search observation is saved.
 */
function hasFerryWreckSearch(state) {
  return (state.episode.witnessLedger || []).some(
    entry => entry.action === 'ferry-wreck-search'
  );
}

/**
 * Describe the passenger outcome confirmed by the post-surge search.
 * @param {ReturnType<typeof import('./episode.js').createThreefoldEpisodeState>} episode Saved episode outcome.
 * @returns {string} Factual search account without changing the passenger outcome.
 */
function getFerryWreckSearchText(episode) {
  if (episode.passengers === 'evacuated')
    return 'Both passenger groups reached shore before the ferry was lost. The wreck holds no remaining passengers.';
  if (episode.passengers === 'partial')
    return 'One passenger group reached shore; the other was aboard when the ferry was lost. No further survivors are found in the wreck.';
  return 'Both passenger groups were still aboard when the ferry was lost. No survivors are found in the wreck.';
}

/**
 * Determine whether the optional witness-supplied Iri lead was recorded.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @returns {boolean} Whether the saved witness ledger contains the lead.
 */
function hasLatchfolkIriLead(state) {
  return (state.episode.witnessLedger || []).some(
    entry => entry.action === 'latchfolk-witness-lead'
  );
}

/**
 * Convert canonical scene coordinates to the tile world used by Mosslight's camera.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} state Current simulation.
 * @param {number} heightMeters Mara's current physical height.
 * @param {Set<string>} growthPreviewIds Geometry, occupants, or creatures affected by the next growth step.
 * @returns {Record<string, any>} Mosslight-compatible world snapshot and grid projection.
 */
function createRenderWorld(state, heightMeters, growthPreviewIds) {
  const { scene, player, crisis } = state;
  /** @type {Map<string, {parentId?: string, expandAtScale?: number}>} */
  const stationHierarchy = new Map(
    THREEFOLD_SIGNAL_STATION_HIERARCHY.map(({ id, hierarchy }) => [
      id,
      hierarchy,
    ])
  );
  const drainageState = isHighWorldSimulationState(state)
    ? 'dry'
    : getThreefoldGateOutcome(state).drainageState;
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
  const interactableObjects = scene.interactables
    .filter(
      ({ id }) =>
        id !== 'signal-station-console' ||
        !player.destroyedGeometryIds.includes(
          THREEFOLD_SIGNAL_STATION_GEOMETRY_ID
        )
    )
    .map(object => {
      const hierarchy = stationHierarchy.get(object.id);
      return {
        ...object,
        ...(hierarchy === undefined ? {} : { hierarchy }),
        logicalGridKind: /** @type {ThreefoldGridRenderKind} */ (
          'interactable'
        ),
        growthPreview: growthPreviewIds.has(object.id),
      };
    });
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
  const gridProjection = projectRenderEntitiesToGrid(
    player.scale,
    [
      ...geometry.map(object => ({
        ...object,
        ...(stationHierarchy.has(object.id)
          ? { hierarchy: stationHierarchy.get(object.id) }
          : {}),
        logicalGridKind: /** @type {ThreefoldGridRenderKind} */ ('structure'),
        growthPreview: growthPreviewIds.has(object.id),
      })),
      ...interactableObjects,
      ...creatureObjects.map(object => ({
        ...object,
        logicalGridKind: /** @type {ThreefoldGridRenderKind} */ ('creature'),
      })),
    ],
    {
      x: -VIEW_ORIGIN.x,
      y: -VIEW_ORIGIN.y,
      width: mapWidth,
      height: mapHeight,
    }
  );
  return {
    mapId: scene.id,
    location: scene.id,
    map: {
      name: isHighWorldSimulationState(state)
        ? state.scene.displayName.replace(/^The /, '').toUpperCase()
        : 'BROKEN GATE',
      width: mapWidth,
      height: mapHeight,
      blocked: [],
      exits: [],
      palette: 'shore',
      objects: [
        ...gridProjection.entities.filter(
          ({ logicalGridKind }) => logicalGridKind === 'interactable'
        ),
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
        ...gridProjection.entities.filter(
          ({ logicalGridKind }) => logicalGridKind === 'creature'
        ),
        ...gridProjection.entities.filter(
          ({ logicalGridKind }) => logicalGridKind === 'structure'
        ),
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
    time: isHighWorldSimulationState(state)
      ? state.elapsedGameSeconds / 3600
      : crisis.elapsedMinutes / 60,
    day: 1,
    flags: {},
    npcs: [],
    logicalGridLayout: gridProjection.layout,
  };
}

/**
 * Project static authored scene objects onto scale-local integer cells for rendering.
 * @param {number} scale Current THREEFOLD scale.
 * @param {ThreefoldGridRenderEntity[]} entities Static structures, interactables and creatures.
 * @param {{x: number, y: number, width: number, height: number}} viewport Integer-cell world-map capacity.
 * @returns {{entities: ThreefoldGridRenderEntity[], layout: ReturnType<typeof resolveSceneLayout>}} Grid-projected render entities and diagnostics.
 */
function projectRenderEntitiesToGrid(scale, entities, viewport) {
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  const layout = packSceneLayout(
    entities.map(entity => ({
      id: entity.id,
      bounds: entity.bounds,
      parentId: entity.parentId,
      overlapGroupId: entity.overlapGroupId,
      hierarchy: entity.hierarchy,
    })),
    scale,
    viewport
  );
  const layoutById = new Map(
    layout.entities.map(entity => [entity.id, entity])
  );
  const visibleIds = new Set(layout.hierarchy.visibleEntityIds);
  const cellSizeMeters = heightAtScale(scale);
  return {
    layout: {
      ...layout,
      entities: layout.entities.map(entity => {
        const source = /** @type {ThreefoldGridRenderEntity} */ (
          byId.get(entity.id)
        );
        return { ...entity, logicalGridKind: source.logicalGridKind };
      }),
    },
    entities: entities
      .filter(object => visibleIds.has(object.id))
      .map(object => {
        const resolved =
          /** @type {NonNullable<ReturnType<typeof layoutById.get>>} */ (
            layoutById.get(object.id)
          );
        const logicalCellBounds = resolved.cellBounds;
        return {
          ...object,
          logicalCellBounds,
          bounds: {
            min: {
              ...object.bounds.min,
              x: logicalCellBounds.x * cellSizeMeters,
              y: logicalCellBounds.y * cellSizeMeters,
            },
            max: {
              ...object.bounds.max,
              x:
                (logicalCellBounds.x + logicalCellBounds.width) *
                cellSizeMeters,
              y:
                (logicalCellBounds.y + logicalCellBounds.height) *
                cellSizeMeters,
            },
          },
        };
      }),
  };
}

/**
 * Paint one physical geometry footprint at the current world scale.
 * @param {{id: string, growthPreview?: boolean, logicalGridKind?: ThreefoldGridRenderKind, logicalCellBounds?: {x: number, y: number, width: number, height: number}, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}} actor Projected world object.
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
      ...(actor.logicalGridKind === undefined
        ? {}
        : { logicalGridKind: actor.logicalGridKind }),
      ...(actor.logicalCellBounds === undefined
        ? {}
        : { logicalCellBounds: actor.logicalCellBounds }),
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
 * @param {{bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, id: string, growthPreview?: boolean, logicalGridKind: ThreefoldGridRenderKind, logicalCellBounds: {x: number, y: number, width: number, height: number}}} actor Rat footprint from the static scene layout.
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
    logicalGridKind: actor.logicalGridKind,
    logicalCellBounds: actor.logicalCellBounds,
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
 * Identify the authored structures affected by the next growth action.
 * @param {string[]} geometryIds Geometry affected by the next growth action.
 * @param {Array<{id: string, displayName?: string}>} geometry Authored scene structures.
 * @returns {string} Compact handheld message.
 */
function getGrowthPreviewLabel(geometryIds, geometry) {
  const displayNames = geometryIds.map(id => {
    const object = geometry.find(item => item.id === id);
    return object?.displayName;
  });
  const labels = displayNames.every(name => typeof name === 'string')
    ? displayNames
    : geometryIds.map(id =>
        id
          .replace(/^gatehouse-/, '')
          .replaceAll('-', ' ')
          .toUpperCase()
      );
  const shown =
    labels.length > 1
      ? displayNames.every(name => typeof name === 'string')
        ? labels.join(' + ')
        : `${labels[0]} +${labels.length - 1}`
      : labels[0];
  return `A BREAKS ${shown}`;
}

/**
 * Describe creature outcomes, preserving the established rat label.
 * @param {string[]} creatureIds Creatures affected by the next growth action.
 * @param {Array<{id: string, displayName?: string}>} creatures Authored scene residents.
 * @returns {string} Compact handheld message.
 */
function getCreatureGrowthPreviewLabel(creatureIds, creatures) {
  if (creatureIds.length === 1 && creatureIds[0] === 'gatehouse-rat')
    return 'A KILLS RAT';
  const names = creatureIds.map(id => {
    const creature = creatures.find(item => item.id === id);
    return /** @type {{displayName?: string}|undefined} */ (creature)
      ?.displayName;
  });
  if (names.every(name => typeof name === 'string'))
    return `A KILLS ${names.join(' + ')}`;
  const creatureCount = creatureIds.length;
  const countLabel =
    creatureCount === 1 ? '1 CREATURE' : `${creatureCount} CREATURES`;
  return `A KILLS ${countLabel}`;
}

/**
 * Describe the high-world scene's preview or persisted consequences.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current district state.
 * @returns {string} Compact city-scale status without Broken Gate language.
 */
function getHighWorldToast(state) {
  const displayName = /** @type {{displayName: string}} */ (state.scene)
    .displayName;
  const region = displayName.replace(/^The /, '').toUpperCase();
  const residents = new Map(
    state.scene.creatures.map(creature => [
      creature.id,
      /** @type {{displayName?: string}} */ (creature).displayName,
    ])
  );
  const lostResidents = (state.encounter.growthDeaths ?? [])
    .map(({ creatureId }) => residents.get(creatureId))
    .filter(Boolean);
  const damagedStructures = state.scene.geometry
    .filter(object => state.player.destroyedGeometryIds.includes(object.id))
    .map(object => /** @type {{displayName?: string}} */ (object).displayName);
  if (state.scene.id === THREEFOLD_CROWNBACK_REACH_SCENE_ID) {
    const crownbackState = /** @type {Record<string, any>} */ (state)
      .crownbackReach;
    if (crownbackState?.tharnMet !== true)
      return isThreefoldCrownbackTharnInReach(/** @type {any} */ (state))
        ? 'ELDER THARN IN REACH · E MEET'
        : 'FIND ELDER THARN · E TO MEET';
  }
  if (state.scene.id === THREEFOLD_WAKEFORM_SHOALS_SCENE_ID) {
    const shoalsState = /** @type {Record<string, any>} */ (state)
      .wakeformShoals;
    const wakeformLost = lostResidents.includes('WAKEFORM');
    if (shoalsState?.outerDefenseBreached === true)
      return wakeformLost
        ? 'OUTER WALL BROKEN · WAKEFORM LOST · FLOW DIVERTED'
        : 'OUTER WALL BROKEN · FLOW DIVERTED SEAWARD';
    if (shoalsState?.wakeformDiverted === true)
      return 'WAKEFORM GUIDED NORTH · CURRENT DIVERTED';
    return isThreefoldWakeformInReach(/** @type {any} */ (state))
      ? 'WAKEFORM IN REACH · E DIVERT'
      : 'FIND WAKEFORM · E TO DIVERT';
  }
  if (lostResidents.length > 0 || damagedStructures.length > 0)
    return `${region} GROWN · ${damagedStructures.join(' + ')} · ${lostResidents.join(' + ')} LOST`;
  const growth = previewThreefoldGrowthEffects(state);
  if (growth.geometryIds.length > 0 || growth.creatureIds.length > 0)
    return `A GROW · ${region} AND ITS RESIDENTS ARE AT RISK`;
  return `${region} · A GROW · B SHRINK`;
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

/**
 * Show scale, physical height, and the remaining resource on one handheld row.
 * @param {ReturnType<typeof import('./spatial.js').createScaleState>} player Current scale and Anchor state.
 * @returns {string} Compact player measurement for the shared HUD.
 */
function formatScaleStatus(player) {
  const heightMeters = heightAtScale(player.scale);
  const heightLabel =
    heightMeters < 1
      ? `${(heightMeters * 100).toFixed(2)} cm`
      : `${heightMeters.toFixed(2)} m`;
  return `SCALE ${formatScale(player.scale)} · ${heightLabel} · A ${player.anchor}/${player.maximumAnchor}`;
}

/**
 * Keep old nursery outcomes factual after Iru dies or evacuates.
 * @param {Parameters<typeof renderThreefoldGrainlandsFrame>[0]} state Canonical nursery scene.
 * @returns {string} Living response or an explicit absent-speaker account.
 */
function describeGrainlandsIru(state) {
  if (
    !isThreefoldResidentAvailable(state, grainlands.THREEFOLD_GRAINLANDS_IRU_ID)
  )
    return 'Iru is no longer here. The nursery and spider outcomes remain.';
  if (state.grainlands.spiderFate === 'baited-away')
    return 'Iru welcomes Mara; spider leaves, bridge holds.';
  if (state.grainlands.spiderFate === 'overpowered')
    return 'Iru fears Mara; growth breaks nursery bridge.';
  return 'Iru weighs the spider against the nursery crossing.';
}
