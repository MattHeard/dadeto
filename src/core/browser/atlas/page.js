import { createAtlasBundleViewer } from './bundleViewer.js';

/** @typedef {'hypotheses'|'evidence'|'experiments'|'relationships'} AtlasCollection */
/** @typedef {Parameters<typeof import('../../interpretability/interpretability.js').importInterpretabilityResearchBundleV2>[1]} AtlasResearchSchemas */
/** @typedef {ReturnType<typeof import('../../interpretability/interpretability.js').importInterpretabilityResearchBundleV2>} AtlasImportResult */
/** @typedef {Extract<AtlasImportResult, {valid: true}>['bundle']} AtlasResearchBundle */
/** @typedef {ReturnType<ReturnType<typeof createAtlasBundleViewer>['getContextPage']>} AtlasContextPage */
/** @typedef {{file: HTMLInputElement, mechanism: HTMLSelectElement, status: HTMLElement, pageStatus: HTMLElement, previous: HTMLButtonElement, next: HTMLButtonElement, warnings: HTMLElement, hypotheses: HTMLElement, evidence: HTMLElement, experiments: HTMLElement, relationships: HTMLElement}} AtlasPageElements */

/** @type {Array<AtlasCollection>} */
const COLLECTIONS = ['hypotheses', 'evidence', 'experiments', 'relationships'];

/**
 * Bind the read-only Atlas viewer to a page using injected DOM and schemas.
 * @param {{documentObj: Document, resolveSchemas: (json: string) => Promise<AtlasResearchSchemas>, pagination?: {pageSize?: number, maxDepth?: number}, createViewer?: typeof createAtlasBundleViewer}} options Browser dependencies and context bounds.
 * @returns {{start: () => void, loadJson: (json: string) => Promise<AtlasImportResult|null>}} Page controller.
 */
export function createAtlasPageController({
  documentObj,
  resolveSchemas,
  pagination = {},
  createViewer = createAtlasBundleViewer,
}) {
  const { pageSize = 20, maxDepth = 3 } = pagination;
  /** @type {AtlasPageElements} */
  const elements = {
    file: /** @type {HTMLInputElement} */ (
      getRequiredElement(documentObj, 'atlas-bundle-file')
    ),
    mechanism: /** @type {HTMLSelectElement} */ (
      getRequiredElement(documentObj, 'atlas-mechanism')
    ),
    status: getRequiredElement(documentObj, 'atlas-status'),
    pageStatus: getRequiredElement(documentObj, 'atlas-page-status'),
    previous: /** @type {HTMLButtonElement} */ (
      getRequiredElement(documentObj, 'atlas-previous')
    ),
    next: /** @type {HTMLButtonElement} */ (
      getRequiredElement(documentObj, 'atlas-next')
    ),
    warnings: getRequiredElement(documentObj, 'atlas-warnings'),
    hypotheses: getRequiredElement(documentObj, 'atlas-hypotheses'),
    evidence: getRequiredElement(documentObj, 'atlas-evidence'),
    experiments: getRequiredElement(documentObj, 'atlas-experiments'),
    relationships: getRequiredElement(documentObj, 'atlas-relationships'),
  };
  /** @type {ReturnType<typeof createAtlasBundleViewer>|null} */
  let viewer = null;
  /** @type {AtlasResearchBundle|null} */
  let bundle = null;
  /** @type {AtlasContextPage|null} */
  let currentPage = null;
  /** @type {Array<{type: 'record'|'edge', id: string}|null>} */
  let pageCursors = [null];
  let pageIndex = 0;
  let requestSequence = 0;
  let started = false;

  /** @returns {void} */
  function resetView() {
    viewer = null;
    bundle = null;
    currentPage = null;
    pageCursors = [null];
    pageIndex = 0;
    elements.mechanism.replaceChildren();
    elements.mechanism.disabled = true;
    elements.previous.disabled = true;
    elements.next.disabled = true;
    elements.pageStatus.textContent = '';
    elements.warnings.replaceChildren();
    COLLECTIONS.forEach(name => elements[name].replaceChildren());
  }

  /**
   * @param {Array<{id?: string, kind?: string}>} mechanisms Mechanisms available in the imported bundle.
   * @returns {void}
   */
  function renderMechanisms(mechanisms) {
    elements.mechanism.replaceChildren();
    mechanisms.forEach(mechanism => {
      const option = documentObj.createElement('option');
      option.value = mechanism.id ?? '';
      option.textContent = `${mechanism.id ?? 'Unknown mechanism'} · ${mechanism.kind ?? 'unknown kind'}`;
      elements.mechanism.append(option);
    });
    elements.mechanism.disabled = mechanisms.length === 0;
  }

  /**
   * @param {Array<{code: string, id?: string}>} warnings Context warnings from the bounded query.
   * @returns {void}
   */
  function renderWarnings(warnings) {
    elements.warnings.replaceChildren();
    if (warnings.length === 0) {
      appendMessage(elements.warnings, 'No context warnings.');
      return;
    }
    const list = documentObj.createElement('ul');
    warnings.forEach(warning => {
      const item = documentObj.createElement('li');
      item.textContent = [warning.code, warning.id].filter(Boolean).join(': ');
      list.append(item);
    });
    elements.warnings.append(list);
  }

  /**
   * @param {Element} container Section for the records.
   * @param {Array<Record<string, any>>} records Records in the current page.
   * @param {AtlasCollection} collection Collection name used for the section.
   * @returns {void}
   */
  function renderRecords(container, records, collection) {
    container.replaceChildren();
    if (records.length === 0) {
      appendMessage(container, `No ${collection} on this context page.`);
      return;
    }
    records.forEach(record => {
      const article = documentObj.createElement('article');
      const heading = documentObj.createElement('h3');
      heading.textContent = record.id ?? collection;
      article.append(heading);
      const summary =
        record.claim ?? record.summary ?? record.kind ?? record.status;
      if (summary) appendMessage(article, String(summary));
      if (collection === 'relationships') {
        appendMessage(
          article,
          `${record.fromId} ${record.relation} ${record.toId}`
        );
      }
      const details = documentObj.createElement('pre');
      details.textContent = JSON.stringify(record, null, 2);
      article.append(details);
      container.append(article);
    });
  }

  /** @returns {AtlasContextPage|null} Current page result. */
  function renderContext() {
    if (!viewer || !bundle || !elements.mechanism.value) return null;
    const page = viewer.getContextPage(
      bundle,
      elements.mechanism.value,
      pageCursors[pageIndex]
    );
    currentPage = page;
    if (!page.valid) {
      elements.status.textContent = `Could not read context: ${errorCodes(page)}.`;
      elements.pageStatus.textContent = '';
      COLLECTIONS.forEach(name => elements[name].replaceChildren());
      elements.warnings.replaceChildren();
      elements.previous.disabled = true;
      elements.next.disabled = true;
      return page;
    }

    COLLECTIONS.forEach(name =>
      renderRecords(elements[name], page[name], name)
    );
    renderWarnings(page.warnings);
    const start = page.items.length === 0 ? 0 : pageIndex * pageSize + 1;
    const end = pageIndex * pageSize + page.items.length;
    elements.pageStatus.textContent = `Context items ${start}–${end} of ${page.totalItems}.`;
    elements.previous.disabled = pageIndex === 0;
    elements.next.disabled = page.nextCursor === null;
    elements.status.textContent = `Showing context for ${page.mechanism.id}.`;
    return page;
  }

  /**
   * Import one selected JSON string after preparing schema dependencies.
   * @param {string} json Selected local bundle text.
   * @param {number} requestId Load generation used to ignore stale reads.
   * @returns {Promise<AtlasImportResult|null>} Import result or null for a stale request.
   */
  async function loadBundleText(json, requestId) {
    try {
      const schemas = await resolveSchemas(json);
      if (requestId !== requestSequence) return null;
      viewer = createViewer({ schemas, pageSize, maxDepth });
      const imported = viewer.importBundle(json);
      if (!imported.valid) {
        resetView();
        elements.status.textContent = `Bundle rejected: ${errorCodes(imported)}.`;
        return imported;
      }
      bundle = imported.bundle;
      const mechanisms = imported.bundle.evidenceGraph.mechanisms ?? [];
      renderMechanisms(mechanisms);
      if (mechanisms.length === 0) {
        elements.status.textContent =
          'Valid bundle; it contains no mechanisms.';
        return imported;
      }
      pageCursors = [null];
      pageIndex = 0;
      renderContext();
      return imported;
    } catch {
      if (requestId !== requestSequence) return null;
      resetView();
      elements.status.textContent = 'Could not validate this local bundle.';
      return /** @type {AtlasImportResult} */ ({
        valid: false,
        errors: [{ code: 'validation-unavailable' }],
      });
    }
  }

  /**
   * Import JSON without sending or persisting it.
   * @param {string} json Portable bundle text.
   * @returns {Promise<AtlasImportResult|null>} Import result or null for a stale read.
   */
  async function loadJson(json) {
    const requestId = ++requestSequence;
    resetView();
    elements.status.textContent = 'Validating bundle in this browser…';
    return loadBundleText(json, requestId);
  }

  /** @returns {Promise<void>} */
  async function loadSelectedFile() {
    const file = elements.file.files?.[0];
    if (!file) return;
    const requestId = ++requestSequence;
    resetView();
    elements.status.textContent = 'Reading and validating the selected file…';
    try {
      const json = await file.text();
      if (requestId === requestSequence) await loadBundleText(json, requestId);
    } catch {
      if (requestId !== requestSequence) return;
      resetView();
      elements.status.textContent = 'Could not read the selected local file.';
    }
  }

  /** @returns {void} */
  function start() {
    if (started) return;
    started = true;
    elements.file.addEventListener('change', () => void loadSelectedFile());
    elements.mechanism.addEventListener('change', () => {
      pageCursors = [null];
      pageIndex = 0;
      renderContext();
    });
    elements.previous.addEventListener('click', () => {
      if (pageIndex === 0) return;
      pageIndex -= 1;
      renderContext();
    });
    elements.next.addEventListener('click', () => {
      if (!currentPage?.valid || !currentPage.nextCursor) return;
      pageCursors = [
        ...pageCursors.slice(0, pageIndex + 1),
        currentPage.nextCursor,
      ];
      pageIndex += 1;
      renderContext();
    });
  }

  return Object.freeze({ start, loadJson });
}

/**
 * Require one static page element by ID.
 * @param {Document} documentObj Page document.
 * @param {string} id Required element ID.
 * @returns {HTMLElement} Page element.
 */
function getRequiredElement(documentObj, id) {
  const element = documentObj.getElementById(id);
  if (!element) throw new Error(`Atlas page is missing #${id}.`);
  return element;
}

/**
 * Append untrusted display text without interpreting it as markup.
 * @param {Element} container Parent element.
 * @param {string} message Display text.
 * @returns {void}
 */
function appendMessage(container, message) {
  const paragraph = container.ownerDocument.createElement('p');
  paragraph.textContent = message;
  container.append(paragraph);
}

/**
 * Format stable validation codes without exposing the uploaded document.
 * @param {{errors?: Array<{code?: string}>}} result Import or query failure.
 * @returns {string} Error codes.
 */
function errorCodes(result) {
  return (
    result.errors
      ?.map(error => error.code)
      .filter(Boolean)
      .join(', ') || 'invalid-bundle'
  );
}
