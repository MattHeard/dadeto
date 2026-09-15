import { withPageFooter } from '../../../src/core/cloud/page-footer.js';

describe('withPageFooter', () => {
  test('adds a human-friendly generation timestamp before the body closes', () => {
    const html = withPageFooter(
      '<body><main>Page</main></body>',
      new Date('2026-09-15T12:34:00Z')
    );

    expect(html).toContain('Page last updated at 15 Sept 2026, 12:34 UTC');
    expect(html.indexOf('Page last updated')).toBeLessThan(
      html.indexOf('</body>')
    );
  });
});
