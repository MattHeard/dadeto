/* @jest-environment jsdom */
import { jest } from '@jest/globals';
import { initializeManual } from '../../../src/core/browser/manual.js';

const setup = (src, markdown = false) => {
  document.body.innerHTML = `<div class="manual"><button data-manual-toggle>show</button><pre class="manual-body${markdown ? ' manual-markdown' : ''}" hidden></pre></div>`;
  const manual = document.querySelector('.manual');
  if (src) manual.dataset.manualSrc = src;
  const fetchText = jest.fn();
  initializeManual(manual, fetchText);
  return {
    fetchText,
    body: manual.querySelector('pre'),
    click: () => manual.querySelector('button').click(),
  };
};
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

test('fetches on first opening, renders literal text and caches successful prose', async () => {
  const view = setup('/manuals/example.md');
  view.fetchText.mockResolvedValue({
    ok: true,
    text: async () => '<script>unsafe</script>',
  });
  expect(view.fetchText).not.toHaveBeenCalled();
  view.click();
  expect(view.body.textContent).toBe('Loading manual…');
  await settle();
  expect(view.body.textContent).toBe('<script>unsafe</script>');
  expect(view.body.querySelector('script')).toBeNull();
  view.click();
  view.click();
  expect(view.fetchText).toHaveBeenCalledTimes(1);
});

test('turns safe Markdown links in fetched manuals into clickable anchors', async () => {
  const view = setup('/manuals/example.md', true);
  view.fetchText.mockResolvedValue({
    ok: true,
    text: async () =>
      'Play at [/the-commons-of-tomorrow/](/the-commons-of-tomorrow/). <script>text</script>',
  });
  view.click();
  await settle();
  const link = view.body.querySelector('.manual-inline-link');
  expect(link).not.toBeNull();
  expect(link.textContent).toBe('/the-commons-of-tomorrow/');
  expect(link.getAttribute('href')).toBe('/the-commons-of-tomorrow/');
  expect(link.href).toBe('http://localhost/the-commons-of-tomorrow/');
  expect(view.body.querySelector('script')).toBeNull();
  expect(view.body.textContent).toContain('<script>text</script>');
});

test('keeps unsafe schemes literal and renders links in legacy inline Markdown', async () => {
  const unsafe = setup('/manuals/example.md', true);
  unsafe.fetchText.mockResolvedValue({
    ok: true,
    text: async () => '[run](javascript:alert) [bad](http://[)',
  });
  unsafe.click();
  await settle();
  expect(unsafe.body.querySelector('a')).toBeNull();
  expect(unsafe.body.textContent).toBe(
    '[run](javascript:alert) [bad](http://[)'
  );

  document.body.innerHTML =
    '<div class="manual"><button data-manual-toggle>show</button><pre class="manual-body manual-markdown" hidden>Play at [the game](/game/).</pre></div>';
  const manual = document.querySelector('.manual');
  const fetchText = jest.fn();
  initializeManual(manual, fetchText);
  expect(manual.querySelector('a').getAttribute('href')).toBe('/game/');
  manual.querySelector('button').click();
  expect(fetchText).not.toHaveBeenCalled();
});

test.each([false, true])(
  'retries HTTP and network errors: %s',
  async network => {
    const view = setup('/manuals/example.md');
    if (network) view.fetchText.mockRejectedValueOnce(new Error('Offline'));
    else view.fetchText.mockResolvedValueOnce({ ok: false });
    view.click();
    await settle();
    expect(view.body.textContent).toContain('reopen to retry');
    view.fetchText.mockResolvedValue({
      ok: true,
      text: async () => 'Recovered',
    });
    view.click();
    view.click();
    await settle();
    expect(view.body.textContent).toBe('Recovered');
  }
);

test('does not duplicate pending requests or reopen a collapsed panel on completion', async () => {
  const view = setup('/manuals/example.md');
  let resolve;
  view.fetchText.mockReturnValue(
    new Promise(done => {
      resolve = done;
    })
  );
  view.click();
  view.click();
  view.click();
  view.click();
  expect(view.fetchText).toHaveBeenCalledTimes(1);
  resolve({ ok: true, text: async () => 'Done' });
  await settle();
  expect(view.body.hidden).toBe(true);
});

test('legacy inline manuals toggle without fetching', () => {
  const view = setup();
  view.click();
  expect(view.body.hidden).toBe(false);
  expect(view.fetchText).not.toHaveBeenCalled();
});

test.each([
  '<pre class="manual-body"></pre>',
  '<button data-manual-toggle></button>',
  '',
])('ignores incomplete markup %s', markup => {
  const manual = document.createElement('div');
  manual.innerHTML = markup;
  initializeManual(manual, jest.fn());
});
