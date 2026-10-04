// @ts-nocheck -- runtime adapters are injected at the browser boundary.
import { CONTENT } from './content.js';
import { createAudioAdapter } from './audio.js';
import { createSimulation, stepGame, finishChapter } from './simulation.js';
import { createSaveAdapter } from './save.js';
import { toFramePayload } from './renderer.js';
import { questJournal } from './quests.js';

/**
 * Compose episode systems behind one lifecycle and deterministic step API.
 * @param {unknown} options - The options argument.
 * @returns {unknown} The computed result.
 */
export function createMosslightRuntime(options = {}) {
  const opts = options instanceof Map ? { env: options } : options;
  const content = opts.content || CONTENT;
  const env = opts.env || new Map();
  const save = opts.save || createSaveAdapter(env);
  const audio = opts.audio || createAudioAdapter(env);
  const renderer = opts.renderer || toFramePayload;
  const createState = opts.systems?.create || createSimulation;
  const stepState = opts.systems?.step || stepGame;
  const journalFor = opts.systems?.journal || questJournal;
  let activeSlot = opts.slot ?? save.getActiveSlot?.() ?? 0;
  let state = save.load?.(activeSlot) || createState(content);
  let running = false;
  let accumulator = 0;
  const fixedStep = 125;
  /**
   * Resolve menu save commands without duplicating presenter rules.
   * @returns {void}
   */
  function applyControllerCommand() {
    const command = state.controllerCommand;
    if (!command) return;
    const lastActions = state.lastActions;
    state = { ...state, controllerCommand: null };
    if (command === 'reset') {
      state = { ...createState(content), lastActions };
      save.save?.(state, activeSlot, undefined, true);
    } else if (command.startsWith('slot:')) {
      activeSlot = Number(command.slice(5));
      state = {
        ...(save.load?.(activeSlot) || createState(content)),
        lastActions,
        menu: null,
      };
    } else if (command === 'save')
      state = { ...state, toast: 'Saved on this device.' };
    else opts.onControllerCommand?.(command);
  }
  return {
    start() {
      running = true;
      return renderer(state);
    },
    pause() {
      running = false;
      audio.stop?.();
      return renderer(state);
    },
    resume() {
      running = true;
      return renderer(state);
    },
    step(deltaMs = 125, actions = []) {
      if (!running) return renderer(state);
      if (
        state.menu?.page === 'paused' &&
        actions.length === 0 &&
        state.lastActions.length === 0
      )
        return renderer(state);
      accumulator += Math.max(0, Math.min(deltaMs, 500));
      while (accumulator >= fixedStep) {
        const previousToast = state.toast;
        const hadWellOpen = state.world.flags.wellOpen;
        state = stepState(state, actions, content, fixedStep);
        applyControllerCommand();
        accumulator -= fixedStep;
        if (state.toast && state.toast !== previousToast) {
          const cue =
            !hadWellOpen && state.world.flags.wellOpen
              ? 'quest-cue'
              : state.mode === 'battle'
                ? 'battle-hit'
                : state.toast.includes('turnip') || state.toast.includes('fish')
                  ? 'item-pickup'
                  : 'story-cue';
          audio.play?.(cue);
        }
        if (state.world.flags.ending && !state.ending)
          state = finishChapter(state, state.world.flags.ending, content);
        if (state.mode === 'journal' || state.menu?.page === 'journal')
          state = { ...state, journal: journalFor(state, content) };
        save.save?.(state, activeSlot);
      }
      return renderer(state);
    },
    dispatch(command) {
      const actions =
        typeof command === 'string' ? [command] : command?.actions || [];
      state = stepState(state, actions, content);
      applyControllerCommand();
      if (state.menu?.page === 'journal')
        state = { ...state, journal: journalFor(state, content) };
      if (state.world.flags.ending && !state.ending)
        state = finishChapter(state, state.world.flags.ending, content);
      save.save?.(state, activeSlot);
      return renderer(state);
    },
    getSnapshot() {
      return state;
    },
    getState() {
      return state;
    },
    getJournal() {
      return journalFor(state, content);
    },
    save() {
      save.save?.(state, activeSlot);
      return state;
    },
    listSaves() {
      return save.list?.() || [];
    },
    loadSlot(slot) {
      activeSlot = Number(slot);
      state = save.load?.(slot) || createState(content);
      return renderer(state);
    },
    resetSave(resetId) {
      if (resetId && save.hasReset?.(resetId)) return renderer(state);
      state = createState(content);
      accumulator = 0;
      audio.stop?.();
      save.save?.(state, activeSlot, resetId, true);
      return renderer(state);
    },
    exportSave() {
      return save.export(state, activeSlot);
    },
    importSave(raw) {
      const parsed = save.import(raw);
      if (!parsed) throw new Error('Invalid Mosslight Valley save data.');
      state = parsed.state;
      activeSlot = parsed.slot ?? activeSlot;
      return renderer(state);
    },
    getSlot() {
      return activeSlot;
    },
    frame() {
      return renderer(state);
    },
    isRunning() {
      return running;
    },
    setState(next) {
      state = next;
      return renderer(state);
    },
  };
}
