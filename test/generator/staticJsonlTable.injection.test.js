import { jest } from '@jest/globals';
import { createStaticJsonlTable } from '../../src/core/build/staticJsonlTable.js';
import { createGeneratorHandle } from '../../src/core/build/generator.js';

/** @returns {object} Portable table platform without a native filesystem. */
function fixture() {
  const source = '{"name":"B","score":2}\n{"name":"A","score":1}\n';
  const readFileSync = jest.fn(() => source);
  const resolve = jest.fn((root, file) => `virtual[${root}|${file}]`);
  const isAbsolute = jest.fn(file => file.startsWith('absolute:'));
  const table = createStaticJsonlTable({
    fileSystem: { readFileSync },
    paths: { resolve, isAbsolute },
    defaultDataRoot: 'catalog',
  });
  return { table, readFileSync, resolve, isAbsolute };
}

const entry = { source: 'rows.jsonl', columns: ['score', 'name'] };

test('portable table factory owns path validation, source resolution and explicit roots', () => {
  const { table, readFileSync, resolve, isAbsolute } = fixture();
  expect(readFileSync).not.toHaveBeenCalled();
  expect(table.parseStaticJsonlTable(entry)).toEqual({
    columns: ['score', 'name'],
    collapsed: false,
    rows: [
      { index: 1, values: { score: 1, name: 'A' } },
      { index: 0, values: { score: 2, name: 'B' } },
    ],
  });
  expect(isAbsolute).toHaveBeenCalledWith('rows.jsonl');
  expect(resolve).toHaveBeenCalledWith('catalog', 'rows.jsonl');
  expect(readFileSync).toHaveBeenCalledWith(
    'virtual[catalog|rows.jsonl]',
    'utf8'
  );
  table.renderStaticJsonlTable(entry, { dataRoot: 'other-root' });
  expect(resolve).toHaveBeenLastCalledWith('other-root', 'rows.jsonl');
  expect(readFileSync).toHaveBeenLastCalledWith(
    'virtual[other-root|rows.jsonl]',
    'utf8'
  );
});

test('validation rejects injected absolute paths and traversal before source reads', () => {
  const { table, readFileSync, resolve } = fixture();
  for (const source of ['absolute:rows', '../rows', 'folder\\..\\rows']) {
    expect(() => table.parseStaticJsonlTable({ ...entry, source })).toThrow(
      'source must stay inside the static data directory'
    );
  }
  expect(readFileSync).not.toHaveBeenCalled();
  expect(resolve).not.toHaveBeenCalled();
});

test('read errors preserve the source-specific message and exact cause', () => {
  const { table, readFileSync } = fixture();
  const cause = new Error('portable reader failed');
  readFileSync.mockImplementation(() => {
    throw cause;
  });
  expect(() => table.parseStaticJsonlTable(entry)).toThrow(
    expect.objectContaining({
      message: 'Invalid static JSONL table: unable to read rows.jsonl',
      cause,
    })
  );
});

test('separate factory instances retain their own readers and roots', () => {
  const first = fixture();
  const second = fixture();
  second.readFileSync.mockReturnValue('{"score":9,"name":"Z"}');
  expect(first.table.parseStaticJsonlTable(entry).rows[0].values.score).toBe(1);
  expect(second.table.parseStaticJsonlTable(entry).rows[0].values.score).toBe(
    9
  );
  expect(first.readFileSync).toHaveBeenCalledTimes(1);
  expect(second.readFileSync).toHaveBeenCalledTimes(1);
});

test('core generator renders tables through its supplied renderer for both public entrypoints', () => {
  const renderStaticJsonlTable = jest.fn(() => '<table>portable table</table>');
  const generator = createGeneratorHandle({ renderStaticJsonlTable });
  const blog = {
    posts: [
      {
        key: 'table',
        title: 'Table',
        content: [
          { type: 'text', content: 'before' },
          { type: 'table', ...entry },
          { type: 'text', content: 'after' },
        ],
      },
    ],
  };
  for (const html of [
    generator.generateBlogOuter(blog),
    generator.generateBlog({ blog, header: '', footer: '' }, html => html),
  ]) {
    expect(html).toContain('<table>portable table</table>');
    expect(html.indexOf('>before</p>')).toBeLessThan(html.indexOf('<table>'));
    expect(html.indexOf('<table>')).toBeLessThan(html.indexOf('>after</p>'));
  }
  expect(renderStaticJsonlTable).toHaveBeenCalledTimes(2);
  expect(renderStaticJsonlTable).toHaveBeenCalledWith(
    expect.objectContaining(entry)
  );
});
