import { createTitleHandle, headerBanner } from '../../src/core/build/title.js';

describe('title banner', () => {
  it('renders the complete accessible banner structure', () => {
    const banner = headerBanner();
    expect(banner).toMatch(/^<pre class="header-banner"/);
    expect(banner).toContain('aria-label="Matt Heard"');
    expect(banner).toContain('role="heading"');
    expect(banner).toContain('aria-level="1"');
    expect(banner).toMatch(/\n▗▖  ▗▖/);
    expect(banner.endsWith('</pre>')).toBe(true);
  });

  it('exposes the banner through the title handle', () => {
    const handle = createTitleHandle();
    expect(handle.headerBanner).toBe(headerBanner);
    expect(handle.headerBanner()).toBe(headerBanner());
  });
});
