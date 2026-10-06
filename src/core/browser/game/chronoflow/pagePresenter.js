import {
  advanceChronoflow,
  createChronoflowGame,
  openSluice,
  resetChronoflow,
} from './runtime.js';
import {
  estimateNetworkClock,
  readNetworkClock,
  sampleNetworkClock,
} from './networkClock.js';
import { getTidePhase } from './tide.js';

const CLOCK_MAX_AGE_MS = 30000;
const CLOCK_REFRESH_MS = 15000;

/**
 * Start the Chronoflow page using injected DOM elements.
 * @param {{documentObj: Document, grid: HTMLElement, status: HTMLElement, clockStatus: HTMLElement, openButton: HTMLButtonElement, advanceButton: HTMLButtonElement, resetButton: HTMLButtonElement, fetchImpl: typeof fetch, monotonicNow: () => number, setIntervalImpl?: typeof setInterval, clearIntervalImpl?: typeof clearInterval}} options Page and clock boundaries.
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
    fetchImpl,
    monotonicNow,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
  } = options;
  let game = createChronoflowGame();
  /** @type {ReturnType<typeof estimateNetworkClock>|null} */
  let clockEstimate = null;
  /** @type {string|null} */
  let timeEndpoint = null;
  let disposed = false;
  let syncing = false;
  let lastSyncAttemptMs = monotonicNow();

  const renderClock = () => {
    if (!clockEstimate) {
      clockStatus.textContent =
        'Untimed practice · Connecting to the Internet tide clock…';
      return;
    }
    const reading = readNetworkClock(
      clockEstimate,
      monotonicNow(),
      CLOCK_MAX_AGE_MS
    );
    if (reading.status === 'stale') {
      clockStatus.textContent =
        'Untimed practice · Internet tide clock is stale. Timed play is disabled.';
      return;
    }
    clockStatus.textContent = `Untimed practice · Internet tide synchronized (±${Math.ceil(reading.uncertaintyMs)} ms). Tide: ${getTidePhase(reading.epochMs)}.`;
  };

  const synchronizeClock = async () => {
    if (syncing || disposed) return;
    syncing = true;
    lastSyncAttemptMs = monotonicNow();
    try {
      if (!timeEndpoint) {
        const configResponse = await fetchImpl('/config.json', {
          cache: 'no-store',
        });
        if (!configResponse.ok) {
          throw new Error(
            `Static config returned HTTP ${configResponse.status}.`
          );
        }
        const config = await configResponse.json();
        const configuredEndpoint = config?.chronoflowTimeUrl;
        if (
          typeof configuredEndpoint !== 'string' ||
          configuredEndpoint.length === 0
        ) {
          throw new TypeError('Chronoflow time endpoint is not configured.');
        }
        timeEndpoint = configuredEndpoint;
      }
      clockEstimate = await sampleNetworkClock({
        fetchImpl,
        monotonicNow,
        endpoint: timeEndpoint,
      });
      if (!disposed) renderClock();
    } catch {
      if (!disposed) {
        clockStatus.textContent = clockEstimate
          ? 'Untimed practice · Internet tide clock is stale. Timed play is disabled.'
          : 'Untimed practice · Internet tide unavailable. Timed play is disabled.';
      }
    } finally {
      syncing = false;
    }
  };

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
    renderClock();
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
  void synchronizeClock();
  const clockInterval = setIntervalImpl(() => {
    renderClock();
    const now = monotonicNow();
    const reading = clockEstimate
      ? readNetworkClock(clockEstimate, now, CLOCK_MAX_AGE_MS)
      : { status: 'stale' };
    if (
      reading.status === 'stale' &&
      now - lastSyncAttemptMs >= CLOCK_REFRESH_MS
    ) {
      void synchronizeClock();
    }
  }, 1000);

  return () => {
    disposed = true;
    clearIntervalImpl(clockInterval);
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
