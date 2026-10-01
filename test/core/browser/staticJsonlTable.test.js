import { JSDOM } from 'jsdom';
import { initializeStaticJsonlTables } from '../../../src/core/browser/staticJsonlTable.js';

test('sorts numeric/string fields, stable ties and priority toggles in the actual DOM', () => {
  const payload = {
    columns: ['name', 'count'],
    rows: [
      { index: 0, values: { name: 'B', count: 2 } },
      { index: 1, values: { name: 'A', count: 1 } },
      { index: 2, values: { name: 'B', count: 2 } },
      { index: 3, values: { name: 'B', count: 1 } },
    ],
  };
  const dom = new JSDOM(`<div data-static-jsonl-table>
    <script data-static-table-data type="application/json">${JSON.stringify(payload)}</script>
    <button data-static-table-sort="name"></button>
    <button data-static-table-sort="count"></button>
    <button data-static-table-sort="ghost"></button>
    <span data-static-table-indicator="name"></span>
    <span data-static-table-indicator="count"></span>
    <table><tbody></tbody></table>
  </div>`);
  const documentObject = dom.window.document;
  initializeStaticJsonlTables(documentObject);
  const names = () =>
    Array.from(documentObject.querySelectorAll('tbody tr')).map(
      row => row.cells[0].textContent
    );
  expect(names()).toEqual(['A', 'B', 'B', 'B']);
  documentObject.querySelector('[data-static-table-sort="name"]').click();
  expect(names()).toEqual(['B', 'B', 'B', 'A']);
  documentObject.querySelector('[data-static-table-sort="count"]').click();
  expect(
    documentObject.querySelector('[data-static-table-indicator="count"]')
      .textContent
  ).toBe('↓ 1');
  documentObject.querySelector('[data-static-table-sort="count"]').click();
  expect(
    documentObject.querySelector('[data-static-table-indicator="count"]')
      .textContent
  ).toBe('↑ 1');
  expect(names()).toEqual(['B', 'A', 'B', 'B']);
  documentObject.querySelector('[data-static-table-sort="ghost"]').click();
  expect(names()).toEqual(['B', 'A', 'B', 'B']);
  dom.window.close();
});

test('empty documents are inert and missing table payloads fail explicitly', () => {
  const empty = new JSDOM('');
  initializeStaticJsonlTables(empty.window.document);
  empty.window.close();
  const broken = new JSDOM(
    '<div data-static-jsonl-table><script data-static-table-data></script></div>'
  );
  expect(() => initializeStaticJsonlTables(broken.window.document)).toThrow();
  broken.window.close();
});
