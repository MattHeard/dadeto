/* @jest-environment jsdom */
import { jest } from '@jest/globals';
import { initializeManual } from '../../../src/core/browser/manual.js';

const setup = src => {
  document.body.innerHTML =
    '<div class="manual"><button data-manual-toggle>show</button><pre class="manual-body" hidden></pre></div>';
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
