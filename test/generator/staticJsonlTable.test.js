/* eslint-disable jsdoc/require-param, jsdoc/require-returns */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateBlogOuter } from '../../src/build/generator.js';
import {
  parseStaticJsonlTable,
  renderStaticJsonlTable,
} from '../../src/core/build/staticJsonlTable.js';

/** Create an isolated JSONL fixture directory. */
function fixture(lines) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-table-'));
  fs.writeFileSync(path.join(root, 'rows.jsonl'), lines.join('\n'));
  return root;
}

describe('static JSONL tables', () => {
  test('validates, projects, and sorts using declared columns', () => {
    const root = fixture([
      '{"name":"z","score":2}',
      '',
      '{"name":"a","score":10}',
      '{"name":"a","score":1}',
    ]);
    expect(
      parseStaticJsonlTable(
        { source: 'rows.jsonl', columns: ['score', 'name'] },
        { dataRoot: root }
      ).rows.map(row => row.values.score)
    ).toEqual([1, 2, 10]);
    const html = renderStaticJsonlTable(
      { source: 'rows.jsonl', columns: ['score', 'name'], collapsed: true },
      { dataRoot: root }
    );
    expect(html).toContain(
      '<details class="static-jsonl-table" data-static-jsonl-table>'
    );
    expect(html.indexOf('score')).toBeLessThan(html.indexOf('name'));
    expect(html).toContain('data-static-table-sort="score"');
  });

  test('renders an expanded table in the authored post position', () => {
    const html = generateBlogOuter({
      posts: [
        {
          key: 'TABL1',
          title: 'Table post',
          publicationDate: '2026-09-13',
          content: [
            { type: 'text', content: 'before' },
            {
              type: 'table',
              source: 'wilson-intervals.jsonl',
              columns: ['sampleSize', 'successRate'],
            },
            { type: 'text', content: 'after' },
          ],
        },
      ],
    });
    expect(html.indexOf('>before</p>')).toBeLessThan(
      html.indexOf('class="static-jsonl-table"')
    );
    expect(html.indexOf('class="static-jsonl-table"')).toBeLessThan(
      html.indexOf('>after</p>')
    );
    expect(html).toContain(
      '<details class="static-jsonl-table" data-static-jsonl-table open>'
    );
  });

  test.each([
    ['malformed JSON', ['{"a":1', ''], 'malformed JSON'],
    ['missing column', ['{"a":1}'], 'missing column b'],
    ['unsupported value', ['{"a":true}'], 'unsupported value'],
    ['inconsistent types', ['{"a":1}', '{"a":"x"}'], 'inconsistent JSON types'],
  ])('rejects %s', (_name, lines, message) => {
    const root = fixture(lines);
    expect(() =>
      parseStaticJsonlTable(
        {
          source: 'rows.jsonl',
          columns: ['a', ...(message.includes('missing') ? ['b'] : [])],
        },
        { dataRoot: root }
      )
    ).toThrow(message);
  });

  test('rejects invalid definitions, unreadable sources, and traversal', () => {
    const root = fixture(['{"a":1}']);
    expect(() =>
      parseStaticJsonlTable(
        { source: 'missing.jsonl', columns: ['a'] },
        { dataRoot: root }
      )
    ).toThrow('unable to read');
    expect(() =>
      parseStaticJsonlTable(
        { source: '../rows.jsonl', columns: ['a'] },
        { dataRoot: root }
      )
    ).toThrow('stay inside');
    expect(() =>
      parseStaticJsonlTable(
        { source: 'rows.jsonl', columns: [] },
        { dataRoot: root }
      )
    ).toThrow('non-empty array');
  });

  test.each([
    [null, 'entry must be an object'],
    [{}, 'non-empty string'],
    [{ source: 'rows.jsonl' }, 'non-empty array'],
    [{ source: 'rows.jsonl', columns: [''] }, 'non-empty strings'],
    [{ source: 'rows.jsonl', columns: ['a', 'a'] }, 'unique'],
    [{ source: '/tmp/rows.jsonl', columns: ['a'] }, 'stay inside'],
  ])('rejects invalid definition %j', (entry, message) => {
    expect(() =>
      parseStaticJsonlTable(entry, { dataRoot: fixture([]) })
    ).toThrow(message);
  });

  test('sorts string columns in both directions and rejects non-object rows', () => {
    const root = fixture([
      '{"name":"z"}',
      '{"name":"a"}',
      '{"name":"m"}',
      '{"name":"m"}',
    ]);
    expect(
      parseStaticJsonlTable(
        { source: 'rows.jsonl', columns: ['name'] },
        { dataRoot: root }
      ).rows.map(row => row.values.name)
    ).toEqual(['a', 'm', 'm', 'z']);
    const invalidRoot = fixture(['[]']);
    expect(() =>
      parseStaticJsonlTable(
        { source: 'rows.jsonl', columns: ['name'] },
        { dataRoot: invalidRoot }
      )
    ).toThrow('JSON object');
  });

  test('uses default options for the authored data root', () => {
    expect(
      parseStaticJsonlTable({
        source: 'wilson-intervals.jsonl',
        columns: ['sampleSize', 'successRate'],
      }).rows.length
    ).toBeGreaterThan(0);
  });

  test('escapes special characters in column labels', () => {
    const root = fixture(['{"a&b":"<value>"}']);
    expect(
      renderStaticJsonlTable(
        { source: 'rows.jsonl', columns: ['a&b'] },
        { dataRoot: root }
      )
    ).toContain('data-static-table-sort="a&amp;b"');
  });
});
