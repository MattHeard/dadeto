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
import { drawCanvasShapes } from '../mosslight-valley/renderer.js';
import { renderChronoflowBoard } from './renderer.js';

const CLOCK_MAX_AGE_MS = 30000;
const CLOCK_REFRESH_MS = 15000;

/**
 * Start the Chronoflow page using injected DOM elements.
 * @param {{
 *   elements: {
 *     documentObj: Document,
 *     grid: HTMLElement,
 *     displayCanvas?: HTMLCanvasElement|null,
 *     status: HTMLElement,
 *     clockStatus: HTMLElement,
 *     inspectStatus?: HTMLElement
 *   },
 *   controls: {
 *     openButton?: HTMLButtonElement,
 *     advanceButton?: HTMLButtonElement,
 *     resetButton: HTMLButtonElement,
 *     routeButton?: HTMLButtonElement,
 *     editButton?: HTMLButtonElement,
 *     startTimedButton?: HTMLButtonElement,
 *     keypadButtons?: HTMLButtonElement[]
 *   },
 *   runtime: {
 *     fetchImpl: (permission: import('../../../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>,
 *     bindEffectBoundary: import('../../../../../types/allow-effects').AllowEffectsBoundary,
 *     monotonicNow: () => number,
 *     saveStorage?: Storage,
 *     setIntervalImpl?: typeof setInterval,
 *     clearIntervalImpl?: typeof clearInterval
 *   }
 * }} options Page elements, controls, and runtime adapters.
 * @returns {() => void} Removes registered controls.
 */
export function startChronoflowPage(options) {
  const { elements, controls, runtime } = options;
  const displayContext = elements.displayCanvas?.getContext('2d') ?? null;
  const keypad = Array.from(controls.keypadButtons ?? []);
  const saveStore = createChronoflowSaveStore(runtime.saveStorage);
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
  let lastSyncAttemptMs = runtime.monotonicNow();

  const renderClock = () => {
    const modeLabel =
      game.mode === 'timed' ? 'Timed attempt' : 'Untimed practice';
    if (!clockEstimate) {
      elements.clockStatus.textContent =
        game.mode === 'timed'
          ? 'Timed attempt paused · Internet tide clock is stale.'
          : `${modeLabel} · Connecting to the Internet tide clock…`;
      return;
    }
    const reading = getClockReading();
    if (reading.status === 'stale') {
      elements.clockStatus.textContent = `${modeLabel} · Internet tide clock is stale. Timed play is disabled.`;
      return;
    }
    elements.clockStatus.textContent = `${modeLabel} · Internet tide synchronized (±${Math.ceil(reading.uncertaintyMs)} ms). Tide: ${getTidePhase(reading.epochMs)}.`;
    if (
      game.mode === 'timed' &&
      !isTideWindowOpen({
        clockStatus: reading.status,
        epochMs: reading.epochMs,
        uncertaintyMs: reading.uncertaintyMs,
      })
    ) {
      elements.clockStatus.textContent = `Timed attempt paused · Tide: ${getTidePhase(reading.epochMs)}.`;
    }
  };

  /**
   * @returns {{status: 'synchronized', epochMs: number, uncertaintyMs: number}|{status: 'stale', epochMs: null, uncertaintyMs: null}} Current trusted time.
   */
  const getClockReading = () =>
    clockEstimate
      ? readNetworkClock(
          clockEstimate,
          runtime.monotonicNow(),
          CLOCK_MAX_AGE_MS
        )
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
    if (controls.openButton) controls.openButton.disabled = cannotOpen;
    const openKey = keypad.find(button => button.dataset.key === 'x');
    if (openKey) openKey.disabled = cannotOpen;
    const cannotAdvance =
      game.completed || (game.mode === 'timed' && !highTideWindow);
    if (controls.advanceButton) controls.advanceButton.disabled = cannotAdvance;
    const advanceKey = keypad.find(button => button.dataset.key === 'y');
    if (advanceKey) advanceKey.disabled = cannotAdvance;
    if (controls.startTimedButton) {
      controls.startTimedButton.disabled =
        game.completed || game.mode === 'timed' || !highTideWindow;
      controls.startTimedButton.textContent =
        game.mode === 'timed'
          ? 'Timed high-tide attempt active'
          : 'Start timed attempt · high tide';
    }
    if (controls.editButton) {
      const editable = game.editableCells.includes(selectedCell);
      const verb = game.fluid.solids[selectedCell] ? 'Carve' : 'Fill';
      controls.editButton.textContent = editable
        ? `${verb} channel at cell ${selectedCell + 1} · ${game.editBudget - game.editsUsed} edits left`
        : 'Select a marked cell to edit';
      controls.editButton.disabled =
        game.completed ||
        !editable ||
        game.editsUsed >= game.editBudget ||
        (game.mode === 'timed' && !highTideWindow);
      controls.editButton.setAttribute(
        'aria-label',
        controls.editButton.textContent
      );
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
    lastSyncAttemptMs = runtime.monotonicNow();
    try {
      if (!timeEndpoint) {
        const configResponse = await runtime.bindEffectBoundary(permission =>
          runtime.fetchImpl(permission, '/config.json', { cache: 'no-store' })
        );
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
        fetchImpl: runtime.fetchImpl,
        bindEffectBoundary: runtime.bindEffectBoundary,
        monotonicNow: runtime.monotonicNow,
        endpoint: timeEndpoint,
      });
      if (
        elements.documentObj.visibilityState === 'hidden' ||
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
        elements.clockStatus.textContent =
          game.mode === 'timed' || clockEstimate
            ? 'Timed attempt paused · Internet tide clock is stale.'
            : 'Untimed practice · Internet tide unavailable. Timed play is disabled.';
      }
    } finally {
      syncing = false;
      if (
        visibilityResyncRequested &&
        elements.documentObj.visibilityState === 'visible' &&
        !disposed
      ) {
        visibilityResyncRequested = false;
        requestVisibleResync();
      }
    }
  };

  const render = () => {
    updateTimedControls();
    elements.grid.replaceChildren(
      ...game.fluid.volume.map((volume, cell) => {
        const tile = elements.documentObj.createElement('button');
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
    if (displayContext) {
      drawCanvasShapes(
        displayContext,
        renderChronoflowBoard(game, selectedCell)
      );
    }
    if (elements.inspectStatus) {
      const reading = getCellReadout(game.fluid, selectedCell);
      const terrain = reading.solid ? 'stone' : 'channel';
      elements.inspectStatus.textContent = `Cell ${reading.cell} · ${terrain} · depth ${Math.round(reading.depth * 100)}% · head ${reading.hydraulicHead.toFixed(2)} · velocity ${reading.velocityX.toFixed(2)}, ${reading.velocityY.toFixed(2)}`;
    }
    if (controls.routeButton) {
      controls.routeButton.disabled = game.completed;
      controls.routeButton.textContent =
        game.route === 'drain'
          ? 'Route valve to archive'
          : 'Route valve to drain';
      controls.routeButton.setAttribute(
        'aria-label',
        game.route === 'drain'
          ? 'Route valve to archive chamber'
          : 'Route valve to decoy drain'
      );
    }
    elements.status.textContent = game.completed
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
    if (elements.documentObj.visibilityState === 'hidden') {
      invalidateClockEstimate();
    } else if (elements.documentObj.visibilityState === 'visible') {
      invalidateClockEstimate();
      requestVisibleResync();
    }
  };

  elements.documentObj.addEventListener?.(
    'visibilitychange',
    handleVisibilityChange
  );
  controls.openButton?.addEventListener('click', handleOpen);
  controls.routeButton?.addEventListener('click', handleRoute);
  controls.editButton?.addEventListener('click', handleEdit);
  controls.startTimedButton?.addEventListener('click', handleStartTimed);
  controls.advanceButton?.addEventListener('click', handleAdvance);
  controls.resetButton.addEventListener('click', handleReset);
  keypad.forEach(button => button.addEventListener('click', handleKeypadClick));
  elements.documentObj.addEventListener?.('keydown', handleKeyboard);
  render();
  void synchronizeClock();
  const clockInterval = (runtime.setIntervalImpl ?? setInterval)(() => {
    updateTimedControls();
    renderClock();
    const now = runtime.monotonicNow();
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
    (runtime.clearIntervalImpl ?? clearInterval)(clockInterval);
    elements.documentObj.removeEventListener?.(
      'visibilitychange',
      handleVisibilityChange
    );
    controls.openButton?.removeEventListener('click', handleOpen);
    controls.routeButton?.removeEventListener('click', handleRoute);
    controls.editButton?.removeEventListener('click', handleEdit);
    controls.startTimedButton?.removeEventListener('click', handleStartTimed);
    controls.advanceButton?.removeEventListener('click', handleAdvance);
    controls.resetButton.removeEventListener('click', handleReset);
    keypad.forEach(button =>
      button.removeEventListener('click', handleKeypadClick)
    );
    elements.documentObj.removeEventListener?.('keydown', handleKeyboard);
  };
}

/**
 * Describe a board cell for screen readers.
 * @param {{cell: number, volume: number, isGate: boolean, isSource: boolean, isTarget: boolean, flowDirection: string, solid: boolean, editable: boolean}} cellState Cell facts.
 * @returns {string} Accessible label.
 */
function describeCell(cellState) {
  const description = cellState.isSource
    ? 'Water source, full.'
    : cellState.isGate
      ? cellState.solid
        ? 'Sluice gate, closed.'
        : 'Sluice gate, open.'
      : cellState.isTarget
        ? `Archive target, ${Math.round(cellState.volume * 100)} percent full; ${describeFlow(cellState.flowDirection)}.`
        : cellState.solid
          ? `Stone wall, cell ${cellState.cell + 1}.`
          : `Channel, cell ${cellState.cell + 1}, ${Math.round(cellState.volume * 100)} percent full; ${describeFlow(cellState.flowDirection)}.`;
  return cellState.editable
    ? `${description} Editable channel site.`
    : description;
}

/**
 * Describe visible solver motion for assistive technology.
 * @param {string} direction Rendered flow direction.
 * @returns {string} Spoken water motion.
 */
function describeFlow(direction) {
  return direction === 'still' ? 'water still' : `water flowing ${direction}`;
}
