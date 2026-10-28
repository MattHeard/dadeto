import {
  createStaticJsonlTable,
  compareRows,
} from '../../src/core/build/staticJsonlTable.js';

/**
 * Bind an in-memory source for exact parser and markup regressions.
 * @param {string} text Serialized rows.
 * @returns {ReturnType<typeof createStaticJsonlTable>} Portable table API.
 */
function tables(text) {
  return createStaticJsonlTable({
    fileSystem: { readFileSync: () => text },
    paths: {
      resolve: (root, file) => `${root}/${file}`,
      isAbsolute: () => false,
    },
    defaultDataRoot: 'data',
  });
}

const definition = { source: 'rows.jsonl', columns: ['a'] };

test('row comparison considers later columns and exact source-order differences', () => {
  const left = { index: 3, values: { a: 1, b: 'z' } };
  const right = { index: 8, values: { a: 1, b: 'a' } };
  expect(
    compareRows(left, right, ['a', 'b'], { a: 'number', b: 'string' })
  ).toBe(1);
  expect(
    compareRows(right, left, ['a', 'b'], { a: 'number', b: 'string' })
  ).toBe(-1);
  expect(compareRows(left, right, ['a'], { a: 'number' })).toBe(-5);
  const table = tables(
    '{"a":1,"b":"z"}\n{"a":1,"b":"a"}\n{"a":1,"b":"a"}'
  ).parseStaticJsonlTable({ ...definition, columns: ['a', 'b'] });
  expect(table.rows.map(row => row.index)).toEqual([1, 2, 0]);
});

test.each([
  [42, 'entry must be an object'],
  ['table', 'entry must be an object'],
  [{ ...definition, source: ' \t ' }, 'source must be a non-empty string'],
  [
    { ...definition, columns: ['a', 1] },
    'columns must contain non-empty strings',
  ],
  [
    { ...definition, columns: ['a', null] },
    'columns must contain non-empty strings',
  ],
])('validates definition %j with its specific error', (entry, message) => {
  expect(() => tables('').validateDefinition(entry)).toThrow(
    new TypeError(`Invalid static JSONL table: ${message}`)
  );
});

test('ignores CRLF and whitespace-only lines while preserving projected row order', () => {
  expect(
    tables(
      ' \t\r\n{"a":0,"ignored":true}\r\n \t \r\n{"a":2}\r\n'
    ).parseStaticJsonlTable(definition).rows
  ).toEqual([
    { index: 0, values: { a: 0 } },
    { index: 1, values: { a: 2 } },
  ]);
});

test('malformed JSON reports its physical line and retains the SyntaxError cause', () => {
  let caught;
  try {
    tables('\n \t\n{"a":').parseStaticJsonlTable(definition);
  } catch (error) {
    caught = error;
  }
  expect(caught).toEqual(
    expect.objectContaining({
      message: 'Invalid static JSONL table: malformed JSON on line 3',
      cause: expect.any(SyntaxError),
    })
  );
});

test.each(['null', '0', 'false', '""', '"value"', '[]'])(
  'rejects non-object row %s with the physical line number',
  value => {
    expect(() =>
      tables(`\n${value}`).parseStaticJsonlTable(definition)
    ).toThrow(
      new TypeError(
        'Invalid static JSONL table: line 2 must contain a JSON object'
      )
    );
  }
);

test('missing and unsupported cells report exact column names and physical lines', () => {
  expect(() => tables('\n{"b":1}').parseStaticJsonlTable(definition)).toThrow(
    new TypeError('Invalid static JSONL table: line 2 is missing column a')
  );
  for (const value of ['true', 'null', '{}', '[]', '1e400', '-1e400']) {
    expect(() =>
      tables(`\n{"a":${value}}`).parseStaticJsonlTable(definition)
    ).toThrow(
      new TypeError(
        'Invalid static JSONL table: column a contains an unsupported value on line 2'
      )
    );
  }
  expect(tables('{"a":""}').parseStaticJsonlTable(definition).rows).toEqual([
    { index: 0, values: { a: '' } },
  ]);
});

test('initializes column types as own fields even for inherited object names', () => {
  expect(
    tables('{"constructor":2}\n{"constructor":1}').parseStaticJsonlTable({
      ...definition,
      columns: ['constructor'],
    }).rows
  ).toEqual([
    { index: 1, values: { constructor: 1 } },
    { index: 0, values: { constructor: 2 } },
  ]);
});

test('renders exact multi-row and multi-column markup, escaped labels/text and safe JSON', () => {
  const label = 'a"<>&';
  const html = tables(
    `${JSON.stringify({
      [label]: '</script><>&',
      b: 'second',
    })}\n${JSON.stringify({ [label]: 'z', b: 'last' })}`
  ).renderStaticJsonlTable({ ...definition, columns: [label, 'b'] });
  const payload = html.match(
    /<script type="application\/json" data-static-table-data>(.*?)<\/script>/s
  )[1];
  expect(payload).not.toContain('<');
  expect(JSON.parse(payload)).toEqual({
    columns: [label, 'b'],
    collapsed: false,
    rows: [
      { index: 0, values: { [label]: '</script><>&', b: 'second' } },
      { index: 1, values: { [label]: 'z', b: 'last' } },
    ],
  });
  const expectedHeaders =
    '<th scope="col"><button type="button" data-static-table-sort="a&quot;&lt;&gt;&amp;" aria-label="Sort by a&quot;&lt;&gt;&amp;">a"&lt;&gt;&amp; <span data-static-table-indicator="a&quot;&lt;&gt;&amp;"></span></button></th><th scope="col"><button type="button" data-static-table-sort="b" aria-label="Sort by b">b <span data-static-table-indicator="b"></span></button></th>';
  const expectedRows =
    '<tr><td>&lt;/script&gt;&lt;&gt;&amp;</td><td>second</td></tr><tr><td>z</td><td>last</td></tr>';
  expect(html).toBe(
    `<details class="static-jsonl-table" data-static-jsonl-table open><summary>Table</summary><table><thead><tr>${expectedHeaders}</tr></thead><tbody>${expectedRows}</tbody></table><script type="application/json" data-static-table-data>${payload}</script></details>`
  );
});
