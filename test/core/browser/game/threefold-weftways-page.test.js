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
    const concealmentSummary = { textContent: 'What Mara kept private' };
    const concealmentText = { textContent: '' };
    const panel = {
      hidden: false,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const disclosurePanel = {
      hidden: false,
      querySelector: selector =>
        selector === 'summary' ? disclosureSummary : null,
    };
    const concealmentPanel = {
      hidden: false,
      querySelector: selector =>
        selector === 'summary' ? concealmentSummary : null,
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
                : selector === '#weftways-relay-concealment'
                  ? concealmentPanel
                  : selector === '#weftways-relay-concealment-text'
                    ? concealmentText
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
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-concealment"');
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-concealment-text"');
    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });
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

    const concealment = {
      title: 'What Mara kept private',
      text: 'Mara keeps the ledger private and its claims unresolved.',
    };
    page.drawFrame(
      {},
      {
        threefold: {
          threadboundRelayRecord: record,
          threadboundRelayConcealment: concealment,
        },
      }
    );
    expect(concealmentPanel.hidden).toBe(false);
    expect(concealmentSummary.textContent).toBe(concealment.title);
    expect(concealmentText.textContent).toBe(concealment.text);

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
    expect(concealmentPanel.hidden).toBe(true);
  });

  test('shows destruction accessibly without exposing the readable ledger', () => {
    const recordPanel = { hidden: false };
    const summary = { textContent: '' };
    const text = { textContent: '' };
    const destructionPanel = {
      hidden: false,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const elements = new Map([
      ['#weftways-relay-record', recordPanel],
      ['#weftways-relay-record-text', { textContent: '' }],
      ['#weftways-relay-destruction', destructionPanel],
      ['#weftways-relay-destruction-text', text],
    ]);
    const documentObj = {
      querySelector: selector => elements.get(selector),
    };
    const windowObj = {
      location: { search: '?scene=weftways' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    };
    const outcome = {
      title: 'What happened to the Threadbound ledger',
      text: 'Mara destroyed the ledger; its claims remain unresolved.',
    };

    expect(THREEFOLD_HTML).toContain('id="weftways-relay-destruction"');
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-destruction-text"');
    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    page.drawFrame(
      {},
      {
        threefold: {
          threadboundRelayRecord: null,
          threadboundRelayDestruction: outcome,
        },
      }
    );

    expect(recordPanel.hidden).toBe(true);
    expect(destructionPanel.hidden).toBe(false);
    expect(summary.textContent).toBe(outcome.title);
    expect(text.textContent).toBe(outcome.text);
  });

  test('shows the negotiated restitution outcome accessibly', () => {
    const summary = { textContent: '' };
    const text = { textContent: '' };
    const restitutionPanel = {
      hidden: true,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const documentObj = {
      querySelector: selector =>
        selector === '#weftways-relay-restitution'
          ? restitutionPanel
          : selector === '#weftways-relay-restitution-text'
            ? text
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
    const outcome = {
      title: 'Threadbound relay restitution',
      text: 'Mara offers replacement tokens; Pell accepts while responsibility remains unresolved.',
    };

    expect(THREEFOLD_HTML).toContain('id="weftways-relay-restitution"');
    expect(THREEFOLD_HTML).toContain('id="weftways-relay-restitution-text"');
    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    page.drawFrame({}, { threefold: { threadboundRelayRestitution: outcome } });

    expect(restitutionPanel.hidden).toBe(false);
    expect(summary.textContent).toBe(outcome.title);
    expect(text.textContent).toBe(outcome.text);
    page.drawFrame({}, { threefold: { threadboundRelayRestitution: null } });
    expect(restitutionPanel.hidden).toBe(true);
  });

  test('shows Pell’s independent relay notice accessibly after the quay spill', () => {
    const summary = { textContent: '' };
    const text = { textContent: '' };
    const publicationPanel = {
      hidden: true,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const documentObj = {
      querySelector: selector =>
        selector === '#weftways-independent-publication'
          ? publicationPanel
          : selector === '#weftways-independent-publication-text'
            ? text
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
    const publication = {
      title: 'Pell’s independent relay notice',
      text: 'Pell publishes his caravan relay notes after the root crossing floods.',
    };

    expect(THREEFOLD_HTML).toContain('id="weftways-independent-publication"');
    expect(THREEFOLD_HTML).toContain(
      'id="weftways-independent-publication-text"'
    );
    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    expect(publicationPanel.hidden).toBe(true);
    page.drawFrame(
      {},
      { threefold: { threadboundIndependentPublication: publication } }
    );

    expect(publicationPanel.hidden).toBe(false);
    expect(summary.textContent).toBe(publication.title);
    expect(text.textContent).toBe(publication.text);
    page.drawFrame(
      {},
      { threefold: { threadboundIndependentPublication: null } }
    );
    expect(publicationPanel.hidden).toBe(true);
  });

  test('shows Pell’s saved growth death and successor accessibly', () => {
    const summary = { textContent: '' };
    const text = { textContent: '' };
    const outcomePanel = {
      hidden: true,
      querySelector: selector => (selector === 'summary' ? summary : null),
    };
    const documentObj = {
      querySelector: selector =>
        selector === '#weftways-pell-outcome'
          ? outcomePanel
          : selector === '#weftways-pell-outcome-text'
            ? text
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
    const outcome = {
      title: 'Pell’s death and the caravan relay keeper',
      text: 'The relay keeper preserves Pell’s record and carries route offers onward.',
    };

    expect(THREEFOLD_HTML).toContain('id="weftways-pell-outcome"');
    expect(THREEFOLD_HTML).toContain('id="weftways-pell-outcome-text"');
    startThreefoldPage({
      documentObj,
      windowObj,
      navigatorObj: {},
      scene: createThreefoldWeftwaysScene(),
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    expect(outcomePanel.hidden).toBe(true);
    page.drawFrame({}, { threefold: { threadboundPellOutcome: outcome } });

    expect(outcomePanel.hidden).toBe(false);
    expect(summary.textContent).toBe(outcome.title);
    expect(text.textContent).toBe(outcome.text);
    page.drawFrame({}, { threefold: { threadboundPellOutcome: null } });
    expect(outcomePanel.hidden).toBe(true);
  });
});
