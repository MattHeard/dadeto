import {
  createMosslightPageEnvironment,
  startMosslightPage,
} from '../mosslight-valley/pagePresenter.js';
import { createThreefoldRuntime } from './runtime.js';
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
    ['#interact-label', 'E · VALVE · READ THE COIL LOG'],
    ['#scene-link', 'Continue into the Silt Margin'],
    [
      '#game-footer',
      'Water moves only during explicit game actions, never from the browser clock.',
    ],
  ]),
  href: '/threefold/?scene=silt-margin',
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
        'disrupts the Choir signal. After a safe crossing, press E again to hear ' +
        'Neme translate the Choir’s surviving relay trace. Water and consequences ' +
        'persist in this save.',
    ],
    ['#interact-label', 'E · GUIDE · VALVE · SIGNAL · LISTEN'],
    ['#scene-link', 'Continue to the Lantern Ward'],
    [
      '#game-footer',
      'Every movement and scale change advances the region clock by 15 game seconds.',
    ],
  ]),
  href: '/threefold/?scene=lantern-ward',
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
        'either control before pressing E; the choice and flood damage persist.',
    ],
    ['#scene-link', 'Continue to the Weftways'],
    [
      '#game-footer',
      'Movement and runoff choices advance 15 seconds of explicit game time.',
    ],
  ]),
  href: '/threefold/?scene=weftways',
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
        'root crossing. Reach either control before pressing E. Once the ' +
        'crossing is set, reach Pell to inspect the optional caravan relay ' +
        'ledger; it records the lost messages without assigning blame. Then ' +
        'visit the marked caravan circle to share it, the knot cache to keep it ' +
        'private, the brazier to destroy it, or the marked repair table to ' +
        'offer replacement relay tokens and route repair. Pell accepts after ' +
        'the bypass or defers terms until root-channel damage is assessed ' +
        'after the quay spill.',
    ],
    ['#scene-link', 'Continue into the Grainlands'],
    [
      '#game-footer',
      'Route choice, physical effects, and optional relay discovery and response persist in this isolated save.',
    ],
  ]),
  href: '/threefold/?scene=grainlands',
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
        'away so the Nursery Clades keep their eggs and crossing.',
    ],
    ['#scene-link', 'Continue to the Silt Margin'],
    [
      '#game-footer',
      'The spider, bridge, and route clock persist in this isolated save.',
    ],
  ]),
  href: '/threefold/?scene=silt-margin',
  ariaLabel: 'Help Iru bait the Grainlands spider away',
  interactionLabel: 'BAIT SPIDER',
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
    ['#scene-link', 'Continue to the Belltops'],
    [
      '#game-footer',
      'City geometry and resident fates persist in the Lantern Ward save.',
    ],
  ]),
  href: '/threefold/?scene=belltops',
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
        'footprint. Orla keeps the tower watch, while stormbirds ride the ' +
        'roofline. A shows the structures and residents at risk; B lets Mara ' +
        'step down to +1.',
    ],
    ['#scene-link', 'Continue to Crownback Reach'],
    [
      '#game-footer',
      'Harbor geometry and resident fates persist in the Belltops save.',
    ],
  ]),
  href: '/threefold/?scene=crownback-reach',
  ariaLabel: 'No district interaction is available',
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
        'Move within reach and press E to meet him; the calf crosses nearby. ' +
        'A previews the root arch, floodwall, and Crownbacks at risk if Mara ' +
        'grows to +4. B steps down to +2.',
    ],
    ['#scene-link', 'Continue to the Shoals'],
    [
      '#game-footer',
      'The meeting, migration ground, and growth outcomes persist in this route’s save.',
    ],
  ]),
  href: '/threefold/?scene=shoals',
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
        'reach and press E to guide it toward the north channel, or use A to ' +
        'grow through the wall and divert the current seaward.',
    ],
    ['#scene-link', 'Return to Crownback Reach'],
    [
      '#game-footer',
      'Wakeform and tide-wall outcomes persist in this route’s isolated save.',
    ],
  ]),
  href: '/threefold/?scene=crownback-reach',
  ariaLabel: 'Guide the Wakeform away when Mara is within reach',
  interactionLabel: 'DIVERT WAKEFORM',
};

/**
 * Start the standalone THREEFOLD handheld page.
 * @param {Record<string, any>} options Injected browser and animation APIs.
 * @returns {() => void} Page lifecycle disposer.
 */
export function startThreefoldPage(options) {
  const scene = options.scene || sceneFromLocation(options.windowObj);
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
  return startMosslightPage({
    ...options,
    ...createMosslightPageEnvironment(options),
    createRuntime: (/** @type {Record<string, any>} */ runtimeOptions) =>
      createThreefoldRuntime({ ...runtimeOptions, storage, scene }),
    drawFrame: (
      /** @type {any} */ context,
      /** @type {Record<string, any>} */ frame
    ) => {
      (options.drawFrame || drawGameFrame)(context, frame);
      renderThreefoldWitnessLedger(
        options.documentObj,
        frame.threefold?.witnessLedger || []
      );
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
  });
}

/**
 * Select the optional small-world region from the standalone route query.
 * @param {any} windowObj Injected browser window.
 * @returns {ReturnType<typeof createThreefoldSluiceScene>|ReturnType<typeof createThreefoldSiltMarginScene>|ReturnType<typeof createThreefoldHearthgapsScene>|ReturnType<typeof createThreefoldWeftwaysScene>|ReturnType<typeof createThreefoldGrainlandsScene>|ReturnType<typeof lanternWard.createThreefoldLanternWardScene>|ReturnType<typeof createThreefoldBelltopsScene>|ReturnType<typeof createThreefoldCrownbackReachScene>|ReturnType<typeof createThreefoldWakeformShoalsScene>|undefined} Authored scene for its route, otherwise the runtime default.
 */
function sceneFromLocation(windowObj) {
  const search = windowObj?.location?.search;
  if (typeof search !== 'string') return undefined;
  const sceneId = new URLSearchParams(search).get('scene');
  if (sceneId === 'sluice') return createThreefoldSluiceScene();
  if (sceneId === 'silt-margin') return createThreefoldSiltMarginScene();
  if (sceneId === 'hearthgaps') return createThreefoldHearthgapsScene();
  if (sceneId === 'weftways') return createThreefoldWeftwaysScene();
  if (sceneId === 'grainlands') return createThreefoldGrainlandsScene();
  if (sceneId === 'lantern-ward')
    return lanternWard.createThreefoldLanternWardScene();
  if (sceneId === 'belltops') return createThreefoldBelltopsScene();
  if (sceneId === 'crownback-reach')
    return createThreefoldCrownbackReachScene();
  if (sceneId === 'shoals') return createThreefoldWakeformShoalsScene();
  return undefined;
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
 * @param {{updates: Array<[string, string]>, href: string, ariaLabel: string, interactionLabel?: string}} copy Route-specific copy and next location.
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
 * @param {{updates: Array<[string, string]>, href: string, ariaLabel: string, interactionLabel?: string}} copy Alternate scene copy and route.
 * @returns {void}
 */
function configureAlternateScenePage(documentObj, copy) {
  const { updates, href, ariaLabel } = copy;
  updates.forEach(([selector, text]) => {
    const element = documentObj?.querySelector?.(selector);
    if (element) element.textContent = text;
  });
  const sceneLink = documentObj?.querySelector?.('#scene-link');
  if (sceneLink) sceneLink.href = href;
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
 * Label the shared scale controls beside a route's E interaction.
 * @param {string} interactionLabel Accessible action name.
 * @returns {Array<[string, string]>} Mosslight page control text.
 */
function createHighWorldInteractionControlUpdates(interactionLabel) {
  return [
    ['#interact-label', `E · ${interactionLabel} · A · GROW · B · SHRINK`],
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
