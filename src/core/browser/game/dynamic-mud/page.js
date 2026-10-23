import { createDynamicMudGame } from './game.js';

/**
 * Bind the Dynamic MUD text adventure to a page.
 * @param {{documentObj: any}} deps Browser document.
 * @returns {() => void} Remove page listeners.
 */
export function startDynamicMudPage({ documentObj }) {
  const form = documentObj.querySelector('#mud-command-form');
  const input = documentObj.querySelector('#mud-command');
  const transcript = documentObj.querySelector('#mud-transcript');
  const status = documentObj.querySelector('#mud-status');
  const worldReadout = documentObj.querySelector('#mud-world-state');
  if (!form || !input || !transcript || !status || !worldReadout)
    return () => {};

  const game = createDynamicMudGame();
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
  const submit = (/** @type {{preventDefault: () => void}} */ event) => {
    event.preventDefault();
    const result = game.run(input.value);
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
