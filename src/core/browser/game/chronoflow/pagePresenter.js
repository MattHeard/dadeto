import {
  advanceChronoflow,
  createChronoflowGame,
  openSluice,
  resetChronoflow,
} from './runtime.js';

/**
 * Start the Chronoflow page using injected DOM elements.
 * @param {{documentObj: Document, grid: HTMLElement, status: HTMLElement, clockStatus: HTMLElement, openButton: HTMLButtonElement, advanceButton: HTMLButtonElement, resetButton: HTMLButtonElement}} options Page DOM boundary.
 * @returns {() => void} Removes registered controls.
 */
export function startChronoflowPage(options) {
  const {
    documentObj,
    grid,
    status,
    clockStatus,
    openButton,
    advanceButton,
    resetButton,
  } = options;
  let game = createChronoflowGame();

  const render = () => {
    grid.replaceChildren(
      ...game.fluid.volume.map((volume, cell) => {
        const tile = documentObj.createElement('button');
        const isGate = cell === 13;
        const isTarget = cell === game.targetCell;
        const isSource = cell === 1;
        tile.type = 'button';
        tile.className = 'chronoflow-cell';
        tile.dataset.cell = String(cell);
        tile.dataset.solid = String(game.fluid.solids[cell]);
        tile.dataset.gate = String(isGate);
        tile.dataset.target = String(isTarget);
        tile.style.setProperty('--water-level', String(volume));
        tile.textContent = isSource
          ? 'SOURCE'
          : isGate
            ? game.gateOpen
              ? 'OPEN'
              : 'SLUICE'
            : isTarget
              ? `${Math.round(volume * 100)}%`
              : '';
        tile.setAttribute(
          'aria-label',
          describeCell({
            cell,
            volume,
            isGate,
            isSource,
            isTarget,
            solid: game.fluid.solids[cell],
          })
        );
        return tile;
      })
    );
    openButton.disabled = game.gateOpen || game.completed;
    advanceButton.disabled = game.completed;
    status.textContent = game.completed
      ? 'Archive chamber primed. Level complete.'
      : `Water: ${Math.round(game.fluid.volume[game.targetCell] * 100)}% of 12% target · step ${game.fluid.tick}`;
    clockStatus.textContent =
      'Untimed practice · Internet tide sync is coming in a later milestone.';
  };

  const handleOpen = () => {
    game = openSluice(game);
    render();
  };
  const handleAdvance = () => {
    game = advanceChronoflow(game);
    render();
  };
  const handleReset = () => {
    game = resetChronoflow();
    render();
  };

  openButton.addEventListener('click', handleOpen);
  advanceButton.addEventListener('click', handleAdvance);
  resetButton.addEventListener('click', handleReset);
  render();

  return () => {
    openButton.removeEventListener('click', handleOpen);
    advanceButton.removeEventListener('click', handleAdvance);
    resetButton.removeEventListener('click', handleReset);
  };
}

/**
 * Describe a board cell for screen readers.
 * @param {{cell: number, volume: number, isGate: boolean, isSource: boolean, isTarget: boolean, solid: boolean}} cellState Cell facts.
 * @returns {string} Accessible label.
 */
function describeCell({ cell, volume, isGate, isSource, isTarget, solid }) {
  if (isSource) return 'Water source, full.';
  if (isGate) return solid ? 'Sluice gate, closed.' : 'Sluice gate, open.';
  if (isTarget)
    return `Archive target, ${Math.round(volume * 100)} percent full.`;
  return solid
    ? `Stone wall, cell ${cell + 1}.`
    : `Channel, cell ${cell + 1}, ${Math.round(volume * 100)} percent full.`;
}
