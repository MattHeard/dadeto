import { jest } from '@jest/globals';
import { executeMudProgram } from '../../../../src/core/browser/game/dynamic-mud/dynamicMud.js';
import { startDynamicMudPage } from '../../../../src/core/browser/game/dynamic-mud/page.js';

const OPEN_GATE_PROGRAM = {
  version: 1,
  operations: [
    { kind: 'setProperty', id: 'floodgate', property: 'open', value: true },
    { kind: 'output', text: 'A newly understood action opens the gate.' },
  ],
};

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
  test('renders and handles commands without a provider', async () => {
    const harness = createHarness();
    const dispose = startDynamicMudPage(harness);
    expect(harness.transcript.replaceChildren).toHaveBeenCalledTimes(1);
    expect(harness.worldReadout.textContent).toBe('FLOODGATE · CLOSED');

    harness.input.value = 'turn into a bird';
    await harness.listeners.get('submit')({ preventDefault: jest.fn() });
    expect(harness.status.textContent).toBe('That action is not known yet.');

    harness.input.value = 'ring the bell';
    const event = { preventDefault: jest.fn() };
    await harness.listeners.get('submit')(event);

    harness.input.value = 'open the floodgate';
    await harness.listeners.get('submit')({ preventDefault: jest.fn() });

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
    const dispose = startDynamicMudPage({
      documentObj: { querySelector: () => null },
    });

    expect(dispose).toEqual(expect.any(Function));
    dispose();
  });

  test('shows a progress acknowledgement while an unknown command is proposed', async () => {
    const harness = createHarness();
    let finishProposal;
    startDynamicMudPage({
      ...harness,
      gameDependencies: {
        proposeCommand: ({ world }) =>
          new Promise(resolve => {
            finishProposal = () => {
              const preview = executeMudProgram(world, OPEN_GATE_PROGRAM);
              resolve({
                intent: 'Open the gate.',
                predictedWorld: preview.world,
              });
            };
          }),
        buildProgram: async () => OPEN_GATE_PROGRAM,
      },
    });
    harness.input.value = 'lift the gate';

    const pending = harness.listeners.get('submit')({
      preventDefault: jest.fn(),
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.status.textContent).toBe(
      'The causeway considers the new action…'
    );

    finishProposal();
    await pending;
    expect(harness.status.textContent).toBe('The causeway answers.');
    expect(harness.worldReadout.textContent).toBe('FLOODGATE · OPEN');
  });
});
