import { describe, expect, it } from '@jest/globals';
import {
  createLinksBar,
  createNavbar,
  createNavbarHandle,
} from '../../../src/core/build/navbar.js';

describe('build navbar', () => {
  it('generates the filter navbar and links bar', () => {
    expect(createNavbar()).toContain('data-filter="all"');
    expect(createNavbar()).toContain('data-filter="blog"');
    expect(createNavbar()).toContain('data-filter="toys"');
    expect(createLinksBar()).toContain('https://x.com/mattheard');
    expect(createLinksBar()).toContain('https://www.linkedin.com/in/matthewjohnheard');
    expect(createNavbarHandle()).toEqual({ createNavbar, createLinksBar });
  });
});
