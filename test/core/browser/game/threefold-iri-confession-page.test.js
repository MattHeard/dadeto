import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createThreefoldWeftwaysScene } from '../../../../src/core/browser/game/threefold/weftways.js';

const THREEFOLD_HTML = readFileSync(
  new URL(
    '../../../../src/content/pages/threefold/index.html',
    import.meta.url
  ),
  'utf8'
);
const mockStartMosslightPage = jest.fn(() => () => {});

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
    drawGameFrame: jest.fn(),
    toFramePayload: jest.fn(() => ({})),
  })
);

const { startThreefoldPage } = await import(
  '../../../../src/core/browser/game/threefold/page.js'
);

describe('THREEFOLD Iri confession page', () => {
  beforeEach(() => mockStartMosslightPage.mockClear());

  test('renders the confession as an accessible disclosure', () => {
    const elements = createConfessionElements();
    const documentObj = { querySelector: selector => elements.get(selector) };
    const record = {
      title: "Iri's recorded confession",
      text: 'Iri suspected the downstream danger and concealed the uncertainty.',
    };

    expect(THREEFOLD_HTML).toContain(
      '<details id="iri-recorded-confession" class="witness-ledger" hidden>'
    );
    expect(THREEFOLD_HTML).toContain('id="iri-recorded-confession-text"');
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    page.drawFrame({}, { threefold: { iriRecordedConfession: record } });

    expect(elements.get('#iri-recorded-confession').hidden).toBe(false);
    expect(elements.get('#iri-recorded-confession').summary.textContent).toBe(
      record.title
    );
    expect(elements.get('#iri-recorded-confession-text').textContent).toBe(
      record.text
    );

    page.drawFrame({}, { threefold: { iriRecordedConfession: null } });
    expect(elements.get('#iri-recorded-confession').hidden).toBe(true);
  });

  test('hides a confession disclosure in an alternate scene', () => {
    const elements = createConfessionElements();
    const documentObj = { querySelector: selector => elements.get(selector) };
    const windowObj = {
      localStorage: { getItem: () => null, setItem: () => {} },
    };
    elements.get('#iri-recorded-confession').hidden = false;

    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });

    expect(elements.get('#iri-recorded-confession').hidden).toBe(true);
  });

  test('configures an alternate scene when disclosure nodes are absent', () => {
    const documentObj = { querySelector: () => null };
    const windowObj = {
      localStorage: { getItem: () => null, setItem: () => {} },
    };

    expect(() =>
      startThreefoldPage({
        documentObj,
        windowObj,
        navigatorObj: {},
        scene: createThreefoldWeftwaysScene(),
      })
    ).not.toThrow();
  });
});

/**
 * Build the minimal accessible disclosure nodes used by the page adapter.
 * @returns {Map<string, any>} Confession panel and text nodes by selector.
 */
function createConfessionElements() {
  const summary = { textContent: 'Old Iri confession' };
  return new Map([
    [
      '#iri-recorded-confession',
      {
        hidden: true,
        summary,
        querySelector: selector => (selector === 'summary' ? summary : null),
      },
    ],
    ['#iri-recorded-confession-text', { textContent: '' }],
  ]);
}
