import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

const THREEFOLD_HTML = readFileSync(
  new URL(
    '../../../../src/content/pages/threefold/index.html',
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

describe('THREEFOLD Weftways page record', () => {
  beforeEach(() => mockStartMosslightPage.mockClear());

  test('renders Pell’s relay ledger as an accessible discovered record', () => {
    const summary = { textContent: 'Threadbound relay ledger' };
    const text = { textContent: '' };
    const disclosureSummary = {
      textContent: 'What Mara shared with the caravan',
    };
    const disclosureText = { textContent: '' };
    const panel = {
      hidden: false,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const disclosurePanel = {
      hidden: false,
      querySelector: selector =>
        selector === 'summary' ? disclosureSummary : null,
    };
    const documentObj = {
      querySelector: selector =>
        selector === '#weftways-relay-record'
          ? panel
          : selector === '#weftways-relay-record-text'
            ? text
            : selector === '#weftways-relay-disclosure'
              ? disclosurePanel
              : selector === '#weftways-relay-disclosure-text'
                ? disclosureText
                : null,
    };
    const windowObj = {
      location: { search: '?scene=weftways' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    };

    expect(THREEFOLD_HTML).toContain(
      '<details id="weftways-relay-record" class="witness-ledger" hidden>'
    );
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-record-text"');
    expect(THREEFOLD_HTML).toContain(
      '<details id="weftways-relay-disclosure" class="witness-ledger" hidden>'
    );
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-disclosure-text"');
    startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    expect(panel.hidden).toBe(true);

    const record = {
      title: 'Threadbound relay ledger',
      text: 'The caravan record leaves Iri’s knowledge unresolved.',
    };
    const disclosure = {
      title: 'What Mara shared with the caravan',
      text: 'Mara shares the record without assigning responsibility.',
    };
    page.drawFrame(
      {},
      {
        threefold: {
          threadboundRelayRecord: record,
          threadboundRelayDisclosure: disclosure,
        },
      }
    );

    expect(mockDrawGameFrame).toHaveBeenCalled();
    expect(panel.hidden).toBe(false);
    expect(summary.textContent).toBe(record.title);
    expect(text.textContent).toBe(record.text);
    expect(disclosurePanel.hidden).toBe(false);
    expect(disclosureSummary.textContent).toBe(disclosure.title);
    expect(disclosureText.textContent).toBe(disclosure.text);

    page.drawFrame(
      {},
      {
        threefold: {
          threadboundRelayRecord: null,
          threadboundRelayDisclosure: null,
        },
      }
    );
    expect(panel.hidden).toBe(true);
    expect(disclosurePanel.hidden).toBe(true);
  });
});
