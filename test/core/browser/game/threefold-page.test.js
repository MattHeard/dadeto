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

  test('keeps handheld page spacing and touch controls on an eight-pixel grid', () => {
    expect(THREEFOLD_CSS).toContain('--threefold-layout-grid: 8px');
    expect(THREEFOLD_CSS).toContain('grid-template-columns: repeat(3, 40px)');
    expect(THREEFOLD_CSS).toContain(
      'grid-template-columns: repeat(4, minmax(0, 1fr))'
    );
    expect(THREEFOLD_CSS).toContain('grid-template-columns: 120px 112px');
    expect(THREEFOLD_CSS).toContain('transform: none');
    expect(THREEFOLD_HTML).toContain('<details id="witness-ledger"');
    expect(THREEFOLD_HTML).toContain(
      '<details id="iri-repair-log" class="witness-ledger" hidden>'
    );
    expect(THREEFOLD_HTML).toContain('id="latchfolk-displacement-aid"');
    expect(THREEFOLD_HTML).toContain('id="latchfolk-displacement-aid-text"');
    expect(THREEFOLD_HTML).toContain('id="iri-repair-log-text"');
    expect(THREEFOLD_HTML).toContain('id="campaign-clock-text"');
    expect(THREEFOLD_HTML).toContain(
      '<details id="episode-epilogue" class="witness-ledger" hidden>'
    );
    expect(THREEFOLD_HTML).toContain('id="episode-epilogue-outcomes"');
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

  test('shows the recovered Iri log only when the frame includes a reported clue', () => {
    const { documentObj, iriRepairLog, iriRepairLogText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: "Iri's pressure-regulator log",
      text: 'The surviving log cannot establish what Iri knew.',
    };

    page.drawFrame({}, { threefold: { iriRepairLog: record } });

    expect(iriRepairLog.hidden).toBe(false);
    expect(iriRepairLogText.textContent).toBe(record.text);
    expect(iriRepairLog.summary.textContent).toBe(record.title);
    page.drawFrame({}, { threefold: { iriRepairLog: record } });

    page.drawFrame({}, { threefold: { iriRepairLog: null } });

    expect(iriRepairLog.hidden).toBe(true);
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
      '#iri-repair-log',
      '#silt-margin-quieting-evidence',
      '#episode-epilogue',
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
    expect(nodes.get('#interact-label').textContent).toBe(
      'E · GUIDE · VALVE · SIGNAL · LISTEN'
    );
    expect(nodes.get('#scene-link')).toMatchObject({
      textContent: 'Continue to the Lantern Ward',
      href: '/threefold/?scene=lantern-ward',
    });
    expect(nodes.get('#witness-ledger').hidden).toBe(true);
    expect(nodes.get('#testimony').hidden).toBe(true);
    expect(nodes.get('#iri-repair-log').hidden).toBe(true);
    expect(nodes.get('#silt-margin-quieting-evidence').hidden).toBe(true);
    expect(nodes.get('#episode-epilogue').hidden).toBe(true);
  });

  test('routes the Lantern Ward after the Silt Margin and isolates its controls', () => {
    const selectors = [
      '#chapter-subtitle',
      '#chapter-tag',
      '#chapter-eyebrow',
      '#chapter-heading',
      '#chapter-description',
      '#interact-label',
      '#scene-link',
      '#game-footer',
      '#a-control-label',
      '#b-control-label',
      '#e-control-label',
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
      windowObj: { location: { search: '?scene=lantern-ward' } },
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const runtime = page.createRuntime({});

    expect(runtime.getState().scene.id).toBe('lantern-ward');
    expect(runtime.getState().player.scale).toBe(3);
    expect(runtime.getSnapshot().world.map.name).toBe('LANTERN WARD');
    expect(nodes.get('#chapter-heading').textContent).toContain(
      'At +3, one more rung'
    );
    expect(nodes.get('#chapter-description').textContent).toContain(
      'Mira and Tov'
    );
    expect(nodes.get('#scene-link')).toMatchObject({
      textContent: 'Continue to the Belltops',
      href: '/threefold/?scene=belltops',
    });
    expect(nodes.get('#a-control-label').textContent).toBe('GROW');
    expect(nodes.get('#b-control-label').textContent).toBe('SHRINK');
    expect(nodes.get('#interact-control').hidden).toBe(true);
    expect(nodes.get('#witness-ledger').hidden).toBe(true);
    expect(nodes.get('#testimony').hidden).toBe(true);
    expect(runtime.getState().scene.id).toBe('lantern-ward');

    expect(() =>
      startThreefoldPage({
        documentObj: { querySelector: () => null },
        windowObj: { location: { search: '?scene=lantern-ward' } },
        navigatorObj: {},
      })
    ).not.toThrow();

    startThreefoldPage({
      documentObj,
      windowObj: { location: { search: '?scene=belltops' } },
      navigatorObj: {},
    });
    const belltopsPage = mockStartMosslightPage.mock.calls.at(-1)[0];
    const belltopsRuntime = belltopsPage.createRuntime({});

    expect(belltopsRuntime.getState().scene.id).toBe('belltops');
    expect(belltopsRuntime.getState().player.scale).toBe(2);
    expect(belltopsRuntime.getSnapshot().world.map.name).toBe('BELLTOPS');
    expect(nodes.get('#chapter-description').textContent).toContain('Orla');
    expect(nodes.get('#scene-link')).toMatchObject({
      textContent: 'Continue to Crownback Reach',
      href: '/threefold/?scene=crownback-reach',
    });
    expect(nodes.get('#interact-control').hidden).toBe(true);
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
      'Operate the sluice valve or inspect the far-bank coil register'
    );
    expect(elements.get('#witness-ledger').hidden).toBe(true);
    expect(elements.get('#testimony').hidden).toBe(true);
  });

  test('selects the Hearthgaps route and labels its reachable runoff choice', () => {
    assertHearthgapsRoute();
  });

  test('selects the Weftways route and labels its reachable flow choices', () => {
    assertWeftwaysRoute();
  });

  test('selects Grainlands and labels the Iru spider interaction', () => {
    assertGrainlandsRoute();
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

describe('THREEFOLD campaign places page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('shows elapsed campaign time and hides an empty places index', () => {
    const {
      documentObj,
      campaignPlaces,
      campaignPlacesText,
      campaignClockText,
    } = createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];

    page.drawFrame(
      {},
      {
        threefold: {
          campaignPlaces: [
            { id: 'broken-gate', label: 'Broken Gate', active: true },
            { id: 'silt-margin', label: 'Silt Margin', active: false },
          ],
          campaignClock: { elapsedGameSeconds: 90 },
        },
      }
    );

    expect(campaignPlaces.hidden).toBe(false);
    expect(campaignPlaces.summary.textContent).toBe('Campaign status');
    expect(campaignClockText.textContent).toBe('Campaign elapsed: 0h 1m 30s');
    expect(campaignPlacesText.textContent).toBe(
      'Broken Gate (current) · Silt Margin (saved)'
    );

    page.drawFrame(
      {},
      {
        threefold: {
          campaignPlaces: [
            { id: 'broken-gate', label: 'Broken Gate', active: true },
            { id: 'silt-margin', label: 'Silt Margin', active: false },
          ],
          campaignClock: { elapsedGameSeconds: 90 },
        },
      }
    );

    page.drawFrame(
      {},
      {
        threefold: {
          campaignPlaces: [
            { id: 'broken-gate', label: 'Broken Gate', active: true },
          ],
          campaignClock: { elapsedGameSeconds: Number.NaN },
        },
      }
    );
    expect(campaignPlaces.hidden).toBe(true);
  });
});

describe('THREEFOLD Silt Margin evidence page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('shows Neme’s Quieting trace as an accessible disclosure only when heard', () => {
    const { documentObj, siltMarginQuietingEvidence, siltMarginEvidenceText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Neme’s translated Choir trace',
      text: 'Downstream replies stopped after the emergency bypass.',
    };

    page.drawFrame({}, { threefold: { siltMarginQuietingEvidence: record } });

    expect(siltMarginQuietingEvidence.hidden).toBe(false);
    expect(siltMarginQuietingEvidence.summary.textContent).toBe(record.title);
    expect(siltMarginEvidenceText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { siltMarginQuietingEvidence: null } });
    expect(siltMarginQuietingEvidence.hidden).toBe(true);
  });

  test('shows the Tidal Archive trace as an accessible disclosure only when found', () => {
    const { documentObj, tidalArchiveQuietingTrace, tidalArchiveTraceText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Tidal Archive coil register',
      text: 'Downstream replies stopped after the emergency bypass.',
    };

    page.drawFrame({}, { threefold: { archiveQuietingTrace: record } });

    expect(tidalArchiveQuietingTrace.hidden).toBe(false);
    expect(tidalArchiveQuietingTrace.summary.textContent).toBe(record.title);
    expect(tidalArchiveTraceText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { archiveQuietingTrace: null } });
    expect(tidalArchiveQuietingTrace.hidden).toBe(true);
  });
});

describe('THREEFOLD standalone markup', () => {
  test('exposes accessible touch interactions and route links', () => {
    expect(THREEFOLD_HTML).toContain('data-action="interact"');
    expect(THREEFOLD_HTML).toContain(
      'aria-label="Warn the Latchfolk, rescue ferry passengers, or withdraw up the upland road"'
    );
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=sluice"');
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=hearthgaps"');
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=weftways"');
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=grainlands"');
    expect(THREEFOLD_HTML).toContain('id="silt-margin-quieting-evidence"');
    expect(THREEFOLD_HTML).toContain('id="silt-margin-quieting-evidence-text"');
  });
});

describe('THREEFOLD closure epilogue page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('renders each closure epilogue once and hides it for an open episode', () => {
    const { documentObj, episodeEpilogue, episodeEpilogueList } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const epilogue = {
      title: 'Departure',
      paragraphs: [
        'Mara leaves by the upland road without filing a report.',
        'Passenger outcome: passengers safe.',
        'Latchfolk outcome: safe.',
      ],
    };

    page.drawFrame({}, { threefold: { episodeEpilogue: epilogue } });
    const renderedOutcomes = episodeEpilogueList.children;
    page.drawFrame({}, { threefold: { episodeEpilogue: epilogue } });

    expect(episodeEpilogue.hidden).toBe(false);
    expect(episodeEpilogue.summary.textContent).toBe(epilogue.title);
    expect(episodeEpilogueList.children).toBe(renderedOutcomes);
    expect(collectText(episodeEpilogueList.children)).toContain(
      'Passenger outcome: passengers safe.'
    );

    page.drawFrame(
      {},
      {
        threefold: {
          episodeEpilogue: {
            ...epilogue,
            title: 'Report filed',
            paragraphs: [
              ...epilogue.paragraphs,
              'The lower channel stays dry.',
            ],
          },
        },
      }
    );

    expect(episodeEpilogue.summary.textContent).toBe('Report filed');
    expect(episodeEpilogueList.children).toHaveLength(4);

    episodeEpilogue.querySelector = () => null;
    page.drawFrame(
      {},
      {
        threefold: {
          episodeEpilogue: {
            ...epilogue,
            paragraphs: [
              ...epilogue.paragraphs,
              'Floodwater remains in the lower channel after the storm.',
            ],
          },
        },
      }
    );
    expect(episodeEpilogueList.children).toHaveLength(4);

    page.drawFrame({}, { threefold: { episodeEpilogue: null } });

    expect(episodeEpilogue.hidden).toBe(true);
    expect(episodeEpilogueList.children).toHaveLength(0);
  });

  test('shows the Latchfolk request in the accessible report epilogue', () => {
    const { documentObj, episodeEpilogueList } = createLedgerDocument();
    const response =
      'The report carries Iri’s account to the surviving Latchfolk watchkeeper. They ask for the downstream relay stations to be traced before responsibility is assigned; the final sender and missed warnings remain unknown.';
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];

    page.drawFrame(
      {},
      {
        threefold: {
          episodeEpilogue: { title: 'Report filed', paragraphs: [response] },
        },
      }
    );

    expect(collectText(episodeEpilogueList.children)).toContain(response);
  });

  test('shows a saved ferry memorial in an accessible page record', () => {
    const { documentObj, harborMemorial, harborMemorialText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Harrowfen ferry memorial',
      text: 'The Belltops harbor bell marks the ferry lost in the surge.',
    };

    page.drawFrame({}, { threefold: { harborMemorial: record } });

    expect(harborMemorial.hidden).toBe(false);
    expect(harborMemorial.summary.textContent).toBe(record.title);
    expect(harborMemorialText.textContent).toContain('lost in the surge');

    page.drawFrame({}, { threefold: { harborMemorial: null } });
    expect(harborMemorial.hidden).toBe(true);
  });

  test("shows Orla's outcome-specific response in an accessible page record", () => {
    const { documentObj, orlaHarborResponse, orlaHarborResponseText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: "Orla's harbor response",
      text: 'Orla keeps her trust provisional after the partial ferry loss.',
    };

    page.drawFrame({}, { threefold: { orlaHarborResponse: record } });

    expect(orlaHarborResponse.hidden).toBe(false);
    expect(orlaHarborResponse.summary.textContent).toBe(record.title);
    expect(orlaHarborResponseText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { orlaHarborResponse: null } });
    expect(orlaHarborResponse.hidden).toBe(true);
  });

  test('shows ferry engineer availability in an accessible page record', () => {
    const { documentObj, harborEngineerAvailability, harborEngineerText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Harbor engineering support',
      text: 'The ferry engineer is available to advise the harbor crew.',
    };

    page.drawFrame({}, { threefold: { harborEngineerAvailability: record } });

    expect(harborEngineerAvailability.hidden).toBe(false);
    expect(harborEngineerAvailability.summary.textContent).toBe(record.title);
    expect(harborEngineerText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { harborEngineerAvailability: null } });
    expect(harborEngineerAvailability.hidden).toBe(true);
  });
});

describe('THREEFOLD witness lead page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('shows the watchkeeper relay lead only after the frame records it', () => {
    const { documentObj, iriWitnessLead, iriWitnessLeadText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: "The Watchkeeper's relay account",
      text: 'The caller asked for Iri, but the source remains unknown.',
    };

    page.drawFrame({}, { threefold: { iriWitnessLead: record } });
    page.drawFrame({}, { threefold: { iriWitnessLead: record } });

    expect(iriWitnessLead.hidden).toBe(false);
    expect(iriWitnessLead.summary.textContent).toBe(record.title);
    expect(iriWitnessLeadText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { iriWitnessLead: null } });

    expect(iriWitnessLead.hidden).toBe(true);
  });
});

describe('THREEFOLD ferry search page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('shows the saved wreck search as an accessible disclosure', () => {
    const { documentObj, ferryWreckSearch, ferryWreckSearchText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Ferry wreck search',
      text: 'One passenger group reached shore; the other was lost.',
    };

    page.drawFrame({}, { threefold: { ferryWreckSearch: record } });

    expect(ferryWreckSearch.hidden).toBe(false);
    expect(ferryWreckSearch.summary.textContent).toBe(record.title);
    expect(ferryWreckSearchText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { ferryWreckSearch: null } });

    expect(ferryWreckSearch.hidden).toBe(true);
  });
});

describe('THREEFOLD displaced Latchfolk aid page', () => {
  beforeEach(() => {
    mockStartMosslightPage.mockClear();
    mockDrawGameFrame.mockClear();
  });

  test('shows the saved aid as an accessible disclosure', () => {
    const { documentObj, latchfolkAid, latchfolkAidText } =
      createLedgerDocument();
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const record = {
      title: 'Help for displaced Latchfolk',
      text: 'Mara and the watchkeeper help arrange temporary shelter.',
    };

    page.drawFrame({}, { threefold: { latchfolkAid: record } });

    expect(latchfolkAid.hidden).toBe(false);
    expect(latchfolkAid.summary.textContent).toBe(record.title);
    expect(latchfolkAidText.textContent).toBe(record.text);

    page.drawFrame({}, { threefold: { latchfolkAid: null } });

    expect(latchfolkAid.hidden).toBe(true);
  });
});

/** Verify the route query, page copy, action label, and authored spawn together. */
function assertHearthgapsRoute() {
  const selectors = [
    '#chapter-subtitle',
    '#chapter-tag',
    '#chapter-eyebrow',
    '#chapter-heading',
    '#chapter-description',
    '#interact-label',
    '#a-control-label',
    '#b-control-label',
    '#e-control-label',
    '#scene-link',
    '#game-footer',
    '#interact-control',
    '#witness-ledger',
    '#testimony',
    '#weftways-relay-record',
    '#hearthgaps-entry',
    '#weftways-entry',
    '#grainlands-entry',
  ];
  const elements = new Map(
    selectors.map(selector => [selector, { setAttribute: jest.fn() }])
  );
  const documentObj = { querySelector: selector => elements.get(selector) };
  const windowObj = {
    location: { search: '?scene=hearthgaps' },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  };
  startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
  const page = mockStartMosslightPage.mock.calls[0][0];
  const state = page.createRuntime({ env: new Map() }).getState();

  expect(state.scene.id).toBe('hearthgaps');
  expect(state.player.scale).toBe(-1);
  expect(elements.get('#chapter-subtitle').textContent).toBe('Hearthgaps');
  expect(elements.get('#chapter-description').textContent).toContain(
    'downstream settlement'
  );
  expect(elements.get('#scene-link').href).toBe('/threefold/?scene=weftways');
  expect(elements.get('#e-control-label').textContent).toBe('CHOOSE RUNOFF');
  expect(elements.get('#interact-control').setAttribute).toHaveBeenCalledWith(
    'aria-label',
    'Choose the Brin diversion or shared runoff bypass'
  );
  expect(elements.get('#hearthgaps-entry').hidden).toBe(true);
  expect(elements.get('#weftways-entry').hidden).toBe(true);
  expect(elements.get('#grainlands-entry').hidden).toBe(true);
}

/** Verify the Weftways query, route copy, control label, and authored scale. */
function assertWeftwaysRoute() {
  const selectors = [
    '#chapter-subtitle',
    '#chapter-tag',
    '#chapter-eyebrow',
    '#chapter-heading',
    '#chapter-description',
    '#interact-label',
    '#a-control-label',
    '#b-control-label',
    '#e-control-label',
    '#scene-link',
    '#game-footer',
    '#interact-control',
    '#witness-ledger',
    '#testimony',
    '#weftways-relay-record',
    '#weftways-relay-destruction',
    '#weftways-relay-restitution',
    '#hearthgaps-entry',
    '#weftways-entry',
    '#grainlands-entry',
  ];
  const elements = new Map(
    selectors.map(selector => [selector, { setAttribute: jest.fn() }])
  );
  const documentObj = { querySelector: selector => elements.get(selector) };
  const windowObj = {
    location: { search: '?scene=weftways' },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  };
  startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
  const page = mockStartMosslightPage.mock.calls[0][0];
  const state = page.createRuntime({ env: new Map() }).getState();

  expect(state.scene.id).toBe('weftways');
  expect(state.player.scale).toBe(-2);
  expect(elements.get('#chapter-subtitle').textContent).toBe('Weftways');
  expect(elements.get('#chapter-description').textContent).toContain(
    'protects the deep roots'
  );
  expect(elements.get('#scene-link').href).toBe('/threefold/?scene=grainlands');
  expect(elements.get('#e-control-label').textContent).toBe(
    'CHOOSE · READ · SHARE · REPAIR · PRIVATE · DESTROY'
  );
  expect(elements.get('#interact-control').setAttribute).toHaveBeenCalledWith(
    'aria-label',
    'Choose a water route, inspect Pell’s relay ledger, then share it at the caravan circle, negotiate repairs at the marked table, keep it private at the knot cache, or destroy it at the brazier'
  );
  expect(elements.get('#weftways-relay-record').hidden).toBe(true);
  expect(elements.get('#weftways-relay-restitution').hidden).toBe(true);
  expect(elements.get('#hearthgaps-entry').hidden).toBe(true);
  expect(elements.get('#weftways-entry').hidden).toBe(true);
  expect(elements.get('#grainlands-entry').hidden).toBe(true);
}

/** Verify the Grainlands route query, authored scale, and nursery story copy. */
function assertGrainlandsRoute() {
  const selectors = [
    '#chapter-subtitle',
    '#chapter-tag',
    '#chapter-eyebrow',
    '#chapter-heading',
    '#chapter-description',
    '#interact-label',
    '#a-control-label',
    '#b-control-label',
    '#e-control-label',
    '#scene-link',
    '#game-footer',
    '#interact-control',
    '#witness-ledger',
    '#testimony',
    '#hearthgaps-entry',
    '#weftways-entry',
    '#grainlands-entry',
  ];
  const elements = new Map(
    selectors.map(selector => [selector, { setAttribute: jest.fn() }])
  );
  const documentObj = { querySelector: selector => elements.get(selector) };
  const windowObj = {
    location: { search: '?scene=grainlands' },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  };
  startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
  const page = mockStartMosslightPage.mock.calls[0][0];
  const state = page.createRuntime({ env: new Map() }).getState();

  expect(state.scene.id).toBe('grainlands');
  expect(state.player.scale).toBe(-3);
  expect(elements.get('#chapter-subtitle').textContent).toBe('Grainlands');
  expect(elements.get('#chapter-description').textContent).toContain(
    'overpower it and break the Threadbound bridge'
  );
  expect(elements.get('#scene-link').href).toBe(
    '/threefold/?scene=silt-margin'
  );
  expect(elements.get('#e-control-label').textContent).toBe('BAIT SPIDER');
  expect(elements.get('#interact-control').setAttribute).toHaveBeenCalledWith(
    'aria-label',
    'Help Iru bait the Grainlands spider away'
  );
  expect(elements.get('#hearthgaps-entry').hidden).toBe(true);
  expect(elements.get('#weftways-entry').hidden).toBe(true);
  expect(elements.get('#grainlands-entry').hidden).toBe(true);
}

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
  const campaignPlacesText = { textContent: '' };
  const campaignClockText = { textContent: '' };
  const campaignPlaces = {
    hidden: true,
    summary: { textContent: 'Old campaign places' },
    querySelector: selector =>
      selector === 'summary' ? campaignPlaces.summary : null,
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
  const iriRepairLogText = { textContent: '' };
  const iriRepairLog = {
    hidden: true,
    summary: { textContent: 'Old pressure regulator log' },
    querySelector: selector =>
      selector === 'summary' ? iriRepairLog.summary : null,
  };
  const iriWitnessLeadText = { textContent: '' };
  const iriWitnessLead = {
    hidden: true,
    summary: { textContent: 'Old watchkeeper account' },
    querySelector: selector =>
      selector === 'summary' ? iriWitnessLead.summary : null,
  };
  const harborMemorialText = { textContent: '' };
  const harborMemorial = {
    hidden: true,
    summary: { textContent: 'Old ferry memorial' },
    querySelector: selector =>
      selector === 'summary' ? harborMemorial.summary : null,
  };
  const orlaHarborResponseText = { textContent: '' };
  const orlaHarborResponse = {
    hidden: true,
    summary: { textContent: 'Old harbor response' },
    querySelector: selector =>
      selector === 'summary' ? orlaHarborResponse.summary : null,
  };
  const harborEngineerText = { textContent: '' };
  const harborEngineerAvailability = {
    hidden: true,
    summary: { textContent: 'Old engineer availability' },
    querySelector: selector =>
      selector === 'summary' ? harborEngineerAvailability.summary : null,
  };
  const ferryWreckSearchText = { textContent: '' };
  const ferryWreckSearch = {
    hidden: true,
    summary: { textContent: 'Old ferry search' },
    querySelector: selector =>
      selector === 'summary' ? ferryWreckSearch.summary : null,
  };
  const latchfolkAidText = { textContent: '' };
  const latchfolkAid = {
    hidden: true,
    summary: { textContent: 'Old Latchfolk aid' },
    querySelector: selector =>
      selector === 'summary' ? latchfolkAid.summary : null,
  };
  const siltMarginEvidenceText = { textContent: '' };
  const siltMarginQuietingEvidence = {
    hidden: true,
    summary: { textContent: 'Old Choir trace' },
    querySelector: selector =>
      selector === 'summary' ? siltMarginQuietingEvidence.summary : null,
  };
  const tidalArchiveTraceText = { textContent: '' };
  const tidalArchiveQuietingTrace = {
    hidden: true,
    summary: { textContent: 'Old Tidal Archive trace' },
    querySelector: selector =>
      selector === 'summary' ? tidalArchiveQuietingTrace.summary : null,
  };
  const episodeEpilogueList = {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(node) {
      this.children.push(node);
    },
  };
  const episodeEpilogue = {
    hidden: true,
    summary: { textContent: 'After the Broken Gate' },
    querySelector: selector =>
      selector === 'summary' ? episodeEpilogue.summary : null,
  };
  return {
    list,
    campaignPlaces,
    campaignPlacesText,
    campaignClockText,
    testimonyList,
    responsibility,
    iriRepairLog,
    iriRepairLogText,
    iriWitnessLead,
    iriWitnessLeadText,
    harborMemorial,
    harborMemorialText,
    orlaHarborResponse,
    orlaHarborResponseText,
    harborEngineerAvailability,
    harborEngineerText,
    ferryWreckSearch,
    ferryWreckSearchText,
    latchfolkAid,
    latchfolkAidText,
    siltMarginQuietingEvidence,
    siltMarginEvidenceText,
    tidalArchiveQuietingTrace,
    tidalArchiveTraceText,
    episodeEpilogue,
    episodeEpilogueList,
    documentObj: {
      querySelector: selector => {
        if (selector === '#witness-ledger-entries') return list;
        if (selector === '#campaign-places') return campaignPlaces;
        if (selector === '#campaign-places-text') return campaignPlacesText;
        if (selector === '#campaign-clock-text') return campaignClockText;
        if (selector === '#testimony-accounts') return testimonyList;
        if (selector === '#testimony-responsibility') return responsibility;
        if (selector === '#iri-repair-log') return iriRepairLog;
        if (selector === '#iri-repair-log-text') return iriRepairLogText;
        if (selector === '#iri-witness-lead') return iriWitnessLead;
        if (selector === '#iri-witness-lead-text') return iriWitnessLeadText;
        if (selector === '#harbor-memorial') return harborMemorial;
        if (selector === '#harbor-memorial-text') return harborMemorialText;
        if (selector === '#belltops-watch-response') return orlaHarborResponse;
        if (selector === '#belltops-watch-response-text')
          return orlaHarborResponseText;
        if (selector === '#harbor-engineer-availability')
          return harborEngineerAvailability;
        if (selector === '#harbor-engineer-availability-text')
          return harborEngineerText;
        if (selector === '#ferry-wreck-search') return ferryWreckSearch;
        if (selector === '#ferry-wreck-search-text')
          return ferryWreckSearchText;
        if (selector === '#latchfolk-displacement-aid') return latchfolkAid;
        if (selector === '#latchfolk-displacement-aid-text')
          return latchfolkAidText;
        if (selector === '#silt-margin-quieting-evidence')
          return siltMarginQuietingEvidence;
        if (selector === '#silt-margin-quieting-evidence-text')
          return siltMarginEvidenceText;
        if (selector === '#tidal-archive-quieting-trace')
          return tidalArchiveQuietingTrace;
        if (selector === '#tidal-archive-quieting-trace-text')
          return tidalArchiveTraceText;
        if (selector === '#episode-epilogue') return episodeEpilogue;
        if (selector === '#episode-epilogue-outcomes')
          return episodeEpilogueList;
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
