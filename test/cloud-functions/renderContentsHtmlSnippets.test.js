import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { PAGE_HTML } from '../../src/core/cloud/render-contents/render-contents-core.js';

const contentsGoogleAuthModulePath = fileURLToPath(
  new URL('../../src/browser/contentsGoogleAuthModule.js', import.meta.url)
);
const contentsGoogleAuthModule = readFileSync(
  contentsGoogleAuthModulePath,
  'utf8'
);
const contentsMenuToggleModulePath = fileURLToPath(
  new URL('../../src/browser/contentsMenuToggle.js', import.meta.url)
);
const contentsMenuToggleModule = readFileSync(
  contentsMenuToggleModulePath,
  'utf8'
);

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
    expect(html).toContain(
      '<script type="module" src="./contentsGoogleAuthModule.js"></script>'
    );
    expect(html).toContain('<script src="./contentsMenuToggle.js"></script>');
    expect(contentsGoogleAuthModule).toContain('import {');
    expect(contentsGoogleAuthModule).toContain('initGoogleSignIn');
    expect(contentsGoogleAuthModule).toContain('signOut');
    expect(contentsGoogleAuthModule).toContain('getIdToken');
    expect(contentsGoogleAuthModule).toContain('isAdmin');
    expect(contentsGoogleAuthModule).toContain("from './googleAuth.js'");
    expect(contentsMenuToggleModule).toContain('const toggle');
    expect(contentsMenuToggleModule).toContain("addEventListener('keydown'");
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
