import { describeKnownThreefoldIriFate } from './iri-arrival-content.js';
import * as mosslightPresenter from '../mosslight-valley/pagePresenter.js';
import { createThreefoldRuntime } from './runtime.js';
import { createBrokenGateScene } from './gatehouse.js';
import { createThreefoldSluiceScene } from './sluice-scene.js';
import { createThreefoldSiltMarginScene } from './silt-margin.js';
import { createThreefoldBelltopsScene } from './belltops.js';
import { createThreefoldCrownbackReachScene } from './crownback-reach.js';
import { createThreefoldWakeformShoalsScene } from './wakeform-shoals.js';
import { createThreefoldHearthgapsScene } from './hearthgaps.js';
import { createThreefoldWeftwaysScene } from './weftways.js';
import { createThreefoldGrainlandsScene } from './grainlands.js';
import * as lanternWard from './lantern-ward.js';
import { drawGameFrame } from '../mosslight-valley/renderer.js';

const renderedTestimonyByList = new WeakMap();
const renderedEpisodeEpilogueByList = new WeakMap();
const SLUICE_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'The Tidal Archive'],
    ['#chapter-tag', 'SMALL WORLD · THE TIDAL ARCHIVE'],
    ['#chapter-eyebrow', 'A LOCKED SLUICE'],
    ['#chapter-heading', 'Raise the lower basin to reach the far bank.'],
    [
      '#chapter-description',
      'At the smallest scale, open the service valve and let the water move. ' +
        'Each action advances the physical simulation; grow to scale −1 to ' +
        'cross once the basin reaches its marked level. On the far bank, inspect ' +
        'the coil register for an optional surviving trace.',
    ],
    ['#interact-label', 'A · VALVE · READ THE COIL LOG'],
    [
      '#objective-reminder',
      'First objective: open the valve and raise the lower basin to reach the far bank.',
    ],
    [
      '#game-footer',
      'Water moves only during explicit game actions, never from the browser clock.',
    ],
  ]),
  ariaLabel: 'Operate the sluice valve or inspect the far-bank coil register',
};
const SILT_MARGIN_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'The Silt Margin'],
    ['#chapter-tag', 'SMALL WORLD · THE SILT MARGIN'],
    ['#chapter-eyebrow', 'A CROSSING THROUGH THE CHOIR'],
    ['#chapter-heading', 'Reroute the dew, or grow through the root.'],
    [
      '#chapter-description',
      'At 2.26 cm tall, Mara can guide the guardian aside, open the fine valve, ' +
        'and send a signal after the dew channel drains. Growing one rung breaks ' +
        'the root arch and crosses the rivulet, but kills the guardian and ' +
        'disrupts the Choir signal. After a safe crossing, press A again to hear ' +
        'Neme translate the Choir’s surviving relay trace. Water and consequences ' +
        'persist in this save.',
    ],
    ['#interact-label', 'A · GUIDE · VALVE · SIGNAL · LISTEN'],
    [
      '#game-footer',
      'Every movement and scale change advances the region clock by 15 game seconds.',
    ],
  ]),
  ariaLabel:
    'Guide the guardian, open the fine valve, send the Choir signal, or hear Neme’s reply',
};
const HEARTHGAPS_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'Hearthgaps'],
    ['#chapter-tag', 'SMALL WORLD · HEARTHGAPS'],
    ['#chapter-eyebrow', 'THE LATCHFOLK CULVERTS'],
    ['#chapter-heading', 'Choose whose homes the runoff reaches.'],
    [
      '#chapter-description',
      'At scale −1 (60.96 cm), Brin can divert the culvert to protect the ' +
        'Latchfolk homes and flood the downstream settlement, or open the ' +
        'shared bypass and let the water reach Brin’s homes instead. Move to ' +
        'either control before pressing A; the choice and flood damage persist.',
    ],
    [
      '#game-footer',
      'Movement and runoff choices advance 15 seconds of explicit game time.',
    ],
  ]),
  ariaLabel: 'Choose the Brin diversion or shared runoff bypass',
  interactionLabel: 'CHOOSE RUNOFF',
};
const WEFTWAYS_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'Weftways'],
    ['#chapter-tag', 'SMALL WORLD · WEFTWAYS'],
    ['#chapter-eyebrow', 'THE THREADBOUND CROSSING'],
    ['#chapter-heading', 'Choose which side of the roots takes the water.'],
    [
      '#chapter-description',
      'At scale −2 (20.32 cm), navigator Pell knows a bypass that protects ' +
        'the deep roots and the oversized beetle caravan, but floods the human ' +
        'low quay. The quay-side spill protects those homes and floods the ' +
        'root crossing. Reach either control before pressing A. Once the ' +
        'crossing is set, reach Pell to inspect the optional caravan relay ' +
        'ledger; it records the lost messages without assigning blame. Then ' +
        'visit the marked caravan circle to share it, the knot cache to keep it ' +
        'private, the brazier to destroy it, or the marked repair table to ' +
        'offer replacement relay tokens and route repair. Pell accepts after ' +
        'the bypass or defers terms until root-channel damage is assessed ' +
        'after the quay spill.',
    ],
    [
      '#game-footer',
      'Route choice, physical effects, and optional relay discovery and response persist in this isolated save.',
    ],
  ]),
  ariaLabel:
    'Choose a water route, inspect Pell’s relay ledger, then share it at the caravan circle, negotiate repairs at the marked table, keep it private at the knot cache, or destroy it at the brazier',
  interactionLabel: 'CHOOSE · READ · SHARE · REPAIR · PRIVATE · DESTROY',
};
const GRAINLANDS_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'Grainlands'],
    ['#chapter-tag', 'SMALL WORLD · GRAINLANDS'],
    ['#chapter-eyebrow', 'THE NURSERY CROSSING'],
    ['#chapter-heading', 'Iru will not save one nest by flooding another.'],
    [
      '#chapter-description',
      'At 6.77 cm, the spider is a formidable predator. Grow to scale −2 to ' +
        'overpower it and break the Threadbound bridge, or help Iru bait it ' +
        'away so the Nursery Clades keep their eggs and crossing. Approach the hatch above the nursery and press A to close its water inlet before an upstream failure.',
    ],
    [
      '#game-footer',
      'Regional progress and shared water consequences persist across visits.',
    ],
  ]),
  ariaLabel: 'Help Iru bait the spider or close the nearby nursery inlet hatch',
  interactionLabel: 'IRU / HATCH',
};
/** @type {Array<[string, string]>} */
const HIGH_WORLD_CONTROL_UPDATES = [
  ['#interact-label', 'A · GROW · B · SHRINK'],
  ['#a-control-label', 'GROW'],
  ['#b-control-label', 'SHRINK'],
  ['#e-control-label', 'NO DISTRICT ACTION'],
];
const LANTERN_WARD_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'The Lantern Ward'],
    ['#chapter-tag', 'HIGH WORLD · THE LANTERN WARD'],
    ['#chapter-eyebrow', 'A CITY BENEATH THE TOWER'],
    ['#chapter-heading', 'At +3, one more rung changes the whole ward.'],
    [
      '#chapter-description',
      'Canal homes and the north glassworks stand within Mara’s next growth ' +
        'footprint. Mira and Tov live there. A shows the buildings and people ' +
        'at risk while keeping growth available; B lets Mara step down to +2.',
    ],
    [
      '#game-footer',
      'City geometry and resident fates persist in the Lantern Ward save.',
    ],
  ]),
  ariaLabel: 'No district interaction is available',
};
const BELLTOPS_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'The Belltops'],
    ['#chapter-tag', 'HIGH WORLD · THE BELLTOPS'],
    ['#chapter-eyebrow', 'A HARBOR ABOVE THE QUAY'],
    ['#chapter-heading', 'At +2, the harbor machinery is Mara’s path.'],
    [
      '#chapter-description',
      'The watchtower and harbor crane stand within Mara’s next growth ' +
        'footprint. Iri maintains the pressure regulator beside the Quay ' +
        'control panel; Orla keeps the tower watch, while stormbirds ride the ' +
        'roofline. A operates the nearest reachable panel or crane drive. ' +
        'Check Iri, then release them or fit the crane governor first; taking it disables harbor lifting. ' +
        'The HUD and campaign status show each action and its risk. A still grows into its displayed footprint; B steps down to +1.',
    ],
    [
      '#game-footer',
      'Regional geometry and shared machinery/fates persist across visits.',
    ],
  ]),
  ariaLabel: 'Use the nearest reachable Quay panel or crane drive',
  interactionLabel: 'QUAY ACTION',
};
const CROWNBACK_REACH_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'Crownback Reach'],
    ['#chapter-tag', 'HIGH WORLD · CROWNBACK REACH'],
    ['#chapter-eyebrow', 'THE MIGRATION FLOODWALLS'],
    ['#chapter-heading', 'Meet elder Tharn among the living-root arches.'],
    [
      '#chapter-description',
      'At +3 Mara stands 49.38 metres tall, close to elder Tharn’s 44 metres. ' +
        'Move within reach and press A to meet him; the calf crosses nearby. ' +
        'A previews the root arch, floodwall, and Crownbacks at risk if Mara ' +
        'grows to +4. B steps down to +2.',
    ],
    [
      '#game-footer',
      'The meeting, migration ground, and growth outcomes persist in this route’s save.',
    ],
  ]),
  ariaLabel: 'Meet elder Tharn when Mara is within reach',
  interactionLabel: 'MEET THARN',
};
const WAKEFORM_SHOALS_PAGE_COPY = {
  updates: /** @type {Array<[string, string]>} */ ([
    ['#chapter-subtitle', 'The Shoals'],
    ['#chapter-tag', 'HIGH WORLD · THE SHOALS'],
    ['#chapter-eyebrow', 'AN OFFSHORE TIDE DIVERSION'],
    ['#chapter-heading', 'At +4, break the outer wall or guide the Wakeform.'],
    [
      '#chapter-description',
      'Mara starts at +3 (49.38 metres); A grows to +4 (148.13 metres). ' +
        'The 132-metre Wakeform contests the outer tide wall. Move within ' +
        'reach and press A to guide it toward the north channel, or use A to ' +
        'grow through the wall and divert the current seaward.',
    ],
    [
      '#game-footer',
      'Wakeform and tide-wall outcomes persist in this route’s isolated save.',
    ],
  ]),
  ariaLabel: 'Guide the Wakeform away when Mara is within reach',
  interactionLabel: 'DIVERT WAKEFORM',
};

/**
 * Start the standalone THREEFOLD handheld page.
 * @param {Record<string, any>} options Injected browser and animation APIs.
 * @returns {() => void} Page lifecycle disposer.
 */
export function startThreefoldPage(options) {
  const scene = options.scene;
  if (scene?.id === 'small-world-sluice')
    configureSluicePage(options.documentObj);
  else if (scene?.id === 'silt-margin')
    configureSiltMarginPage(options.documentObj);
  else if (scene?.id === 'hearthgaps')
    configureHighWorldPage(options.documentObj, HEARTHGAPS_PAGE_COPY);
  else if (scene?.id === 'weftways')
    configureHighWorldPage(options.documentObj, WEFTWAYS_PAGE_COPY);
  else if (scene?.id === 'grainlands')
    configureHighWorldPage(options.documentObj, GRAINLANDS_PAGE_COPY);
  else if (scene?.id === lanternWard.THREEFOLD_LANTERN_WARD_SCENE_ID)
    configureHighWorldPage(options.documentObj, LANTERN_WARD_PAGE_COPY);
  else if (scene?.id === 'belltops')
    configureHighWorldPage(options.documentObj, BELLTOPS_PAGE_COPY);
  else if (scene?.id === 'crownback-reach')
    configureHighWorldPage(options.documentObj, CROWNBACK_REACH_PAGE_COPY);
  else if (scene?.id === 'wakeform-shoals')
    configureHighWorldPage(options.documentObj, WAKEFORM_SHOALS_PAGE_COPY);
  let storage = options.storage;
  if (!storage) {
    try {
      storage = options.windowObj.localStorage;
    } catch {
      storage = undefined;
    }
  }
  return mosslightPresenter.startMosslightPage({
    ...options,
    ...mosslightPresenter.createMosslightPageEnvironment(options),
    allowedActions: ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y'],
    createRuntime: (/** @type {Record<string, any>} */ runtimeOptions) =>
      createThreefoldMenuRuntime(
        createThreefoldRuntime({ ...runtimeOptions, storage, scene }),
        options.documentObj
      ),
    describeInput: describeThreefoldInput,
    bindRuntime: (
      /** @type {{runtime: Record<string, any>, documentObj: any, draw: () => void}} */ runtimeBindings
    ) =>
      bindThreefoldTravel(
        runtimeBindings.runtime,
        runtimeBindings.documentObj,
        runtimeBindings.draw
      ),
    drawFrame: (
      /** @type {any} */ context,
      /** @type {Record<string, any>} */ frame
    ) => {
      (options.drawFrame || drawGameFrame)(context, frame);
      renderThreefoldLogicalGridWarning(
        options.documentObj,
        frame.threefold?.logicalGridLayout
      );
      const persistence = options.documentObj.querySelector(
        '#campaign-persistence'
      );
      if (persistence)
        persistence.textContent = frame.threefold?.campaignPersistence?.dirty
          ? 'Progress is only in this open page. Back up your campaign before leaving; this device could not save it.'
          : '';
      renderThreefoldReturnTidePanel(
        options.documentObj,
        frame.threefold?.returnTide
      );
      renderThreefoldWitnessLedger(
        options.documentObj,
        frame.threefold?.witnessLedger || []
      );
      renderThreefoldCampaignPlaces(options.documentObj, frame);
      renderThreefoldTestimony(
        options.documentObj,
        frame.threefold?.testimony || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#iri-repair-log',
        '#iri-repair-log-text',
        frame.threefold?.iriRepairLog || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#iri-recorded-confession',
        '#iri-recorded-confession-text',
        frame.threefold?.iriRecordedConfession || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#harbor-memorial',
        '#harbor-memorial-text',
        frame.threefold?.harborMemorial || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#belltops-watch-response',
        '#belltops-watch-response-text',
        frame.threefold?.orlaHarborResponse || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#harbor-engineer-availability',
        '#harbor-engineer-availability-text',
        frame.threefold?.harborEngineerAvailability || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#iri-witness-lead',
        '#iri-witness-lead-text',
        frame.threefold?.iriWitnessLead || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#ferry-wreck-search',
        '#ferry-wreck-search-text',
        frame.threefold?.ferryWreckSearch || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#latchfolk-displacement-aid',
        '#latchfolk-displacement-aid-text',
        frame.threefold?.latchfolkAid || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-relay-record',
        '#weftways-relay-record-text',
        frame.threefold?.threadboundRelayRecord || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-relay-disclosure',
        '#weftways-relay-disclosure-text',
        frame.threefold?.threadboundRelayDisclosure || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-relay-concealment',
        '#weftways-relay-concealment-text',
        frame.threefold?.threadboundRelayConcealment || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-relay-destruction',
        '#weftways-relay-destruction-text',
        frame.threefold?.threadboundRelayDestruction || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-relay-restitution',
        '#weftways-relay-restitution-text',
        frame.threefold?.threadboundRelayRestitution || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-independent-publication',
        '#weftways-independent-publication-text',
        frame.threefold?.threadboundIndependentPublication || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#weftways-pell-outcome',
        '#weftways-pell-outcome-text',
        frame.threefold?.threadboundPellOutcome || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#tidal-archive-quieting-trace',
        '#tidal-archive-quieting-trace-text',
        frame.threefold?.archiveQuietingTrace || null
      );
      renderThreefoldDisclosurePanel(
        options.documentObj,
        '#silt-margin-quieting-evidence',
        '#silt-margin-quieting-evidence-text',
        frame.threefold?.siltMarginQuietingEvidence || null
      );
      renderThreefoldEpisodeEpilogue(
        options.documentObj,
        frame.threefold?.episodeEpilogue || null
      );
    },
    saveFilename: 'threefold-save.json',
    saveTransfers: [
      {
        exportSelector: '#export-campaign',
        importSelector: '#import-campaign-button',
        inputSelector: '#import-campaign',
        exportMethod: 'exportCampaign',
        importMethod: 'importCampaign',
        filename: 'threefold-campaign.json',
        successText: 'Campaign restored on this device.',
        errorText:
          'Campaign could not be restored. Your current progress has been kept.',
      },
    ],
  });
}

/**
 * Add a controller-only menu to the handheld runtime. Y opens or closes it;
 * the four directions navigate, A confirms, and B returns.
 * @param {Record<string, any>} runtime THREEFOLD campaign runtime.
 * @param {any} documentObj Page document for existing file-transfer actions.
 * @returns {Record<string, any>} Runtime facade with the menu rendered in-frame.
 */
export function createThreefoldMenuRuntime(runtime, documentObj) {
  let open = false;
  let section = 'main';
  let cursor = 0;
  let scroll = 0;
  let previous = new Set();
  const baseFrame = runtime.frame.bind(runtime);
  const baseStep = runtime.step.bind(runtime);
  const facade = { ...runtime };

  /**
   * @param {number} action Selected item index.
   * @param {Record<string, any>} frame Current game frame.
   */
  const activate = (action, frame) => {
    if (section === 'main') {
      if (action === 0) close();
      if (action === 1) enter('guide');
      if (action === 2) enter('travel');
      if (action === 3) enter('journal');
      if (action === 4) enter('campaign');
      if (action === 5) enter('saves');
      if (action === 6) enter('system');
      return;
    }
    if (section === 'travel') {
      const destination = Object.keys(SCENE_LABELS)[action];
      const nextScene = sceneFromTravelDestination(destination);
      if (nextScene) runtime.travelTo(nextScene);
      close();
      return;
    }
    if (section === 'saves') {
      const selectors = [
        '#save-game',
        '#export-game',
        '#import-button',
        '#export-campaign',
        '#import-campaign-button',
      ];
      if (selectors[action])
        documentObj.querySelector(selectors[action])?.click();
      if (action === selectors.length) enter('main');
      return;
    }
    if (section === 'system') {
      if (action === 0) close();
      if (action === 1) documentObj.querySelector('#fullscreen-game')?.click();
      if (action === 2) documentObj.querySelector('#reset-game')?.click();
      return;
    }
    if (action === itemsFor(frame).length - 1) enter('main');
  };

  /** @param {string} nextSection Menu subsection. */
  const enter = nextSection => {
    section = nextSection;
    cursor = 0;
    scroll = 0;
  };
  const close = () => {
    open = false;
    previous.clear();
    runtime.resume();
  };
  /**
   * @param {Record<string, any>} frame Current game frame.
   * @returns {string[]} Labels to display in the active section.
   */
  const itemsFor = frame => {
    if (section === 'main')
      return [
        'RESUME',
        'HOW TO PLAY',
        'TRAVEL',
        'FIELD NOTES',
        'CAMPAIGN',
        'SAVES',
        'SYSTEM',
      ];
    if (section === 'travel') return Object.values(SCENE_LABELS);
    if (section === 'saves')
      return [
        'SAVE REGION',
        'EXPORT REGION',
        'IMPORT REGION',
        'BACKUP CAMPAIGN',
        'RESTORE CAMPAIGN',
        'BACK',
      ];
    if (section === 'system') return ['RESUME', 'FULL SCREEN', 'RESET REGION'];
    if (section === 'guide')
      return [
        'ARROWS MOVE',
        'A USE / GROW',
        'B SHRINK',
        'X WAIT / BYPASS',
        'Y OPENS THIS MENU',
        'B/X BACK OUT',
        'MOVE NEAR PEOPLE',
        'PRESS A TO ACT',
        ...wrapMenuText(SCENE_OBJECTIVES[sceneKey(frame)]),
        'BACK',
      ];
    if (section === 'journal') {
      const data = frame.threefold || {};
      const entries = data.witnessLedger || [];
      const testimony = data.testimony?.accounts || [];
      const records = [
        data.iriRepairLog,
        data.iriRecordedConfession,
        data.iriWitnessLead,
        data.ferryWreckSearch,
        data.latchfolkAid,
        data.harborMemorial,
        data.orlaHarborResponse,
        data.harborEngineerAvailability,
        data.threadboundRelayRecord,
        data.threadboundPellOutcome,
        data.threadboundRelayDisclosure,
        data.threadboundRelayConcealment,
        data.threadboundRelayDestruction,
        data.threadboundRelayRestitution,
        data.threadboundIndependentPublication,
        data.archiveQuietingTrace,
        data.siltMarginQuietingEvidence,
      ].filter(Boolean);
      return [
        ...entries.flatMap((/** @type {Record<string, any>} */ entry) => [
          ...wrapMenuText(entry.title),
          ...wrapMenuText(entry.intention),
          ...wrapMenuText(entry.knowledge),
          ...wrapMenuText(entry.consequence),
          ...(entry.relation ? wrapMenuText(entry.relation) : []),
        ]),
        ...testimony.flatMap((/** @type {Record<string, any>} */ account) =>
          wrapMenuText(`${account.speaker}: ${account.statement}`)
        ),
        ...records.flatMap(record =>
          wrapMenuText(
            `${record.title || 'FIELD NOTE'}: ${record.text || (record.paragraphs || []).join(' ')}`
          )
        ),
        ...(data.testimony?.responsibility
          ? wrapMenuText(
              `${data.testimony.responsibility.question} ${data.testimony.responsibility.status}`
            )
          : []),
        ...(data.episodeEpilogue?.paragraphs || []).flatMap(wrapMenuText),
        ...(entries.length || testimony.length || records.length
          ? []
          : ['NO FIELD NOTES YET']),
        'BACK',
      ];
    }
    const places = frame.threefold?.campaignPlaces || [];
    const pressure = frame.threefold?.campaignPressure || [];
    const tide = frame.threefold?.returnTide;
    return [
      `CLOCK ${Math.floor(
        frame.threefold?.campaignClock?.elapsedGameSeconds / 60 || 0
      )} MIN`,
      ...places.flatMap((/** @type {Record<string, any>} */ place) =>
        wrapMenuText(
          `${place.label || place.id}: ${place.state || (place.active ? 'HERE' : 'VISITED')}`
        )
      ),
      ...pressure.flatMap((/** @type {Record<string, any>} */ site) =>
        wrapMenuText(`${site.label}: ${site.state}`)
      ),
      ...(tide ? wrapMenuText(`${tide.title}: ${tide.text}`) : []),
      'BACK',
    ];
  };
  /**
   * @param {string} text Content to wrap to the 18-character game screen.
   * @returns {string[]} Screen-sized lines.
   */
  const wrapMenuText = text => {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > 18 && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  };
  /**
   * @param {Record<string, any>} frame Current game frame.
   * @returns {ThreefoldSceneKey} Canonical key for the visible scene.
   */
  const sceneKey = frame => {
    const name = frame.world?.map?.name || '';
    return (
      SCENE_KEYS.find(key =>
        name.includes(SCENE_LABELS[key].replace(/^The /, '').toUpperCase())
      ) || 'broken-gate'
    );
  };
  facade.frame = () => {
    const frame = baseFrame();
    if (!open) return frame;
    const items = itemsFor(frame);
    if (cursor >= items.length) cursor = Math.max(0, items.length - 1);
    const header = section === 'main' ? 'THREEFOLD' : section.toUpperCase();
    frame.shapes.push(
      { type: 'rect', x: 8, y: 16, width: 144, height: 120, fill: '#102823' },
      { type: 'rect', x: 8, y: 16, width: 144, height: 8, fill: '#25a9b8' },
      {
        type: 'text',
        x: 16,
        y: 23,
        text: header,
        fill: '#182f36',
        font: '6px monospace',
      }
    );
    const visibleItems = items.slice(scroll, scroll + 9);
    visibleItems.forEach((item, index) => {
      const y = 34 + index * 11;
      const selected = index + scroll === cursor;
      frame.shapes.push(
        ...(selected
          ? [
              {
                type: 'rect',
                x: 16,
                y: y - 8,
                width: 128,
                height: 8,
                fill: '#315744',
              },
            ]
          : []),
        {
          type: 'text',
          x: 20,
          y,
          text: `${selected ? '>' : ' '} ${item.slice(0, 18).toUpperCase()}`,
          fill: selected ? '#e9d88d' : '#bfd77c',
          font: '6px monospace',
        }
      );
    });
    frame.shapes.push({
      type: 'text',
      x: 16,
      y: 130,
      text: 'A SELECT · B BACK · Y CLOSE',
      fill: '#e9d88d',
      font: '5px monospace',
    });
    return frame;
  };
  /**
   * @param {number} delta Elapsed animation time.
   * @param {string[]} actions Current controller inputs.
   * @returns {void} Advances the menu or game by one input frame.
   */
  facade.step = (delta, actions) => {
    const pressed = new Set(actions);
    /**
     * @param {string} action Controller action.
     * @returns {boolean} Whether a fresh press occurred.
     */
    const edge = action => pressed.has(action) && !previous.has(action);
    if (!open && edge('y')) {
      open = true;
      section = 'main';
      cursor = 0;
      scroll = 0;
      runtime.pause();
    } else if (open) {
      const items = itemsFor(baseFrame());
      if (edge('y')) close();
      else if (edge('b') || edge('x')) {
        if (section === 'main') close();
        else enter('main');
      } else if (edge('up')) {
        cursor = (cursor + items.length - 1) % items.length;
        if (cursor < scroll) scroll = cursor;
      } else if (edge('down')) {
        cursor = (cursor + 1) % items.length;
        if (cursor >= scroll + 9) scroll = cursor - 8;
      } else if (edge('a')) activate(cursor, baseFrame());
    } else {
      baseStep(
        delta,
        [...pressed].filter(action => action !== 'y' && action !== 'interact')
      );
    }
    previous = pressed;
  };
  facade.isRunning = () => open || runtime.isRunning();
  return facade;
}

/**
 * Describe the first newly pressed THREEFOLD action for immediate feedback.
 * @param {string[]} actions Active input actions.
 * @returns {string} Short status-line acknowledgement.
 */
function describeThreefoldInput(actions) {
  const action = actions[0];
  const labels = /** @type {Record<string, string>} */ ({
    up: 'Input received · MOVE UP',
    down: 'Input received · MOVE DOWN',
    left: 'Input received · MOVE LEFT',
    right: 'Input received · MOVE RIGHT',
    a: 'Input received · USE / GROW',
    b: 'Input received · SHRINK',
    x: 'Input received · WAIT',
    y: 'Input received · OPEN MENU',
  });
  return labels[action] || 'Input received';
}

/** @typedef {'broken-gate'|'sluice'|'silt-margin'|'hearthgaps'|'weftways'|'grainlands'|'lantern-ward'|'belltops'|'crownback-reach'|'shoals'} ThreefoldSceneKey */
/** @type {ThreefoldSceneKey[]} */
const SCENE_KEYS = [
  'broken-gate',
  'sluice',
  'silt-margin',
  'hearthgaps',
  'weftways',
  'grainlands',
  'lantern-ward',
  'belltops',
  'crownback-reach',
  'shoals',
];
/** @type {Record<ThreefoldSceneKey, string> & Record<string, string>} */
const SCENE_OBJECTIVES = {
  'broken-gate': 'Reach the west wall and grow through it before the surge.',
  sluice: 'Open the service valve and raise the lower basin to cross.',
  'silt-margin':
    'Guide the guardian, reroute the dew, or break through the root.',
  hearthgaps: 'Choose which settlement receives the culvert runoff.',
  weftways: 'Choose which side of the roots takes the water.',
  grainlands:
    'Reach the nursery hatch and decide how to cross the spider field.',
  'lantern-ward': 'Explore the ward and follow its current leads.',
  belltops: 'Explore the harbor district and its pressure regulator.',
  'crownback-reach': 'Find Tharn and decide whether to guide the encounter.',
  shoals: 'Explore the shoals and respond to the Wakeform and tide wall.',
};
/** @type {Record<ThreefoldSceneKey, string> & Record<string, string>} */
const SCENE_LABELS = {
  'broken-gate': 'The Broken Gate',
  sluice: 'The Tidal Archive',
  'silt-margin': 'The Silt Margin',
  hearthgaps: 'Hearthgaps',
  weftways: 'The Weftways',
  grainlands: 'The Grainlands',
  'lantern-ward': 'The Lantern Ward',
  belltops: 'Belltops',
  'crownback-reach': 'Crownback Reach',
  shoals: 'Wakeform Shoals',
};

/**
 * Resolve an in-game travel selection to an authored region.
 * @param {string} destination Selected menu value.
 * @returns {any} Fresh authored scene, or null for an unknown destination.
 */
function sceneFromTravelDestination(destination) {
  const scenes = /** @type {Record<string, () => any>} */ ({
    'broken-gate': createBrokenGateScene,
    sluice: createThreefoldSluiceScene,
    'silt-margin': createThreefoldSiltMarginScene,
    hearthgaps: createThreefoldHearthgapsScene,
    weftways: createThreefoldWeftwaysScene,
    grainlands: createThreefoldGrainlandsScene,
    'lantern-ward': lanternWard.createThreefoldLanternWardScene,
    belltops: createThreefoldBelltopsScene,
    'crownback-reach': createThreefoldCrownbackReachScene,
    shoals: createThreefoldWakeformShoalsScene,
  });
  return scenes[destination]?.() || null;
}

/**
 * Bind the in-game travel menu to the persistent multi-region runtime.
 * @param {Record<string, any>} runtime THREEFOLD runtime.
 * @param {any} documentObj Page document.
 * @param {() => void} draw Draw the current game frame.
 * @returns {() => void} Remove travel control listeners.
 */
function bindThreefoldTravel(runtime, documentObj, draw) {
  const select = documentObj.querySelector('#travel-destination');
  const button = documentObj.querySelector('#travel-button');
  const status = documentObj.querySelector('#travel-status');
  const objective = documentObj.querySelector('#objective-reminder');
  if (!select || !button || !runtime.travelTo) return () => {};
  const travel = () => {
    const scene = sceneFromTravelDestination(select.value);
    if (!scene) return;
    runtime.travelTo(scene);
    const title = SCENE_LABELS[select.value];
    if (status) status.textContent = `Arrived at ${title}.`;
    if (objective)
      objective.textContent = `Current objective: ${SCENE_OBJECTIVES[select.value]}`;
    draw();
  };
  button.addEventListener('click', travel);
  return () => button.removeEventListener('click', travel);
}

/**
 * Replace the default Broken Gate copy with the small-world puzzle description.
 * @param {any} documentObj Injected browser document.
 * @returns {void}
 */
function configureSluicePage(documentObj) {
  configureAlternateScenePage(documentObj, SLUICE_PAGE_COPY);
}

/**
 * Replace the default Broken Gate copy with the Silt Margin branch description.
 * @param {any} documentObj Injected browser document.
 * @returns {void}
 */
function configureSiltMarginPage(documentObj) {
  configureAlternateScenePage(documentObj, SILT_MARGIN_PAGE_COPY);
}

/**
 * Replace default Broken Gate copy and controls for an authored high-world route.
 * @param {any} documentObj Injected browser document.
 * @param {{updates: Array<[string, string]>, ariaLabel: string, interactionLabel?: string}} copy Route-specific copy and interaction.
 * @returns {void}
 */
function configureHighWorldPage(documentObj, copy) {
  configureAlternateScenePage(documentObj, {
    ...copy,
    updates: [
      ...copy.updates,
      ...(copy.interactionLabel
        ? createHighWorldInteractionControlUpdates(copy.interactionLabel)
        : HIGH_WORLD_CONTROL_UPDATES),
    ],
  });
  const interactControl = documentObj?.querySelector?.('#interact-control');
  if (interactControl) interactControl.hidden = !copy.interactionLabel;
}

/**
 * Apply route-specific copy and hide Broken Gate-only records.
 * @param {any} documentObj Injected browser document.
 * @param {{updates: Array<[string, string]>, ariaLabel: string, interactionLabel?: string}} copy Alternate scene copy.
 * @returns {void}
 */
function configureAlternateScenePage(documentObj, copy) {
  const { updates, ariaLabel } = copy;
  updates.forEach(([selector, text]) => {
    const element = documentObj?.querySelector?.(selector);
    if (element) element.textContent = text;
  });
  const interactControl = documentObj?.querySelector?.('#interact-control');
  interactControl?.setAttribute?.('aria-label', ariaLabel);
  const witnessLedger = documentObj?.querySelector?.('#witness-ledger');
  if (witnessLedger) witnessLedger.hidden = true;
  const testimony = documentObj?.querySelector?.('#testimony');
  if (testimony) testimony.hidden = true;
  const iriRepairLog = documentObj?.querySelector?.('#iri-repair-log');
  if (iriRepairLog) iriRepairLog.hidden = true;
  const iriRecordedConfession = documentObj?.querySelector?.(
    '#iri-recorded-confession'
  );
  if (iriRecordedConfession) iriRecordedConfession.hidden = true;
  const weftwaysRelayRecord = documentObj?.querySelector?.(
    '#weftways-relay-record'
  );
  if (weftwaysRelayRecord) weftwaysRelayRecord.hidden = true;
  const weftwaysRelayDisclosure = documentObj?.querySelector?.(
    '#weftways-relay-disclosure'
  );
  if (weftwaysRelayDisclosure) weftwaysRelayDisclosure.hidden = true;
  const weftwaysRelayConcealment = documentObj?.querySelector?.(
    '#weftways-relay-concealment'
  );
  if (weftwaysRelayConcealment) weftwaysRelayConcealment.hidden = true;
  const weftwaysRelayDestruction = documentObj?.querySelector?.(
    '#weftways-relay-destruction'
  );
  if (weftwaysRelayDestruction) weftwaysRelayDestruction.hidden = true;
  const weftwaysRelayRestitution = documentObj?.querySelector?.(
    '#weftways-relay-restitution'
  );
  if (weftwaysRelayRestitution) weftwaysRelayRestitution.hidden = true;
  const weftwaysIndependentPublication = documentObj?.querySelector?.(
    '#weftways-independent-publication'
  );
  if (weftwaysIndependentPublication)
    weftwaysIndependentPublication.hidden = true;
  const weftwaysPellOutcome = documentObj?.querySelector?.(
    '#weftways-pell-outcome'
  );
  if (weftwaysPellOutcome) weftwaysPellOutcome.hidden = true;
  const siltMarginQuietingEvidence = documentObj?.querySelector?.(
    '#silt-margin-quieting-evidence'
  );
  if (siltMarginQuietingEvidence) siltMarginQuietingEvidence.hidden = true;
  const episodeEpilogue = documentObj?.querySelector?.('#episode-epilogue');
  if (episodeEpilogue) episodeEpilogue.hidden = true;
  const hearthgapsEntry = documentObj?.querySelector?.('#hearthgaps-entry');
  if (hearthgapsEntry) hearthgapsEntry.hidden = true;
  const weftwaysEntry = documentObj?.querySelector?.('#weftways-entry');
  if (weftwaysEntry) weftwaysEntry.hidden = true;
  const grainlandsEntry = documentObj?.querySelector?.('#grainlands-entry');
  if (grainlandsEntry) grainlandsEntry.hidden = true;
}

/**
 * Label the shared scale controls beside a route's A action.
 * @param {string} interactionLabel Accessible action name.
 * @returns {Array<[string, string]>} Mosslight page control text.
 */
function createHighWorldInteractionControlUpdates(interactionLabel) {
  return [
    ['#interact-label', `A · ${interactionLabel} / GROW · B · SHRINK`],
    ['#a-control-label', 'GROW'],
    ['#b-control-label', 'SHRINK'],
    ['#e-control-label', interactionLabel],
  ];
}

/**
 * Render attributed accounts and their statements separately from the event
 * ledger and its player-intention records.
 * @param {any} documentObj Standalone page document adapter.
 * @param {{accounts: Array<{speaker: string, statement: string, evidence: Array<{label: string, text: string}>}>, responsibility: {question: string, status: string}}|null} testimony Authored Broken Gate accounts.
 * @returns {void}
 */
function renderThreefoldTestimony(documentObj, testimony) {
  const list = documentObj?.querySelector?.('#testimony-accounts');
  if (!list) return;
  const signature = JSON.stringify(testimony);
  if (renderedTestimonyByList.get(list) === signature) return;
  renderedTestimonyByList.set(list, signature);
  list.replaceChildren();
  if (!testimony) return;
  testimony.accounts.forEach(account => {
    const item = documentObj.createElement('li');
    const article = documentObj.createElement('div');
    article.className = 'witness-event';
    const title = documentObj.createElement('strong');
    title.textContent = account.speaker;
    article.appendChild(title);
    appendWitnessField(documentObj, article, 'Account', account.statement);
    account.evidence.forEach(evidence =>
      appendWitnessField(documentObj, article, evidence.label, evidence.text)
    );
    item.appendChild(article);
    list.appendChild(item);
  });
  const responsibility = documentObj.querySelector('#testimony-responsibility');
  if (responsibility)
    responsibility.textContent = `${testimony.responsibility.question} Status: ${testimony.responsibility.status}.`;
}

/**
 * Render one accessible disclosure from the current simulation frame.
 * @param {any} documentObj Standalone page document adapter.
 * @param {string} panelSelector Disclosure identifier.
 * @param {string} textSelector Text identifier.
 * @param {{title: string, text: string}|null} record Saved player-facing record.
 * @returns {void}
 */
function renderThreefoldDisclosurePanel(
  documentObj,
  panelSelector,
  textSelector,
  record
) {
  const panel = documentObj?.querySelector?.(panelSelector);
  const text = documentObj?.querySelector?.(textSelector);
  if (!panel || !text) return;
  panel.hidden = record === null;
  if (!record) return;
  const summary = panel.querySelector?.('summary');
  if (summary && summary.textContent !== record.title)
    summary.textContent = record.title;
  if (text.textContent !== record.text) text.textContent = record.text;
}

/**
 * Show a compact index of the current and saved regions.
 * @param {any} documentObj Standalone page document adapter.
 * @param {{threefold?: {campaignPlaces?: Array<{id: string, label: string, active: boolean}>, campaignClock?: {elapsedGameSeconds?: number}, campaignIriFate?: import('./campaign-outcomes.js').ThreefoldIriFate|null, campaignPressure?: Array<{id: string, label: string, state: string, detail?: string}>}}} frame Current rendered campaign frame.
 * @returns {void}
 */
function renderThreefoldCampaignPlaces(documentObj, frame) {
  const places = frame.threefold?.campaignPlaces || [];
  const elapsedGameSeconds =
    frame.threefold?.campaignClock?.elapsedGameSeconds ?? 0;
  const iriFate = frame.threefold?.campaignIriFate || null;
  const pressure = frame.threefold?.campaignPressure || [];
  const panel = documentObj?.querySelector?.('#campaign-places');
  const text = documentObj?.querySelector?.('#campaign-places-text');
  const clockText = documentObj?.querySelector?.('#campaign-clock-text');
  const iriFateText = documentObj?.querySelector?.('#campaign-iri-fate-text');
  const pressureText = documentObj?.querySelector?.('#campaign-pressure-text');
  if (!panel || !text || !clockText || !iriFateText || !pressureText) return;
  iriFateText.hidden = iriFate === null;
  pressureText.hidden = pressure.length === 0;
  const safeElapsedGameSeconds =
    Number.isFinite(elapsedGameSeconds) && elapsedGameSeconds >= 0
      ? Math.floor(elapsedGameSeconds)
      : 0;
  panel.hidden =
    places.length < 2 &&
    safeElapsedGameSeconds === 0 &&
    iriFate === null &&
    pressure.length === 0;
  if (panel.hidden) return;
  const summary = panel.querySelector?.('summary');
  if (summary && summary.textContent !== 'Campaign status')
    summary.textContent = 'Campaign status';
  const hours = Math.floor(safeElapsedGameSeconds / 3600);
  const minutes = Math.floor((safeElapsedGameSeconds % 3600) / 60);
  const seconds = safeElapsedGameSeconds % 60;
  const clockContent = `Campaign elapsed: ${hours}h ${minutes}m ${seconds}s`;
  if (clockText.textContent !== clockContent)
    clockText.textContent = clockContent;
  const content = places
    .map(place => `${place.label} (${place.active ? 'current' : 'saved'})`)
    .join(' · ');
  if (text.textContent !== content) text.textContent = content;
  const pressureContent = pressure
    .map(describeCampaignPressureSite)
    .join(' · ');
  if (pressureText.textContent !== pressureContent)
    pressureText.textContent = pressureContent;
  if (iriFate !== null) {
    const fateContent = describeKnownThreefoldIriFate(iriFate);
    if (!fateContent) {
      iriFateText.hidden = true;
      return;
    }
    if (iriFateText.textContent !== fateContent)
      iriFateText.textContent = fateContent;
  }
}

/**
 * Present a saved hydraulic outcome without exposing internal route IDs.
 * @param {{id: string, label: string, state: string, detail?: string}} site Campaign pressure-system source.
 * @returns {string} Accessible pressure-system status.
 */
function describeCampaignPressureSite(site) {
  if (site.id === 'belltops-quay') return `Quay regulator ${site.state}`;
  if (site.id === 'hearthgaps-runoff') {
    const choice =
      site.state === 'brin-diversion' ? 'Brin diversion' : 'shared bypass';
    const floodedHomes =
      site.detail === 'hearthgaps-brin-homes'
        ? 'Brin homes flooded'
        : site.detail === 'hearthgaps-downstream-homes'
          ? 'downstream homes flooded'
          : 'no homes flooded';
    return `Hearthgaps ${choice}; ${floodedHomes}`;
  }
  if (site.id === 'silt-margin-choir') {
    const signal =
      site.state === 'sent'
        ? 'Choir signal sent'
        : site.state === 'disrupted'
          ? 'Choir signal disrupted'
          : 'Choir signal blocked';
    const crossing =
      site.detail === 'crossing-open' ? 'crossing open' : 'crossing flooded';
    return `Silt Margin ${signal}; ${crossing}`;
  }
  return site.label;
}

/**
 * Render the report/departure aftermath as an accessible, collapsible record.
 * @param {any} documentObj Standalone page document adapter.
 * @param {{title: string, paragraphs: string[]}|null} epilogue Saved closure and outcomes.
 * @returns {void}
 */
function renderThreefoldEpisodeEpilogue(documentObj, epilogue) {
  const panel = documentObj?.querySelector?.('#episode-epilogue');
  const list = documentObj?.querySelector?.('#episode-epilogue-outcomes');
  if (!panel || !list) return;
  panel.hidden = epilogue === null;
  const signature = JSON.stringify(epilogue);
  if (renderedEpisodeEpilogueByList.get(list) === signature) return;
  renderedEpisodeEpilogueByList.set(list, signature);
  list.replaceChildren();
  if (!epilogue) return;
  const summary = panel.querySelector?.('summary');
  if (summary && summary.textContent !== epilogue.title)
    summary.textContent = epilogue.title;
  epilogue.paragraphs.forEach(text => {
    const item = documentObj.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  });
}

/**
 * Render factual event history beside the shared Mosslight screen.
 * @param {any} documentObj Standalone page document adapter.
 * @param {Array<ReturnType<typeof import('./witness-ledger.js').presentThreefoldWitnessEntry>>} entries Player-facing journal events.
 * @returns {void}
 */
function renderThreefoldWitnessLedger(documentObj, entries) {
  const list = documentObj?.querySelector?.('#witness-ledger-entries');
  if (!list) return;
  list.replaceChildren();
  if (entries.length === 0) {
    const item = documentObj.createElement('li');
    item.textContent = 'No gate events recorded yet.';
    list.appendChild(item);
    return;
  }
  entries.forEach(entry =>
    list.appendChild(createWitnessListItem(documentObj, entry))
  );
}

/**
 * Expose unresolved display-cell overlaps without changing the simulated world.
 * @param {any} documentObj Standalone page document adapter.
 * @param {{conflicts: Array<unknown>} | undefined} logicalGridLayout Current projected layout.
 * @returns {void}
 */
function renderThreefoldLogicalGridWarning(documentObj, logicalGridLayout) {
  const warning = documentObj.querySelector('#logical-grid-warning');
  if (!warning) return;
  const conflictCount = logicalGridLayout?.conflicts.length || 0;
  warning.hidden = conflictCount === 0;
  warning.textContent =
    conflictCount === 0
      ? ''
      : `At this scale, ${conflictCount} pairs of objects share display cells. Their physical positions and collisions are unchanged.`;
}

/**
 * Create one text-only, accessible journal event without injecting markup.
 * @param {any} documentObj Standalone page document adapter.
 * @param {{title: string, intention: string, knowledge: string, consequence: string, relation: string|null}} entry Presented event.
 * @returns {any} List item node.
 */
function createWitnessListItem(documentObj, entry) {
  const item = documentObj.createElement('li');
  const article = documentObj.createElement('div');
  article.className = 'witness-event';
  const title = documentObj.createElement('strong');
  title.textContent = entry.title;
  article.appendChild(title);
  appendWitnessField(documentObj, article, 'Choice', entry.intention);
  appendWitnessField(documentObj, article, 'Knowledge', entry.knowledge);
  appendWitnessField(documentObj, article, 'Consequence', entry.consequence);
  if (entry.relation)
    appendWitnessField(documentObj, article, 'History', entry.relation);
  item.appendChild(article);
  return item;
}

/**
 * Add one labeled, escaped text field to an event.
 * @param {any} documentObj Standalone page document adapter.
 * @param {any} parent Event article node.
 * @param {string} label Field label.
 * @param {string} value Field content.
 * @returns {void}
 */
function appendWitnessField(documentObj, parent, label, value) {
  const paragraph = documentObj.createElement('p');
  const heading = documentObj.createElement('strong');
  heading.textContent = `${label}: `;
  paragraph.append(heading, documentObj.createTextNode(value));
  parent.appendChild(paragraph);
}

/**
 * Present the world phase, explicit costs and only surveyed consequence accounts.
 * @param {any} documentObj Injected page document.
 * @param {any} content Shared-renderer tide context.
 * @returns {void}
 */
function renderThreefoldReturnTidePanel(documentObj, content) {
  const panel = documentObj.querySelector?.('#return-tide');
  const text = documentObj.querySelector?.('#return-tide-text');
  const list = documentObj.querySelector?.('#return-tide-epilogue');
  if (!panel || !text || !list || !content) return;
  panel.hidden = false;
  if (text.textContent !== content.text) text.textContent = content.text;
  const serialized = JSON.stringify(content.epilogue);
  if (list.dataset.entries === serialized) return;
  list.dataset.entries = serialized;
  list.replaceChildren(
    ...content.epilogue.map(
      /**
       * @param {string} message Observed local account.
       * @returns {any} Accessible list item.
       */ message => {
        const item = documentObj.createElement('li');
        item.textContent = message;
        return item;
      }
    )
  );
}
