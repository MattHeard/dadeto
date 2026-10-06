import {
  advanceChronoflow,
  createChronoflowGame,
  finalizeChronoflowObjective,
  openSluice,
  resetChronoflow,
  setChronoflowRoute,
} from './runtime.js';
import {
  estimateNetworkClock,
  readNetworkClock,
  sampleNetworkClock,
} from './networkClock.js';
import { getTidePhase } from './tide.js';
import { getFlowVisual } from './flowVisual.js';
import { getCellReadout } from './cellReadout.js';

const CLOCK_MAX_AGE_MS = 30000;
const CLOCK_REFRESH_MS = 15000;

/**
 * Start the Chronoflow page using injected DOM elements.
 * @param {{documentObj: Document, grid: HTMLElement, status: HTMLElement, clockStatus: HTMLElement, inspectStatus?: HTMLElement, openButton: HTMLButtonElement, advanceButton: HTMLButtonElement, resetButton: HTMLButtonElement, routeButton?: HTMLButtonElement, fetchImpl: typeof fetch, monotonicNow: () => number, setIntervalImpl?: typeof setInterval, clearIntervalImpl?: typeof clearInterval}} options Page and clock boundaries.
 * @returns {() => void} Removes registered controls.
 */
export function startChronoflowPage(options) {
  const {
    documentObj,
    grid,
    status,
    clockStatus,
    inspectStatus,
    openButton,
    advanceButton,
    resetButton,
    routeButton,
    fetchImpl,
    monotonicNow,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
  } = options;
  let game = createChronoflowGame();
  let selectedCell = 1;
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
    const reading = getClockReading();
    if (reading.status === 'stale') {
      clockStatus.textContent =
        'Untimed practice · Internet tide clock is stale. Timed play is disabled.';
      return;
    }
    clockStatus.textContent = `Untimed practice · Internet tide synchronized (±${Math.ceil(reading.uncertaintyMs)} ms). Tide: ${getTidePhase(reading.epochMs)}.`;
  };

  /**
   * @returns {{status: 'synchronized', epochMs: number, uncertaintyMs: number}|{status: 'stale', epochMs: null, uncertaintyMs: null}} Current trusted time.
   */
  const getClockReading = () =>
    clockEstimate
      ? readNetworkClock(clockEstimate, monotonicNow(), CLOCK_MAX_AGE_MS)
      : { status: 'stale', epochMs: null, uncertaintyMs: null };

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
        const flow = getFlowVisual(
          game.fluid.velocityX[cell],
          game.fluid.velocityY[cell]
        );
        const isGate = cell === 13;
        const isTarget = cell === game.targetCell;
        const isSource = cell === 1;
        tile.type = 'button';
        tile.className = 'chronoflow-cell';
        tile.dataset.cell = String(cell);
        tile.dataset.solid = String(game.fluid.solids[cell]);
        tile.dataset.gate = String(isGate);
        tile.dataset.target = String(isTarget);
        tile.dataset.flowDirection = flow.direction;
        tile.dataset.flowGlyph = flow.glyph;
        tile.dataset.selected = String(cell === selectedCell);
        tile.style.setProperty('--water-level', String(volume));
        tile.style.setProperty('--flow-strength', String(flow.strength));
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
            flowDirection: flow.direction,
            solid: game.fluid.solids[cell],
          })
        );
        tile.setAttribute('aria-pressed', String(cell === selectedCell));
        tile.addEventListener('click', () => {
          selectedCell = cell;
          render();
        });
        return tile;
      })
    );
    if (inspectStatus) {
      const reading = getCellReadout(game.fluid, selectedCell);
      const terrain = reading.solid ? 'stone' : 'channel';
      inspectStatus.textContent = `Cell ${reading.cell} · ${terrain} · depth ${Math.round(reading.depth * 100)}% · head ${reading.hydraulicHead.toFixed(2)} · velocity ${reading.velocityX.toFixed(2)}, ${reading.velocityY.toFixed(2)}`;
    }
    if (routeButton) {
      routeButton.disabled = game.completed;
      routeButton.textContent =
        game.route === 'drain'
          ? 'Route valve to archive'
          : 'Route valve to drain';
      routeButton.setAttribute(
        'aria-label',
        game.route === 'drain'
          ? 'Route valve to archive chamber'
          : 'Route valve to decoy drain'
      );
    }
    openButton.disabled =
      game.route !== 'archive' || game.gateOpen || game.completed;
    advanceButton.disabled = game.completed;
    status.textContent = game.completed
      ? game.timedCredit
        ? 'Archive chamber primed. Timed high-tide record secured.'
        : 'Archive chamber primed. Practice complete; no timed record.'
      : `Water: ${Math.round(game.fluid.volume[game.targetCell] * 100)}% of 12% target · step ${game.fluid.tick}`;
    renderClock();
  };

  const handleOpen = () => {
    game = openSluice(game);
    render();
  };
  const handleRoute = () => {
    game = setChronoflowRoute(
      game,
      game.route === 'drain' ? 'archive' : 'drain'
    );
    render();
  };
  const handleAdvance = () => {
    const wasCompleted = game.completed;
    game = advanceChronoflow(game);
    if (!wasCompleted && game.completed) {
      game = finalizeChronoflowObjective(game, getClockReading());
    }
    render();
  };
  const handleReset = () => {
    game = resetChronoflow();
    render();
  };

  openButton.addEventListener('click', handleOpen);
  routeButton?.addEventListener('click', handleRoute);
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
    routeButton?.removeEventListener('click', handleRoute);
    advanceButton.removeEventListener('click', handleAdvance);
    resetButton.removeEventListener('click', handleReset);
  };
}

/**
 * Describe a board cell for screen readers.
 * @param {{cell: number, volume: number, isGate: boolean, isSource: boolean, isTarget: boolean, flowDirection: string, solid: boolean}} cellState Cell facts.
 * @returns {string} Accessible label.
 */
function describeCell({
  cell,
  volume,
  isGate,
  isSource,
  isTarget,
  flowDirection,
  solid,
}) {
  if (isSource) return 'Water source, full.';
  if (isGate) return solid ? 'Sluice gate, closed.' : 'Sluice gate, open.';
  if (isTarget)
    return `Archive target, ${Math.round(volume * 100)} percent full; ${describeFlow(flowDirection)}.`;
  const cellDescription = solid
    ? `Stone wall, cell ${cell + 1}.`
    : `Channel, cell ${cell + 1}, ${Math.round(volume * 100)} percent full`;
  return solid
    ? cellDescription
    : `${cellDescription}; ${describeFlow(flowDirection)}.`;
}

/**
 * Describe visible solver motion for assistive technology.
 * @param {string} direction Rendered flow direction.
 * @returns {string} Spoken water motion.
 */
function describeFlow(direction) {
  return direction === 'still' ? 'water still' : `water flowing ${direction}`;
}
