import {
  createMosslightPageEnvironment,
  startMosslightPage,
} from '../mosslight-valley/pagePresenter.js';
import { createThreefoldRuntime } from './runtime.js';
import { createThreefoldSluiceScene } from './sluice-scene.js';
import { createThreefoldSiltMarginScene } from './silt-margin.js';
import * as lanternWard from './lantern-ward.js';
import { drawGameFrame } from '../mosslight-valley/renderer.js';

const renderedTestimonyByList = new WeakMap();
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
        'cross once the basin reaches its marked level.',
    ],
    ['#interact-label', 'E · OPERATE THE VALVE'],
    ['#scene-link', 'Continue into the Silt Margin'],
    [
      '#game-footer',
      'Water moves only during explicit game actions, never from the browser clock.',
    ],
  ]),
  href: '/threefold/?scene=silt-margin',
  ariaLabel: 'Operate the sluice service valve',
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
        'disrupts the Choir signal. Water and consequences persist in this save.',
    ],
    ['#interact-label', 'E · GUIDE · OPEN VALVE · SEND SIGNAL'],
    ['#scene-link', 'Continue to the Lantern Ward'],
    [
      '#game-footer',
      'Every movement and scale change advances the region clock by 15 game seconds.',
    ],
  ]),
  href: '/threefold/?scene=lantern-ward',
  ariaLabel:
    'Guide the guardian, open the fine valve, or send the Choir signal',
};
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
    ['#interact-label', 'A · GROW · B · SHRINK'],
    ['#a-control-label', 'GROW'],
    ['#b-control-label', 'SHRINK'],
    ['#e-control-label', 'NO DISTRICT ACTION'],
    ['#scene-link', 'Return to the Silt Margin'],
    [
      '#game-footer',
      'City geometry and resident fates persist in the Lantern Ward save.',
    ],
  ]),
  href: '/threefold/?scene=silt-margin',
  ariaLabel: 'No district interaction is available',
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
  else if (scene?.id === lanternWard.THREEFOLD_LANTERN_WARD_SCENE_ID)
    configureLanternWardPage(options.documentObj);
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
    },
    saveFilename: 'threefold-save.json',
  });
}

/**
 * Select the optional small-world region from the standalone route query.
 * @param {any} windowObj Injected browser window.
 * @returns {ReturnType<typeof createThreefoldSluiceScene>|ReturnType<typeof createThreefoldSiltMarginScene>|ReturnType<typeof lanternWard.createThreefoldLanternWardScene>|undefined} Authored scene for its route, otherwise the runtime default.
 */
function sceneFromLocation(windowObj) {
  const search = windowObj?.location?.search;
  if (typeof search !== 'string') return undefined;
  const sceneId = new URLSearchParams(search).get('scene');
  if (sceneId === 'sluice') return createThreefoldSluiceScene();
  if (sceneId === 'silt-margin') return createThreefoldSiltMarginScene();
  if (sceneId === 'lantern-ward')
    return lanternWard.createThreefoldLanternWardScene();
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
 * Replace the default Broken Gate copy with the Lantern Ward district description.
 * @param {any} documentObj Injected browser document.
 * @returns {void}
 */
function configureLanternWardPage(documentObj) {
  configureAlternateScenePage(documentObj, LANTERN_WARD_PAGE_COPY);
  const interactControl = documentObj?.querySelector?.('#interact-control');
  if (interactControl) interactControl.hidden = true;
}

/**
 * Apply route-specific copy and hide Broken Gate-only records.
 * @param {any} documentObj Injected browser document.
 * @param {{updates: Array<[string, string]>, href: string, ariaLabel: string}} copy Alternate scene copy and route.
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
