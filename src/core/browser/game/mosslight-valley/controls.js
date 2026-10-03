const QUICK_ACTIONS = [
  ['fish', 'Fish'],
  ['farm', 'Tend crop'],
  ['wait', 'Wait one hour'],
  ['rest', 'Rest until morning'],
  ['craft', 'Craft reed flute'],
  ['tea', 'Drink tea'],
  ['sing', 'Sing'],
  ['guard', 'Guard'],
  ['remember', 'Remember'],
];

/**
 * Wrap directional selection across a controller list for any episode.
 * @param {number} selected Current row index.
 * @param {string[]} pressed Edge-triggered buttons.
 * @param {number} count Available rows.
 * @returns {number} Wrapped selection.
 */
export function controllerSelection(selected, pressed, count) {
  const delta =
    pressed.includes('down') || pressed.includes('right')
      ? 1
      : pressed.includes('up') || pressed.includes('left')
        ? -1
        : 0;
  return (selected + delta + count) % count;
}

/**
 * Replace a menu's highlighted row without discarding suspended story state.
 * @param {Record<string, any>} state Simulation state.
 * @param {number} selected Highlighted row.
 * @returns {Record<string, any>} State with an updated menu selection.
 */
export function withControllerSelection(state, selected) {
  return { ...state, menu: { ...state.menu, selected } };
}

/**
 * List every operation available on the current controller menu page.
 * @param {Record<string, any>} state Simulation state.
 * @returns {Array<{label: string, command: string}>} Selectable rows.
 */
export function menuEntries(state) {
  const page = state.menu.page;
  if (page === 'assign')
    return QUICK_ACTIONS.map(([action, label]) => ({
      label: `${state.quickAction === action ? '* ' : ''}${label}`,
      command: `assign:${action}`,
    }));
  if (page === 'actions')
    return (
      state.battle
        ? [
            ['strike', 'Attack'],
            ['sing', 'Sing'],
            ['guard', 'Guard'],
            ['remember', 'Remember'],
            ['tea', 'Drink tea'],
          ]
        : QUICK_ACTIONS.slice(0, 6)
    ).map(([action, label]) => ({ label, command: `action:${action}` }));
  if (page === 'saves')
    return [
      { label: 'Save now', command: 'save' },
      ...[0, 1, 2].map(slot => ({
        label: `Load slot ${slot + 1}`,
        command: `slot:${slot}`,
      })),
      { label: 'Export save', command: 'export' },
      { label: 'Import save', command: 'import' },
      { label: 'Reset current slot', command: 'page:reset' },
    ];
  if (page === 'reset')
    return [
      { label: 'Keep my progress', command: 'page:main' },
      { label: 'Erase this slot', command: 'reset' },
    ];
  if (['journal', 'inventory', 'paused'].includes(page))
    return [{ label: 'Back', command: 'page:main' }];
  return [
    { label: 'Actions', command: 'page:actions' },
    { label: 'Assign B', command: 'page:assign' },
    { label: 'Field journal', command: 'page:journal' },
    { label: 'Story and help', command: 'guide' },
    { label: 'Inventory', command: 'page:inventory' },
    { label: 'Save options', command: 'page:saves' },
    { label: 'Pause', command: 'page:paused' },
    { label: 'Fullscreen', command: 'fullscreen' },
    { label: 'Return to game', command: 'close' },
  ];
}

/**
 * Resolve eight-button menu ownership before any hidden dialogue or world input.
 * @param {Record<string, any>} state Simulation state.
 * @param {string[]} pressed Edge-triggered controller buttons.
 * @returns {{state: Record<string, any>, handled: boolean, action?: string}} Transition and optional game action.
 */
export function controllerMenu(state, pressed) {
  if (!state.menu) {
    if (pressed.includes('x') && (state.dialogue || state.mode === 'journal'))
      return {
        state: {
          ...state,
          dialogue: null,
          mode: state.battle ? 'battle' : 'world',
        },
        handled: true,
      };
    if (!pressed.includes('x') && !pressed.includes('y'))
      return { state, handled: false };
    return openMenuPage(state, pressed.includes('y') ? 'assign' : 'main');
  }
  if (
    pressed.includes('x') ||
    (pressed.includes('b') && state.menu.page === 'main')
  )
    return { state: { ...state, menu: null }, handled: true };
  if (pressed.includes('b') || pressed.includes('y'))
    return openMenuPage(state, pressed.includes('y') ? 'assign' : 'main');
  const entries = menuEntries(state);
  const next = withControllerSelection(state, controllerSelection(state.menu.selected || 0, pressed, entries.length));
  const selected = next.menu.selected;
  if (!pressed.includes('a')) return { state: next, handled: true };
  const command = entries[selected].command;
  if (command.startsWith('page:'))
    return {
      state: { ...next, menu: { page: command.slice(5), selected: 0 } },
      handled: true,
    };
  if (command.startsWith('assign:'))
    return {
      state: {
        ...next,
        menu: null,
        quickAction: command.slice(7),
        toast: `B assigned: ${entries[selected].label.replace('* ', '')}. X: menu. Y: assign B.`,
      },
      handled: true,
    };
  if (command === 'close')
    return { state: { ...next, menu: null }, handled: true };
  if (command.startsWith('action:') || command === 'guide')
    return {
      state: { ...next, menu: null },
      handled: false,
      action: command === 'guide' ? 'journal' : command.slice(7),
    };
  return {
    state: { ...next, menu: null, controllerCommand: command },
    handled: true,
  };
}

/**
 * Open a controller page with fresh selection, retaining suspended story state.
 * @param {Record<string, any>} state Simulation state.
 * @param {string} page Menu page.
 * @returns {{state: Record<string, any>, handled: boolean}} Modal transition.
 */
function openMenuPage(state, page) {
  return { state: { ...state, menu: { page, selected: 0 } }, handled: true };
}

/**
 * Describe controller menus using the same bounded text in both presenters.
 * @param {Record<string, any>} frame Render snapshot.
 * @returns {string[]} Visible lines.
 */
export function menuLines(frame) {
  const page = frame.menu.page;
  const entries = menuEntries(frame);
  const selected = frame.menu.selected || 0;
  const titles = /** @type {Record<string, string>} */ ({
    main: 'VALLEY MENU',
    assign: 'ASSIGN B',
    actions: 'ACTIONS',
    journal: 'FIELD JOURNAL',
    inventory: 'INVENTORY',
    saves: 'SAVE OPTIONS',
    reset: 'ERASE THIS SLOT?',
    paused: 'PAUSED',
  });
  const title = titles[page];
  const journal = /** @type {Array<{status: string, title: string}>} */ (
    frame.journal || []
  );
  const info =
    page === 'journal'
      ? [
          `Memories ${frame.world.flags.memoryCount || 0}/3`,
          `Mira bond ${frame.world.relationships.mira || 0}`,
          ...journal.map(quest => `${quest.status}: ${quest.title}`),
        ]
      : page === 'inventory'
        ? Object.entries(frame.inventory).map(
            ([item, count]) => `${item}: ${count}`
          )
        : page === 'reset'
          ? ['All progress will be erased.', 'Other slots remain safe.']
          : [];
  return [
    title,
    ...info.slice(0, 3),
    ...entries
      .slice(
        Math.max(0, selected - 3),
        Math.max(0, selected - 3) + (info.length ? 3 : 6)
      )
      .map(
        entry => `${entry === entries[selected] ? '>' : ' '} ${entry.label}`
      ),
    'A choose  B back  X close',
    'Y assign B',
  ];
}
