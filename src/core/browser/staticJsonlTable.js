/**
 * @typedef {{index: number, values: Record<string, string | number>}} TableRow
 * @typedef {{column: string, direction: string}} SortDescriptor
 * @typedef {{rows: TableRow[], columns: string[], sort: SortDescriptor[]}} TablePayload
 */

/**
 * Compare two supported table values.
 * @param {string | number} left First field value.
 * @param {string | number} right Second field value.
 * @returns {number} Ordering of the two values.
 */
function compare(left, right) {
  if (typeof left === 'number') return left - Number(right);
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Sort rows by ordered descriptors and stable source index.
 * @param {TableRow[]} rows Indexed data records.
 * @param {SortDescriptor[]} descriptors Ordered sort priorities.
 * @returns {TableRow[]} Sorted copy of the records.
 */
function sortRows(rows, descriptors) {
  return [...rows].sort((left, right) => {
    for (const descriptor of descriptors) {
      const result = compare(
        left.values[descriptor.column],
        right.values[descriptor.column]
      );
      if (result !== 0)
        return descriptor.direction === 'desc' ? -result : result;
    }
    return left.index - right.index;
  });
}

/**
 * Render the current table state into the DOM.
 * @param {HTMLElement} table Generated table container.
 * @param {TablePayload} payload Authored table data.
 * @param {Document} documentObject Owning DOM document.
 * @returns {void} Updates table body and sort indicators.
 */
function renderTable(table, payload, documentObject) {
  const rows = sortRows(payload.rows, payload.sort);
  const tbody = /** @type {HTMLTableSectionElement} */ (
    table.querySelector('tbody')
  );
  tbody.replaceChildren(
    ...rows.map(row => {
      const tr = documentObject.createElement('tr');
      payload.columns.forEach(column => {
        const td = documentObject.createElement('td');
        td.textContent = String(row.values[column]);
        tr.append(td);
      });
      return tr;
    })
  );
  payload.columns.forEach(column => {
    const indicator = /** @type {HTMLElement} */ (
      Array.from(table.querySelectorAll('[data-static-table-indicator]')).find(
        node =>
          /** @type {HTMLElement} */ (node).dataset.staticTableIndicator ===
          column
      )
    );
    const priority = payload.sort.findIndex(item => item.column === column);
    indicator.textContent = `${payload.sort[priority].direction === 'asc' ? '↑' : '↓'} ${priority + 1}`;
  });
}

/**
 * Initialize all statically generated JSONL tables on a document.
 * @param {Document} documentObject Document containing authored tables.
 * @returns {void} Registers sort controls and renders initial rows.
 */
export function initializeStaticJsonlTables(documentObject) {
  documentObject
    .querySelectorAll('[data-static-jsonl-table]')
    .forEach(table => {
      const element = /** @type {HTMLElement} */ (table);
      const data = /** @type {HTMLElement} */ (
        table.querySelector('[data-static-table-data]')
      );
      const payload = /** @type {TablePayload} */ (
        JSON.parse(data.textContent || '{}')
      );
      payload.sort = payload.columns.map(column => ({
        column,
        direction: 'asc',
      }));
      table.querySelectorAll('[data-static-table-sort]').forEach(button => {
        button.addEventListener('click', () => {
          const column = /** @type {string} */ (
            /** @type {HTMLElement} */ (button).dataset.staticTableSort
          );
          const previous = payload.sort.find(item => item.column === column);
          payload.sort = [
            {
              column,
              direction: previous?.direction === 'asc' ? 'desc' : 'asc',
            },
            ...payload.sort.filter(item => item.column !== column),
          ];
          renderTable(element, payload, documentObject);
        });
      });
      renderTable(element, payload, documentObject);
    });
}
