import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

const THREEFOLD_HTML = readFileSync(
  new URL(
    '../../../../src/content/pages/threefold/index.html',
    import.meta.url
  ),
  'utf8'
);
const THREEFOLD_CSS = readFileSync(
  new URL(
    '../../../../src/content/pages/threefold/styles.css',
    import.meta.url
  ),
  'utf8'
);

const mockStartMosslightPage = jest.fn(() => () => {});
const mockDrawGameFrame = jest.fn();

jest.unstable_mockModule(
  '../../../../src/core/browser/game/mosslight-valley/pagePresenter.js',
  () => ({
    createMosslightPageEnvironment: options => ({
      browser: {
        documentObj: options.documentObj,
        windowObj: options.windowObj,
        navigatorObj: options.navigatorObj,
      },
      animation: {
        requestFrame: options.requestFrame,
        cancelFrame: options.cancelFrame,
      },
    }),
    startMosslightPage: mockStartMosslightPage,
  })
);
jest.unstable_mockModule(
  '../../../../src/core/browser/game/mosslight-valley/renderer.js',
  () => ({
    drawGameFrame: mockDrawGameFrame,
    toFramePayload: jest.fn(() => ({})),
  })
);

const { startThreefoldPage } = await import(
  '../../../../src/core/browser/game/threefold/page.js'
);

describe('THREEFOLD page adapter', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('exposes an accessible touch interaction for each episode choice', () => {
    expect(THREEFOLD_HTML).toContain('data-action="interact"');
    expect(THREEFOLD_HTML).toContain(
      'aria-label="Warn the Latchfolk, rescue ferry passengers, or withdraw up the upland road"'
    );
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=sluice"');
  });

  test('keeps handheld page spacing and touch controls on an eight-pixel grid', () => {
    expect(THREEFOLD_CSS).toContain('--threefold-layout-grid: 8px');
    expect(THREEFOLD_CSS).toContain('grid-template-columns: repeat(3, 40px)');
    expect(THREEFOLD_CSS).toContain(
      'grid-template-columns: repeat(4, minmax(0, 1fr))'
    );
    expect(THREEFOLD_CSS).toContain('grid-template-columns: 120px 112px');
    expect(THREEFOLD_CSS).toContain('transform: none');
    expect(THREEFOLD_HTML).toContain('<details id="witness-ledger"');
    expect(THREEFOLD_HTML).toContain('aria-live="polite"');
    expect(THREEFOLD_HTML).toContain('<details id="testimony"');
    expect(THREEFOLD_HTML).toContain('id="testimony-responsibility"');
  });

  test('renders attributed accounts once and keeps the responsibility open', () => {
    const { documentObj, testimonyList, responsibility } =
      createLedgerDocument();
    startThreefoldPage({
      documentObj,
      windowObj: {},
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const testimony = {
      accounts: [
        {
          speaker: 'Dock worker',
          statement: 'I shouted toward the lower path.',
          evidence: [
            { label: 'Opening callout', text: 'The gate will not hold.' },
          ],
        },
        {
          speaker: 'Latchfolk watchkeeper',
          statement: 'No warning reached my post.',
          evidence: [
            {
              label: 'Watchkeeper account',
              text: 'No warning reached my post.',
            },
          ],
        },
      ],
      responsibility: {
        question: 'Who was responsible for relaying the warning?',
        status: 'unresolved',
      },
    };
    page.drawFrame({}, { threefold: { testimony } });
    const renderedAccounts = testimonyList.children;
    page.drawFrame({}, { threefold: { testimony } });

    const testimonyText = collectText(testimonyList.children);
    expect(testimonyList.children).toBe(renderedAccounts);
    expect(testimonyText).toContain('Dock worker');
    expect(testimonyText).toContain('Latchfolk watchkeeper');
    expect(testimonyText).toContain('Opening callout');
    expect(testimonyText).toContain('Watchkeeper account');
    expect(responsibility.textContent).toBe(
      'Who was responsible for relaying the warning? Status: unresolved.'
    );
  });

  test('renders attributed accounts when the responsibility node is absent', () => {
    const { documentObj, testimonyList } = createLedgerDocument();
    const querySelector = documentObj.querySelector;
    documentObj.querySelector = selector =>
      selector === '#testimony-responsibility' ? null : querySelector(selector);
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(() =>
      page.drawFrame(
        {},
        {
          threefold: {
            testimony: {
              accounts: [
                {
                  speaker: 'Dock worker',
                  statement: 'I shouted toward the lower path.',
                  evidence: [],
                },
              ],
              responsibility: {
                question: 'Who relayed the warning?',
                status: 'unresolved',
              },
            },
          },
        }
      )
    ).not.toThrow();
    expect(collectText(testimonyList.children)).toContain('Dock worker');
  });

  test('updates the accessible witness ledger beside the shared screen', () => {
    const { documentObj, list } = createLedgerDocument();
    const drawFrame = jest.fn();
    startThreefoldPage({
      documentObj,
      windowObj: { localStorage: {} },
      navigatorObj: {},
      drawFrame,
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    page.drawFrame(
      {},
      {
        threefold: {
          witnessLedger: [
            {
              title: 'LATER REPAIR · 9.75 GAME MINUTES',
              intention: 'Repair the relief gate.',
              knowledge: 'Known then: channel flooded.',
              consequence: 'Observed: passengers lost; gate repaired.',
              relation: 'Linked to witness-1.',
            },
            {
              title: 'OBSERVATION · 9 GAME MINUTES',
              intention: 'Wait 5 in-game minutes.',
              knowledge: 'Known then: gate open.',
              consequence: 'Observed: channel flooded.',
              relation: null,
            },
          ],
        },
      }
    );

    expect(drawFrame).toHaveBeenCalledTimes(1);
    expect(list.children).toHaveLength(2);
    expect(collectText(list.children)).toContain(
      'Known then: channel flooded.'
    );
    expect(collectText(list.children)).toContain('Linked to witness-1.');
  });

  test('uses the shared Mosslight renderer and shows the empty ledger state', () => {
    const { documentObj, list } = createLedgerDocument();
    startThreefoldPage({
      documentObj,
      windowObj: {},
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const context = {};
    page.drawFrame(context, {});

    expect(mockDrawGameFrame).toHaveBeenCalledWith(context, {});
    expect(collectText(list.children)).toContain(
      'No gate events recorded yet.'
    );
  });

  test('routes the Silt Margin through the Mosslight page and configures its crossing copy', () => {
    const selectors = [
      '#chapter-subtitle',
      '#chapter-tag',
      '#chapter-eyebrow',
      '#chapter-heading',
      '#chapter-description',
      '#interact-label',
      '#scene-link',
      '#game-footer',
      '#interact-control',
      '#witness-ledger',
      '#testimony',
    ];
    const nodes = new Map(
      selectors.map(selector => [
        selector,
        {
          textContent: '',
          hidden: false,
          href: '',
          setAttribute: jest.fn(),
        },
      ])
    );
    const documentObj = { querySelector: selector => nodes.get(selector) };
    startThreefoldPage({
      documentObj,
      windowObj: { location: { search: '?scene=silt-margin' } },
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const runtime = page.createRuntime({});

    expect(runtime.getState().scene.id).toBe('silt-margin');
    expect(runtime.getState().player.scale).toBe(-4);
    expect(runtime.getSnapshot().world.map.name).toBe('THE SILT MARGIN');
    expect(nodes.get('#chapter-heading').textContent).toContain(
      'Reroute the dew'
    );
    expect(nodes.get('#scene-link')).toMatchObject({
      textContent: 'Return to the Tidal Archive',
      href: '/threefold/?scene=sluice',
    });
    expect(nodes.get('#witness-ledger').hidden).toBe(true);
    expect(nodes.get('#testimony').hidden).toBe(true);
  });

  test('tolerates a document without the witness ledger list', () => {
    const drawFrame = jest.fn();
    startThreefoldPage({
      documentObj: { querySelector: () => null },
      windowObj: {},
      navigatorObj: {},
      drawFrame,
    });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(() => page.drawFrame({}, {})).not.toThrow();
    expect(drawFrame).toHaveBeenCalled();
  });

  test('uses the supplied storage and shared Mosslight page presenter', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const windowObj = { localStorage: storage };
    const options = { documentObj: {}, windowObj, navigatorObj: {} };
    const disposer = startThreefoldPage(options);
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(disposer).toEqual(expect.any(Function));
    expect(page.browser.windowObj).toBe(windowObj);
    expect(page.saveFilename).toBe('threefold-save.json');
    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );
  });

  test('falls back to in-memory storage when the browser denies localStorage', () => {
    const windowObj = Object.defineProperty({}, 'localStorage', {
      get() {
        throw new Error('storage denied');
      },
    });
    startThreefoldPage({ documentObj: {}, windowObj, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().crisis.stage).toBe(
      'rising'
    );
  });

  test('prefers an explicitly supplied storage adapter', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    startThreefoldPage({
      documentObj: {},
      windowObj: {},
      navigatorObj: {},
      storage,
    });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );
  });

  test('selects the standalone sluice route and updates its Mosslight page copy', () => {
    const elements = new Map(
      [
        '#chapter-subtitle',
        '#chapter-tag',
        '#chapter-eyebrow',
        '#chapter-heading',
        '#chapter-description',
        '#interact-label',
        '#scene-link',
        '#game-footer',
        '#interact-control',
        '#witness-ledger',
        '#testimony',
      ].map(selector => [selector, { setAttribute: jest.fn() }])
    );
    const documentObj = {
      querySelector: selector => elements.get(selector),
    };
    const windowObj = {
      location: { search: '?scene=sluice' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    };
    startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const state = page.createRuntime({ env: new Map() }).getState();

    expect(state.scene.id).toBe('small-world-sluice');
    expect(elements.get('#chapter-subtitle').textContent).toBe(
      'The Tidal Archive'
    );
    expect(elements.get('#scene-link').href).toBe(
      '/threefold/?scene=silt-margin'
    );
    expect(elements.get('#interact-control').setAttribute).toHaveBeenCalledWith(
      'aria-label',
      'Operate the sluice service valve'
    );
    expect(elements.get('#witness-ledger').hidden).toBe(true);
    expect(elements.get('#testimony').hidden).toBe(true);
  });

  test('keeps the default page when the route query is different and tolerates missing copy elements', () => {
    startThreefoldPage({
      documentObj: { querySelector: () => null },
      windowObj: { location: { search: '?scene=broken-gate' } },
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );

    mockStartMosslightPage.mockClear();
    startThreefoldPage({
      documentObj: { querySelector: () => null },
      windowObj: { location: { search: '?scene=sluice' } },
      navigatorObj: {},
    });
    const sluicePage = mockStartMosslightPage.mock.calls[0][0];
    expect(
      sluicePage.createRuntime({ env: new Map() }).getState().scene.id
    ).toBe('small-world-sluice');
  });
});

/**
 * Create the minimum DOM surface used by the text-only ledger and testimony renderers.
 * @returns {{documentObj: any, list: {children: any[], replaceChildren: () => void, appendChild: (node: any) => void}, testimonyList: {children: any[], replaceChildren: () => void, appendChild: (node: any) => void}, responsibility: {textContent: string}}} Fake document and lists.
 */
function createLedgerDocument() {
  const list = {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(node) {
      this.children.push(node);
    },
  };
  const testimonyList = {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(node) {
      this.children.push(node);
    },
  };
  const responsibility = { textContent: '' };
  return {
    list,
    testimonyList,
    responsibility,
    documentObj: {
      querySelector: selector => {
        if (selector === '#witness-ledger-entries') return list;
        if (selector === '#testimony-accounts') return testimonyList;
        if (selector === '#testimony-responsibility') return responsibility;
        return null;
      },
      createElement: tag => createFakeNode(tag),
      createTextNode: textContent => ({ textContent }),
    },
  };
}

/**
 * Build a text-only node for the page-presenter regression.
 * @param {string} tag HTML element name.
 * @returns {any} Minimal node adapter.
 */
function createFakeNode(tag) {
  return {
    tag,
    children: [],
    appendChild(node) {
      this.children.push(node);
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
  };
}

/**
 * Gather accessible text from the fake ledger tree.
 * @param {any[]} nodes Tree nodes.
 * @returns {string} Joined text content.
 */
function collectText(nodes) {
  return nodes
    .map(node => `${node.textContent || ''}${collectText(node.children || [])}`)
    .join(' ');
}
