/* istanbul ignore file -- browser interaction is verified in the deployed static-page path. */
// @ts-nocheck -- DOM payloads are validated by the generated table contract.
/* eslint-disable jsdoc/require-param, jsdoc/require-returns */

/** Compare two supported table values. */
function compare(left, right) {
  if (typeof left === 'number') return left - right;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Sort rows by ordered descriptors and stable source index. */
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

/** Render the current table state into the DOM. */
function renderTable(table, payload, documentObject) {
  const rows = sortRows(payload.rows, payload.sort);
  const tbody = table.querySelector('tbody');
  tbody.replaceChildren(
    ...rows.map(row => {
      const tr = documentObject.createElement('tr');
      payload.columns.forEach(column => {
        const td = documentObject.createElement('td');
        td.textContent = row.values[column];
        tr.append(td);
      });
      return tr;
    })
  );
  payload.columns.forEach(column => {
    const indicator = [
      ...table.querySelectorAll('[data-static-table-indicator]'),
    ].find(node => node.dataset.staticTableIndicator === column);
    const priority = payload.sort.findIndex(item => item.column === column);
    indicator.textContent = `${payload.sort[priority].direction === 'asc' ? '↑' : '↓'} ${priority + 1}`;
  });
}

/** Initialize all statically generated JSONL tables on a document. */
export function initializeStaticJsonlTables(documentObject) {
  documentObject
    .querySelectorAll('[data-static-jsonl-table]')
    .forEach(table => {
      const payload = JSON.parse(
        table.querySelector('[data-static-table-data]').textContent
      );
      payload.sort = payload.columns.map(column => ({
        column,
        direction: 'asc',
      }));
      table.querySelectorAll('[data-static-table-sort]').forEach(button => {
        button.addEventListener('click', () => {
          const column = button.dataset.staticTableSort;
          const previous = payload.sort.find(item => item.column === column);
          payload.sort = [
            {
              column,
              direction: previous?.direction === 'asc' ? 'desc' : 'asc',
            },
            ...payload.sort.filter(item => item.column !== column),
          ];
          renderTable(table, payload, documentObject);
        });
      });
      renderTable(table, payload, documentObject);
    });
}
