import {
  describeStaticJsonlOpen,
  renderStaticJsonlHeader,
  renderStaticJsonlCell,
  renderStaticJsonlRow,
  renderStaticJsonlTableMarkup,
} from '../../../../src/logic/core/static-jsonl-table/markup.js';

test('retains the exact authored details expansion fragments', () => {
  expect(describeStaticJsonlOpen(true)).toBe('');
  expect(describeStaticJsonlOpen(false)).toBe(' open');
});
test('retains independent prepared header slots without escaping them again', () => {
  expect(
    renderStaticJsonlHeader({
      sortAttribute: 'sort&amp;',
      labelAttribute: 'label&quot;',
      text: 'text&lt;',
      indicatorAttribute: 'indicator&gt;',
    })
  ).toBe(
    '<th scope="col"><button type="button" data-static-table-sort="sort&amp;" aria-label="Sort by label&quot;">text&lt; <span data-static-table-indicator="indicator&gt;"></span></button></th>'
  );
});
test('assembles prepared cell and row contents without new coercion policy', () => {
  expect(renderStaticJsonlCell('&amp;')).toBe('<td>&amp;</td>');
  expect(renderStaticJsonlCell('')).toBe('<td></td>');
  expect(renderStaticJsonlRow('<td>first</td><td>second</td>')).toBe(
    '<tr><td>first</td><td>second</td></tr>'
  );
  expect(renderStaticJsonlRow('')).toBe('<tr></tr>');
});
for (const open of ['', ' open']) {
  test(`retains the complete self-contained table structure for ${JSON.stringify(open)}`, () => {
    const payload = '{"cell":"\\u003c/script>"}';
    expect(
      renderStaticJsonlTableMarkup({
        payload,
        open,
        headers: '<th>header</th>',
        body: '<tr><td>body</td></tr>',
      })
    ).toBe(
      `<details class="static-jsonl-table" data-static-jsonl-table${open}><summary>Table</summary><table><thead><tr><th>header</th></tr></thead><tbody><tr><td>body</td></tr></tbody></table><script type="application/json" data-static-table-data>${payload}</script></details>`
    );
  });
}
