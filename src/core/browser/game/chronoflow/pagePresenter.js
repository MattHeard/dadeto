import {
  advanceChronoflow,
  createChronoflowGame,
  finalizeChronoflowObjective,
  openSluice,
  resetChronoflow,
  setChronoflowRoute,
  startTimedRun,
  toggleChronoflowChannel,
} from './runtime.js';
import {
  estimateNetworkClock,
  readNetworkClock,
  sampleNetworkClock,
} from './networkClock.js';
import { getTidePhase, isTideWindowOpen } from './tide.js';
import { getFlowVisual } from './flowVisual.js';
import { getCellReadout } from './cellReadout.js';
import { createChronoflowSaveStore } from './save.js';

const CLOCK_MAX_AGE_MS = 30000;
const CLOCK_REFRESH_MS = 15000;

/**
 * Start the Chronoflow page using injected DOM elements.
 * @param {{documentObj: Document, grid: HTMLElement, status: HTMLElement, clockStatus: HTMLElement, inspectStatus?: HTMLElement, openButton?: HTMLButtonElement, advanceButton?: HTMLButtonElement, resetButton: HTMLButtonElement, routeButton?: HTMLButtonElement, editButton?: HTMLButtonElement, startTimedButton?: HTMLButtonElement, keypadButtons?: HTMLButtonElement[], fetchImpl: typeof fetch, monotonicNow: () => number, saveStorage?: Storage, setIntervalImpl?: typeof setInterval, clearIntervalImpl?: typeof clearInterval}} options Page and injected clock/storage boundaries.
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
    editButton,
    startTimedButton,
    keypadButtons = [],
    fetchImpl,
    monotonicNow,
    saveStorage,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
  } = options;
  const keypad = Array.from(keypadButtons);
  const saveStore = createChronoflowSaveStore(saveStorage);
  let game = saveStore.load() ?? createChronoflowGame();
  let selectedCell = 1;
  /** @type {ReturnType<typeof estimateNetworkClock>|null} */
  let clockEstimate = null;
  /** @type {string|null} */
  let timeEndpoint = null;
  let disposed = false;
  let syncing = false;
  let visibilityResyncRequested = false;
  let visibilityRevision = 0;
  let lastSyncAttemptMs = monotonicNow();

  const renderClock = () => {
    const modeLabel =
      game.mode === 'timed' ? 'Timed attempt' : 'Untimed practice';
    if (!clockEstimate) {
      clockStatus.textContent =
        game.mode === 'timed'
          ? 'Timed attempt paused · Internet tide clock is stale.'
          : `${modeLabel} · Connecting to the Internet tide clock…`;
      return;
    }
    const reading = getClockReading();
    if (reading.status === 'stale') {
      clockStatus.textContent = `${modeLabel} · Internet tide clock is stale. Timed play is disabled.`;
      return;
    }
    clockStatus.textContent = `${modeLabel} · Internet tide synchronized (±${Math.ceil(reading.uncertaintyMs)} ms). Tide: ${getTidePhase(reading.epochMs)}.`;
    if (
      game.mode === 'timed' &&
      !isTideWindowOpen({
        clockStatus: reading.status,
        epochMs: reading.epochMs,
        uncertaintyMs: reading.uncertaintyMs,
      })
    ) {
      clockStatus.textContent = `Timed attempt paused · Tide: ${getTidePhase(reading.epochMs)}.`;
    }
  };

  /**
   * @returns {{status: 'synchronized', epochMs: number, uncertaintyMs: number}|{status: 'stale', epochMs: null, uncertaintyMs: null}} Current trusted time.
   */
  const getClockReading = () =>
    clockEstimate
      ? readNetworkClock(clockEstimate, monotonicNow(), CLOCK_MAX_AGE_MS)
      : { status: 'stale', epochMs: null, uncertaintyMs: null };

  const updateTimedControls = () => {
    const reading = getClockReading();
    const highTideWindow = isTideWindowOpen({
      clockStatus: reading.status,
      epochMs: reading.epochMs,
      uncertaintyMs: reading.uncertaintyMs ?? 0,
    });
    const cannotOpen =
      game.route !== 'archive' ||
      game.gateOpen ||
      game.completed ||
      (game.mode === 'timed' && !highTideWindow);
    if (openButton) openButton.disabled = cannotOpen;
    const openKey = keypad.find(button => button.dataset.key === 'x');
    if (openKey) openKey.disabled = cannotOpen;
    const cannotAdvance =
      game.completed || (game.mode === 'timed' && !highTideWindow);
    if (advanceButton) advanceButton.disabled = cannotAdvance;
    const advanceKey = keypad.find(button => button.dataset.key === 'y');
    if (advanceKey) advanceKey.disabled = cannotAdvance;
    if (startTimedButton) {
      startTimedButton.disabled =
        game.completed || game.mode === 'timed' || !highTideWindow;
      startTimedButton.textContent =
        game.mode === 'timed'
          ? 'Timed high-tide attempt active'
          : 'Start timed attempt · high tide';
    }
    if (editButton) {
      const editable = game.editableCells.includes(selectedCell);
      const verb = game.fluid.solids[selectedCell] ? 'Carve' : 'Fill';
      editButton.textContent = editable
        ? `${verb} channel at cell ${selectedCell + 1} · ${game.editBudget - game.editsUsed} edits left`
        : 'Select a marked cell to edit';
      editButton.disabled =
        game.completed ||
        !editable ||
        game.editsUsed >= game.editBudget ||
        (game.mode === 'timed' && !highTideWindow);
      editButton.setAttribute('aria-label', editButton.textContent);
    }
    return highTideWindow;
  };

  const invalidateClockEstimate = () => {
    visibilityRevision += 1;
    clockEstimate = null;
    updateTimedControls();
    renderClock();
  };

  const requestVisibleResync = () => {
    if (syncing) {
      visibilityResyncRequested = true;
      return;
    }
    void synchronizeClock();
  };

  const synchronizeClock = async () => {
    if (syncing || disposed) return;
    syncing = true;
    const requestVisibilityRevision = visibilityRevision;
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
      const nextEstimate = await sampleNetworkClock({
        fetchImpl,
        monotonicNow,
        endpoint: timeEndpoint,
      });
      if (
        documentObj.visibilityState === 'hidden' ||
        requestVisibilityRevision !== visibilityRevision
      ) {
        return;
      }
      clockEstimate = nextEstimate;
      if (!disposed) {
        updateTimedControls();
        renderClock();
      }
    } catch {
      if (!disposed) {
        clockStatus.textContent =
          game.mode === 'timed' || clockEstimate
            ? 'Timed attempt paused · Internet tide clock is stale.'
            : 'Untimed practice · Internet tide unavailable. Timed play is disabled.';
      }
    } finally {
      syncing = false;
      if (
        visibilityResyncRequested &&
        documentObj.visibilityState === 'visible' &&
        !disposed
      ) {
        visibilityResyncRequested = false;
        requestVisibleResync();
      }
    }
  };

  const render = () => {
    updateTimedControls();
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
        const isEditable = game.editableCells.includes(cell);
        tile.type = 'button';
        tile.className = 'chronoflow-cell';
        tile.dataset.cell = String(cell);
        tile.dataset.solid = String(game.fluid.solids[cell]);
        tile.dataset.gate = String(isGate);
        tile.dataset.target = String(isTarget);
        tile.dataset.editable = String(isEditable);
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
            editable: isEditable,
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
    status.textContent = game.completed
      ? game.timedCredit
        ? 'Archive chamber primed. Timed high-tide record secured.'
        : 'Archive chamber primed. Practice complete; no timed record.'
      : `${game.mode === 'timed' ? 'Timed attempt' : 'Practice'} · water ${Math.round(game.fluid.volume[game.targetCell] * 100)}% of 12% target · step ${game.fluid.tick}`;
    renderClock();
    saveStore.save(game);
  };

  const handleOpen = () => {
    game = openSluice(game, getClockReading());
    render();
  };
  const handleStartTimed = () => {
    game = startTimedRun(game, getClockReading());
    render();
  };
  const handleRoute = () => {
    game = setChronoflowRoute(
      game,
      game.route === 'drain' ? 'archive' : 'drain'
    );
    render();
  };
  const handleEdit = () => {
    game = toggleChronoflowChannel(game, selectedCell, getClockReading());
    render();
  };
  const handleAdvance = () => {
    const wasCompleted = game.completed;
    game = advanceChronoflow(game, undefined, getClockReading());
    if (!wasCompleted && game.completed) {
      game = finalizeChronoflowObjective(game, getClockReading());
    }
    render();
  };
  const handleReset = () => {
    game = resetChronoflow();
    render();
  };
  /** @param {string} key Keyboard or keypad key. */
  const handleKey = key => {
    if (key === 'ArrowUp' && selectedCell >= 5) selectedCell -= 5;
    else if (key === 'ArrowDown' && selectedCell < 15) selectedCell += 5;
    else if (key === 'ArrowLeft' && selectedCell % 5 > 0) selectedCell -= 1;
    else if (key === 'ArrowRight' && selectedCell % 5 < 4) selectedCell += 1;
    else if (key.toLowerCase() === 'a') handleEdit();
    else if (key.toLowerCase() === 'b') handleRoute();
    else if (key.toLowerCase() === 'x') handleOpen();
    else if (key.toLowerCase() === 'y') handleAdvance();
    else if (key === 'Enter' || key.toLowerCase() === 's') handleStartTimed();
    else if (key.toLowerCase() === 'r') handleReset();
    else return;
    render();
  };
  /** @param {MouseEvent} event Keypad click. */
  const handleKeypadClick = event => {
    const button = /** @type {HTMLButtonElement|null} */ (event.currentTarget);
    const key = button?.dataset.key;
    if (key) handleKey(key);
  };
  /** @param {KeyboardEvent} event Document keydown. */
  const handleKeyboard = event => {
    const target = /** @type {HTMLElement|null} */ (event.target);
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]'))
      return;
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault();
    }
    handleKey(event.key);
  };
  const handleVisibilityChange = () => {
    if (documentObj.visibilityState === 'hidden') {
      invalidateClockEstimate();
    } else if (documentObj.visibilityState === 'visible') {
      invalidateClockEstimate();
      requestVisibleResync();
    }
  };

  documentObj.addEventListener?.('visibilitychange', handleVisibilityChange);
  openButton?.addEventListener('click', handleOpen);
  routeButton?.addEventListener('click', handleRoute);
  editButton?.addEventListener('click', handleEdit);
  startTimedButton?.addEventListener('click', handleStartTimed);
  advanceButton?.addEventListener('click', handleAdvance);
  resetButton.addEventListener('click', handleReset);
  keypad.forEach(button => button.addEventListener('click', handleKeypadClick));
  documentObj.addEventListener?.('keydown', handleKeyboard);
  render();
  void synchronizeClock();
  const clockInterval = setIntervalImpl(() => {
    updateTimedControls();
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
    documentObj.removeEventListener?.(
      'visibilitychange',
      handleVisibilityChange
    );
    openButton?.removeEventListener('click', handleOpen);
    routeButton?.removeEventListener('click', handleRoute);
    editButton?.removeEventListener('click', handleEdit);
    startTimedButton?.removeEventListener('click', handleStartTimed);
    advanceButton?.removeEventListener('click', handleAdvance);
    resetButton.removeEventListener('click', handleReset);
    keypad.forEach(button =>
      button.removeEventListener('click', handleKeypadClick)
    );
    documentObj.removeEventListener?.('keydown', handleKeyboard);
  };
}

/**
 * Describe a board cell for screen readers.
 * @param {{cell: number, volume: number, isGate: boolean, isSource: boolean, isTarget: boolean, flowDirection: string, solid: boolean, editable: boolean}} cellState Cell facts.
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
  editable,
}) {
  const description = isSource
    ? 'Water source, full.'
    : isGate
      ? solid
        ? 'Sluice gate, closed.'
        : 'Sluice gate, open.'
      : isTarget
        ? `Archive target, ${Math.round(volume * 100)} percent full; ${describeFlow(flowDirection)}.`
        : solid
          ? `Stone wall, cell ${cell + 1}.`
          : `Channel, cell ${cell + 1}, ${Math.round(volume * 100)} percent full; ${describeFlow(flowDirection)}.`;
  return editable ? `${description} Editable channel site.` : description;
}

/**
 * Describe visible solver motion for assistive technology.
 * @param {string} direction Rendered flow direction.
 * @returns {string} Spoken water motion.
 */
function describeFlow(direction) {
  return direction === 'still' ? 'water still' : `water flowing ${direction}`;
}
