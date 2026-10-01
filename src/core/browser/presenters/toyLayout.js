/** @typedef {import('../toyLayout.js').ToyLayout} ToyLayout */
/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{parent: HTMLElement, boundary: Node|null, button: HTMLElement, sections: Record<string, HTMLElement[]>}} ToyLayoutView */

/**
 * Bind logical sections to their existing nodes and a stable insertion boundary.
 * @param {HTMLElement} article - Toy article.
 * @param {HTMLElement} button - Swap button below input.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {ToyLayoutView} Retained view nodes.
 */
export function createToyLayoutView(article, button, dom) {
  const input = sectionValue(article, 'select.input', dom);
  const output = sectionValue(article, 'select.output', dom);
  const controls = /** @type {HTMLElement} */ (button.closest('.value'));
  return {
    parent: article,
    boundary: output.nextSibling,
    button,
    sections: {
      input: [...sectionNodes(input), ...sectionNodes(controls)],
      output: sectionNodes(output),
    },
  };
}

/**
 * Project the model order into the DOM, retaining all section nodes and state.
 * @param {ToyLayout} layout - Authoritative logical layout.
 * @param {ToyLayoutView} view - Bound view nodes.
 * @param {DOMHelpers} dom - DOM helpers.
 */
export function renderToyLayout(layout, view, dom) {
  for (const section of layout.order)
    for (const node of view.sections[section])
      dom.insertBefore(view.parent, node, view.boundary);
  view.button.setAttribute(
    'aria-pressed',
    String(layout.order[0] === 'output')
  );
}

/**
 * Resolve a value row in the generated toy markup contract.
 * @param {HTMLElement} article - Toy article.
 * @param {string} selector - Section dropdown selector.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {HTMLElement} Existing value row.
 */
function sectionValue(article, selector, dom) {
  const select = /** @type {HTMLElement} */ (
    dom.querySelector(article, selector)
  );
  return /** @type {HTMLElement} */ (select.closest('.value'));
}

/**
 * Bind the key/value pair guaranteed by generated toy markup.
 * @param {HTMLElement} value - Existing value row.
 * @returns {HTMLElement[]} Key followed by value.
 */
function sectionNodes(value) {
  return [/** @type {HTMLElement} */ (value.previousElementSibling), value];
}
