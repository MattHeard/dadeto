import { createDynamicMudGame } from './game.js';

/**
 * Bind the Dynamic MUD text adventure to a page.
 * @param {{documentObj: any, gameDependencies?: object}} deps Browser document and optional trusted game providers.
 * @returns {() => void} Remove page listeners.
 */
export function startDynamicMudPage({ documentObj, gameDependencies = {} }) {
  const form = documentObj.querySelector('#mud-command-form');
  const input = documentObj.querySelector('#mud-command');
  const transcript = documentObj.querySelector('#mud-transcript');
  const status = documentObj.querySelector('#mud-status');
  const worldReadout = documentObj.querySelector('#mud-world-state');
  if (!form || !input || !transcript || !status || !worldReadout)
    return () => {};

  const game = createDynamicMudGame({
    ...gameDependencies,
    onGenerationStage: stage => {
      status.textContent = {
        proposing: 'The causeway considers the new action…',
        building: 'The causeway tests a safe way to act…',
        validating: 'The action is being checked…',
        'dry-run': 'Trying the action on a private copy…',
        registering: 'The causeway remembers the verified action…',
        executing: 'The action reaches the world…',
      }[stage];
    },
  });
  const render = () => {
    const state = game.getState();
    transcript.replaceChildren(
      ...state.transcript.map(line => {
        const entry = documentObj.createElement('li');
        entry.textContent = line;
        return entry;
      })
    );
    const gate = state.world.nodes.find(node => node.id === 'floodgate');
    worldReadout.textContent = gate?.properties.open
      ? 'FLOODGATE · OPEN'
      : 'FLOODGATE · CLOSED';
  };
  const submit = async (/** @type {{preventDefault: () => void}} */ event) => {
    event.preventDefault();
    const result = await game.run(input.value);
    status.textContent = result.known
      ? 'The causeway answers.'
      : 'That action is not known yet.';
    input.value = '';
    render();
    input.focus();
  };
  form.addEventListener('submit', submit);
  render();
  return () => form.removeEventListener('submit', submit);
}
