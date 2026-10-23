import { jest } from '@jest/globals';
import { createThreefoldWakeformShoalsScene } from '../../../../src/core/browser/game/threefold/wakeform-shoals.js';

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

const { startThreefoldPage } = await import(
  '../../../../src/core/browser/game/threefold/page.js'
);

describe('THREEFOLD Wakeform Shoals page', () => {
  beforeEach(() => mockStartMosslightPage.mockClear());

  test('routes to the offshore +4 intervention and labels the accessible choices', () => {
    const selectors = [
      '#chapter-subtitle',
      '#chapter-tag',
      '#chapter-eyebrow',
      '#chapter-heading',
      '#chapter-description',
      '#interact-label',
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
        { textContent: '', hidden: false, href: '', setAttribute: jest.fn() },
      ])
    );
    startThreefoldPage({
      documentObj: { querySelector: selector => nodes.get(selector) },
      windowObj: { location: { search: '?scene=shoals' } },
      navigatorObj: {},
      scene: createThreefoldWakeformShoalsScene(),
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const runtime = page.createRuntime({});

    expect(runtime.getState().scene.id).toBe('wakeform-shoals');
    expect(runtime.getState().player.scale).toBe(3);
    expect(nodes.get('#chapter-heading').textContent).toContain(
      'break the outer wall'
    );
    expect(nodes.get('#chapter-description').textContent).toContain(
      '148.13 metres'
    );
    expect(nodes.get('#interact-label').textContent).toContain(
      'E · DIVERT WAKEFORM'
    );
    expect(nodes.get('#a-control-label').textContent).toBe('GROW');
    expect(nodes.get('#b-control-label').textContent).toBe('SHRINK');
    expect(nodes.get('#e-control-label').textContent).toBe('DIVERT WAKEFORM');
    expect(nodes.get('#interact-control').hidden).toBe(false);
    expect(nodes.get('#interact-control').setAttribute).toHaveBeenCalledWith(
      'aria-label',
      'Guide the Wakeform away when Mara is within reach'
    );
    expect(nodes.get('#witness-ledger').hidden).toBe(true);
    expect(nodes.get('#testimony').hidden).toBe(true);
  });
});
