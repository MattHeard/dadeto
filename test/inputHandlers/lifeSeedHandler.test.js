import { describe, it, expect, jest } from '@jest/globals';

jest.unstable_mockModule('../../src/core/browser/browser-core.js', () => ({
  applyBaseCleanupHandlers: jest.fn(),
  hideAndDisable: jest.fn(),
  maybeRemoveTextarea: jest.fn(),
  getInputValue: jest.fn(() => ''),
  parseJsonOrDefault: jest.fn(() => ({})),
  setInputValue: jest.fn(),
}));

jest.unstable_mockModule(
  '../../src/core/browser/inputHandlers/createDendriteHandler.js',
  () => ({
    buildManagedForm: jest.fn((options, buildForm) =>
      buildForm({
        form: { _dispose: jest.fn() },
        disposers: [],
      })
    ),
    wireLabelledField: jest.fn(),
  })
);

const { lifeSeedHandler } = await import(
  '../../src/core/browser/inputHandlers/lifeSeedHandler.js'
);
const browserCore = await import('../../src/core/browser/browser-core.js');
const { buildManagedForm } = await import(
  '../../src/core/browser/inputHandlers/createDendriteHandler.js'
);

describe('lifeSeedHandler', () => {
  it('builds a Conway form and hides the hidden text input', () => {
    const dom = {
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setValue: jest.fn(),
      setPlaceholder: jest.fn(),
      setClassName: jest.fn(),
      getValue: jest.fn(() => ''),
    };
    const container = {};
    const textInput = {};

    lifeSeedHandler(dom, container, textInput);

    expect(browserCore.hideAndDisable).toHaveBeenCalledWith(textInput, dom);
    expect(browserCore.applyBaseCleanupHandlers).toHaveBeenCalledWith({
      container,
      dom,
      extraHandlers: [browserCore.maybeRemoveTextarea],
    });
    expect(buildManagedForm).toHaveBeenCalled();
    expect(browserCore.setInputValue).toHaveBeenCalled();
  });
});
