import { describe, test, expect } from '@jest/globals';
import { PAGE_HTML } from '../../infra/cloud-functions/render-contents/htmlSnippets.js';

describe('PAGE_HTML', () => {
  test('places navigation links above the contents heading', () => {
    const html = PAGE_HTML('<li>Example</li>');
    const navIndex = html.indexOf('<nav');
    const headingIndex = html.indexOf('<h1>');
    const modIndex = html.indexOf('<a href="/mod.html">');
    const newIndex = html.indexOf('<a href="/new-story.html">');
    expect(navIndex).toBeGreaterThan(-1);
    expect(navIndex).toBeLessThan(headingIndex);
    expect(modIndex).toBeGreaterThan(navIndex);
    expect(modIndex).toBeLessThan(headingIndex);
    expect(newIndex).toBeGreaterThan(navIndex);
    expect(newIndex).toBeLessThan(headingIndex);
  });

  test('includes Google sign-in and sign-out buttons and script', () => {
    const html = PAGE_HTML('');
    expect(html).toContain('<div id="signinButton"></div>');
    expect(html).toContain('<div id="signoutWrap"');
    expect(html).toContain('id="signoutBtn"');
    expect(html).toContain('https://accounts.google.com/gsi/client');
    expect(html).toContain(
      "import { initGoogleSignIn, signOut, getIdToken } from './googleAuth.js';"
    );
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
});
