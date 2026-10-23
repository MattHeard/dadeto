import { jest } from '@jest/globals';
import { startDynamicMudPage } from '../../../../src/core/browser/game/dynamic-mud/page.js';

/**
 * @returns {{documentObj: object, form: object, input: object, transcript: object, status: object, worldReadout: object, listeners: Map<string, Function>}} Test page harness.
 */
function createHarness() {
  const listeners = new Map();
  const form = {
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: type => listeners.delete(type),
  };
  const input = { value: '', focus: jest.fn() };
  const transcript = { replaceChildren: jest.fn() };
  const status = { textContent: '' };
  const worldReadout = { textContent: '' };
  const documentObj = {
    querySelector: selector =>
      ({
        '#mud-command-form': form,
        '#mud-command': input,
        '#mud-transcript': transcript,
        '#mud-status': status,
        '#mud-world-state': worldReadout,
      })[selector] || null,
    createElement: tag => ({ tagName: tag, textContent: '' }),
  };
  return {
    documentObj,
    form,
    input,
    transcript,
    status,
    worldReadout,
    listeners,
  };
}

describe('Dynamic MUD page adapter', () => {
  test('renders and handles a known command without a provider', () => {
    const harness = createHarness();
    const dispose = startDynamicMudPage(harness);
    expect(harness.transcript.replaceChildren).toHaveBeenCalledTimes(1);
    expect(harness.worldReadout.textContent).toBe('FLOODGATE · CLOSED');

    harness.input.value = 'turn into a bird';
    harness.listeners.get('submit')({ preventDefault: jest.fn() });
    expect(harness.status.textContent).toBe('That action is not known yet.');

    harness.input.value = 'ring the bell';
    const event = { preventDefault: jest.fn() };
    harness.listeners.get('submit')(event);

    harness.input.value = 'open the floodgate';
    harness.listeners.get('submit')({ preventDefault: jest.fn() });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(harness.status.textContent).toBe('The causeway answers.');
    expect(harness.worldReadout.textContent).toBe('FLOODGATE · OPEN');
    expect(harness.input.value).toBe('');
    expect(harness.input.focus).toHaveBeenCalledTimes(3);
    expect(harness.transcript.replaceChildren).toHaveBeenCalledTimes(4);
    dispose();
    expect(harness.listeners.has('submit')).toBe(false);
  });

  test('gracefully skips binding when a required page element is missing', () => {
    expect(
      startDynamicMudPage({ documentObj: { querySelector: () => null } })
    ).toEqual(expect.any(Function));
  });
});
