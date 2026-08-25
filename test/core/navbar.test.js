import {
  createLinksBar,
  createNavbar,
  createNavbarHandle,
} from '../../src/core/build/navbar.js';

describe('navbar builders', () => {
  it('renders every filter option and active state', () => {
    const html = createNavbar();
    expect(html).toContain('<div class="entry nav-entry">');
    expect(html).toContain('data-filter="all">everything</a>');
    expect(html).toContain('data-filter="blog">blog</a>');
    expect(html).toContain('data-filter="toys">toys</a>');
    expect(html).toContain('filter-button active');
  });

  it('renders all external links with safe target attributes', () => {
    const html = createLinksBar();
    expect(html).toContain('https://x.com/mattheard');
    expect(html).toContain('https://somethinglikeamind.substack.com');
    expect(html).toContain('https://www.linkedin.com/in/matthewjohnheard');
    expect(html).toContain('https://ridedott.com');
    expect((html.match(/target="_blank"/g) || []).length).toBe(4);
    expect((html.match(/rel="noopener"/g) || []).length).toBe(4);
  });

  it('exposes both builders through the handle', () => {
    const handle = createNavbarHandle();
    expect(handle).toEqual({ createNavbar, createLinksBar });
    expect(handle.createNavbar()).toBe(createNavbar());
    expect(handle.createLinksBar()).toBe(createLinksBar());
  });
});
