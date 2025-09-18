import { describe, test, expect } from '@jest/globals';
import { PAGE_HTML } from '../../src/cloud/render-contents/htmlSnippets.js';

describe('PAGE_HTML', () => {
  test('places navigation links above the contents heading', () => {
    const html = PAGE_HTML('<li>Example</li>');
    const navIndex = html.indexOf('<nav');
    const headingIndex = html.indexOf('<h1>');
    const modIndex = html.indexOf('<a href="/mod.html">');
    const newIndex = html.indexOf('<a href="/new-story.html">');
    const statsIndex = html.indexOf('<a href="/stats.html">');
    expect(navIndex).toBeGreaterThan(-1);
    expect(navIndex).toBeLessThan(headingIndex);
    expect(modIndex).toBeGreaterThan(navIndex);
    expect(modIndex).toBeLessThan(headingIndex);
    expect(newIndex).toBeGreaterThan(navIndex);
    expect(newIndex).toBeLessThan(headingIndex);
    expect(statsIndex).toBeGreaterThan(navIndex);
    expect(statsIndex).toBeLessThan(headingIndex);
  });

  test('includes Google sign-in and sign-out buttons and script', () => {
    const html = PAGE_HTML('');
    expect(html).toContain('<div id="signinButton"></div>');
    expect(html).toContain('<div id="signoutWrap"');
    expect(html).toContain('id="signoutLink"');
    expect(html).toContain('https://accounts.google.com/gsi/client');
    expect(html).toContain('import {');
    expect(html).toContain('initGoogleSignIn');
    expect(html).toContain('signOut');
    expect(html).toContain('getIdToken');
    expect(html).toContain('isAdmin');
    expect(html).toContain("from './googleAuth.js'");
  });

  test('references Pico CSS before the local stylesheet', () => {
    const html = PAGE_HTML('');
    const picoIndex = html.indexOf(
      '@picocss/pico@2/css/pico.fluid.classless.min.css'
    );
    const localIndex = html.indexOf('/dendrite.css');
    expect(picoIndex).toBeGreaterThan(-1);
    expect(localIndex).toBeGreaterThan(-1);
    expect(picoIndex).toBeLessThan(localIndex);
  });

  test('includes favicon link', () => {
    const html = PAGE_HTML('');
    expect(html).toContain('<link rel="icon" href="/favicon.ico" />');
  });
});
