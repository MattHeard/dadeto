import { describe, it, expect, jest } from '@jest/globals';

const fieldOptions = [];

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
    wireLabelledField: jest.fn(options => {
      fieldOptions.push(options);
      options.disposers.push(options.handler);
      return options;
    }),
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
  beforeEach(() => {
    fieldOptions.length = 0;
    browserCore.getInputValue.mockReset();
    browserCore.parseJsonOrDefault.mockReset();
    browserCore.getInputValue.mockReturnValue('');
    browserCore.parseJsonOrDefault.mockReturnValue({});
    browserCore.setInputValue.mockClear();
  });

  it('builds the Conway form and wires the field handlers', () => {
    const elements = [];
    const values = new Map([
      ['width', '481.5'],
      ['height', '640'],
      ['cols', '31'],
      ['rows', '17'],
      ['tickSpeedMs', '250'],
      ['cells', '9,8\n10,8\n11,8'],
    ]);
    const dom = {
      createElement: jest.fn(tag => {
        const element = { tag, checked: false, value: '' };
        elements.push(element);
        return element;
      }),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      setPlaceholder: jest.fn((element, value) => {
        element.placeholder = value;
      }),
      setClassName: jest.fn((element, value) => {
        element.className = value;
      }),
      getValue: jest.fn(
        element => values.get(element.label) ?? element.value ?? ''
      ),
    };
    const container = {};
    const textInput = {
      value:
        '{"width":1,"height":2,"cols":3,"rows":4,"tickSpeedMs":5,"cells":[[1,1]],"reset":false}',
    };

    lifeSeedHandler(dom, container, textInput);

    expect(browserCore.hideAndDisable).toHaveBeenCalledWith(textInput, dom);
    expect(browserCore.applyBaseCleanupHandlers).toHaveBeenCalledWith({
      container,
      dom,
      extraHandlers: [browserCore.maybeRemoveTextarea],
    });
    expect(buildManagedForm).toHaveBeenCalled();
    expect(browserCore.setInputValue).toHaveBeenCalled();

    const numberInputs = elements.filter(element => element.type === 'number');
    const textarea = elements.find(element => element.tag === 'textarea');
    const checkbox = elements.find(element => element.type === 'checkbox');

    numberInputs.forEach((element, index) => {
      element.label = ['width', 'height', 'cols', 'rows', 'tickSpeedMs'][index];
    });
    if (textarea) {
      textarea.label = 'cells';
    }

    expect(checkbox).toBeDefined();
    expect(dom.setType).toHaveBeenCalledWith(checkbox, 'checkbox');

    expect(fieldOptions).toHaveLength(7);
    fieldOptions[0].handler();
    fieldOptions[5].handler();
    fieldOptions[6].handler();

    expect(browserCore.setInputValue).toHaveBeenCalled();
  });

  it('normalizes invalid payloads and preserves a reset seed flag', () => {
    browserCore.parseJsonOrDefault.mockReturnValueOnce(null);

    const elements = [];
    const dom = {
      createElement: jest.fn(tag => {
        const element = { tag, checked: false, value: '' };
        elements.push(element);
        return element;
      }),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      setPlaceholder: jest.fn((element, value) => {
        element.placeholder = value;
      }),
      setClassName: jest.fn((element, value) => {
        element.className = value;
      }),
      getValue: jest.fn(() => ''),
    };
    const container = {};
    const textInput = { value: '{"reset":true}' };

    lifeSeedHandler(dom, container, textInput);

    expect(fieldOptions).toHaveLength(7);
    expect(browserCore.setInputValue).toHaveBeenCalled();
  });

  it('starts with reset checked when the parsed payload asks for reset', () => {
    browserCore.getInputValue.mockReturnValueOnce('{"reset":true}');
    browserCore.parseJsonOrDefault.mockReturnValueOnce({ reset: true });

    const elements = [];
    const dom = {
      createElement: jest.fn(tag => {
        const element = { tag, checked: false, value: '' };
        elements.push(element);
        return element;
      }),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      setPlaceholder: jest.fn((element, value) => {
        element.placeholder = value;
      }),
      setClassName: jest.fn((element, value) => {
        element.className = value;
      }),
      getValue: jest.fn(() => ''),
    };
    const container = {};
    const textInput = { value: '{"reset":true}' };

    lifeSeedHandler(dom, container, textInput);

    const checkbox = elements.find(element => element.type === 'checkbox');
    expect(checkbox.checked).toBe(true);
  });

  it('keeps reset set when the checkbox is turned on', () => {
    browserCore.getInputValue.mockReturnValueOnce('{"reset":false}');
    browserCore.parseJsonOrDefault.mockReturnValueOnce({ reset: false });

    const elements = [];
    const dom = {
      createElement: jest.fn(tag => {
        const element = { tag, checked: false, value: '' };
        elements.push(element);
        return element;
      }),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      setPlaceholder: jest.fn((element, value) => {
        element.placeholder = value;
      }),
      setClassName: jest.fn((element, value) => {
        element.className = value;
      }),
      getValue: jest.fn(() => ''),
    };
    const container = {};
    const textInput = { value: '{"reset":false}' };

    lifeSeedHandler(dom, container, textInput);

    const checkbox = elements.find(element => element.type === 'checkbox');
    const resetField = fieldOptions.at(-1);
    checkbox.checked = true;
    resetField.handler();

    expect(browserCore.setInputValue).toHaveBeenCalled();
  });
});
