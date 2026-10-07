import { resultContent as toolResult, READ_ONLY_TOOL } from '../../webmcp.js';
import { CONTROLLER_ACTIONS as ACTIONS } from '../controllerActions.js';

/**
 * Validate the entire batch before changing the game or pausing its frame loop.
 * @param {unknown} request Tool arguments.
 * @returns {string[]} Validated sequence of separate button presses.
 */
function actionBatch(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Expected an object containing actions.');
  }
  const actions = /** @type {{actions?: unknown}} */ (request).actions;
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > 32) {
    throw new TypeError('Provide between 1 and 32 actions.');
  }
  const supportedActions = new Set(ACTIONS);
  if (!Array.from(actions).every(action => supportedActions.has(action))) {
    throw new TypeError(
      'Unknown Mosslight action; use mosslight_observe for supported actions.'
    );
  }
  return actions;
}

/**
 * Register agent play against the exact runtime displayed by the game page.
 * @param {{modelContext?: {registerTool?: (tool: Record<string, any>) => void, unregisterTool?: (name: string) => void}, runtime: {getSnapshot: () => unknown, getJournal: () => unknown, pause: () => unknown, dispatch: (command: {actions: string[]}) => unknown, exportSave: () => string, importSave: (raw: string) => unknown, save: () => unknown}, redraw: () => void, profile?: {prefix: string, title: string}}} options Live game adapters.
 * @returns {() => void} Tool lifecycle disposer.
 */
export function registerMosslightTools({
  modelContext,
  runtime,
  redraw,
  profile,
}) {
  if (!modelContext?.registerTool) {
    return () => {};
  }
  const registerTool = modelContext.registerTool.bind(modelContext);
  const prefix = profile?.prefix || 'mosslight';
  let disposed = false;

  /**
   * Reject stale callbacks even if the browser cannot unregister tools.
   * @returns {void}
   */
  function ensureActive() {
    if (disposed) {
      throw new Error('This Mosslight page has been disposed.');
    }
  }

  /**
   * Observe complete grid, actor, dialogue, inventory, quest and battle state.
   * @returns {{content: Array<{type: string, text: string}>}} Current game state.
   */
  function observe() {
    ensureActive();
    return toolResult({
      state: runtime.getSnapshot(),
      journal: runtime.getJournal(),
      actions: ACTIONS,
      instructions:
        'Actions are separate button presses in order. Use directions to walk or select, A to confirm, B to go back or use its assigned shortcut, X for menus or close, Y to assign B. Agent actions pause automatic ticking; a physical controller press returns to human play.',
    });
  }

  /**
   * Redraw changed state and return the same observation used by read-only tools.
   * @returns {{content: Array<{type: string, text: string}>}} Updated observation.
   */
  function refresh() {
    redraw();
    return observe();
  }

  const definitions = [
    {
      name: `${prefix}_observe`,
      description:
        'Read the live Mosslight Valley game: map and collision grid, player and NPC positions, dialogue choices, quests, inventory, combat and supported actions.',
      ...READ_ONLY_TOOL,
      execute: observe,
    },
    {
      name: `${prefix}_act`,
      description:
        'Play the visible Mosslight Valley game with 1–32 sequential button presses. Uses normal collision, dialogue, farming, fishing, combat and story rules; pauses automatic ticking for deterministic agent turns.',
      inputSchema: {
        type: 'object',
        required: ['actions'],
        additionalProperties: false,
        properties: {
          actions: {
            type: 'array',
            minItems: 1,
            maxItems: 32,
            items: { type: 'string', enum: ACTIONS },
          },
        },
      },
      execute: (/** @type {unknown} */ request) => {
        ensureActive();
        const actions = actionBatch(request);
        runtime.pause();
        for (const action of actions) {
          runtime.dispatch({ actions: [] });
          runtime.dispatch({ actions: [action] });
        }
        return refresh();
      },
    },
    {
      name: `${prefix}_export_save`,
      description:
        'Export the visible game in its versioned portable save format without changing it.',
      ...READ_ONLY_TOOL,
      execute: () => {
        ensureActive();
        return toolResult({ save: runtime.exportSave() });
      },
    },
    {
      name: `${prefix}_import_save`,
      description:
        'Restore the visible game from a portable Mosslight save. Replaces current progress; export first if you want to keep it.',
      inputSchema: {
        type: 'object',
        required: ['save'],
        additionalProperties: false,
        properties: {
          save: {
            type: 'string',
            description: 'Serialized Mosslight save envelope.',
          },
        },
      },
      annotations: { destructiveHint: true },
      execute: (/** @type {{save?: unknown} | null | undefined} */ request) => {
        ensureActive();
        if (typeof request?.save !== 'string') {
          throw new TypeError('Provide a serialized save string.');
        }
        runtime.importSave(request.save);
        runtime.save();
        runtime.pause();
        return refresh();
      },
    },
  ];
  definitions.forEach(tool =>
    registerTool(
      profile
        ? {
            ...tool,
            description: `${profile.title}: ${tool.name}. Operates on the visible game state using up/down/left/right/a/b/x/y.`,
          }
        : tool
    )
  );
  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    definitions.forEach(tool => modelContext.unregisterTool?.(tool.name));
  };
}
