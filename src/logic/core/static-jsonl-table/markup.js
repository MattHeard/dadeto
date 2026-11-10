/**
 * Describe the authored initial expansion state.
 * @param {boolean} collapsed Interpreted descriptor state.
 * @returns {'' | ' open'} Exact details attribute fragment.
 */
export function describeStaticJsonlOpen(collapsed) {
  return collapsed ? '' : ' open';
}

/**
 * Render one header from escaped slots prepared in original coercion order.
 * @param {{sortAttribute: string, labelAttribute: string, text: string, indicatorAttribute: string}} slots Escaped attribute/text contents.
 * @returns {string} Header markup.
 */
export function renderStaticJsonlHeader(slots) {
  return `<th scope="col"><button type="button" data-static-table-sort="${slots.sortAttribute}" aria-label="Sort by ${slots.labelAttribute}">${slots.text} <span data-static-table-indicator="${slots.indicatorAttribute}"></span></button></th>`;
}

/**
 * Render one cell from already escaped text.
 * @param {string} text Escaped cell contents.
 * @returns {string} Cell markup.
 */
export function renderStaticJsonlCell(text) {
  return `<td>${text}</td>`;
}

/**
 * Render one row from prepared cell markup.
 * @param {string} cells Joined cell markup.
 * @returns {string} Row markup.
 */
export function renderStaticJsonlRow(cells) {
  return `<tr>${cells}</tr>`;
}

/**
 * Assemble the table after ordered raw interpretation and escaping.
 * @param {{payload: string, open: '' | ' open', headers: string, body: string}} slots Prepared script text, expansion state and markup.
 * @returns {string} Complete self-contained table markup.
 */
export function renderStaticJsonlTableMarkup(slots) {
  return `<details class="static-jsonl-table" data-static-jsonl-table${slots.open}><summary>Table</summary><table><thead><tr>${slots.headers}</tr></thead><tbody>${slots.body}</tbody></table><script type="application/json" data-static-table-data>${slots.payload}</script></details>`;
}
