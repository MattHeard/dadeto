import { expect, test, Page } from '@playwright/test';

async function press(page: Page, button: string, embedded: boolean) {
  const key = button === 'up' ? 'ArrowUp' : button;
  const selector = embedded ? `#NEON1 [data-key="${key}"]` : `[data-action="${button}"]`;
  if (test.info().project.name === 'phone') await page.locator(selector).tap();
  else if (embedded) await page.locator(selector).click();
  else await page.keyboard.press(key, { delay: 60 });
  await page.waitForTimeout(300);
}

async function soundState(page: Page) {
  return page.evaluate(() => {
    const sound = (window as any).__neonSound;
    if (!sound) return null;
    const samples = new Float32Array(512);
    sound.analyser?.getFloatTimeDomainData(samples);
    return { contexts: sound.contexts, oscillators: sound.oscillators, drums: sound.drums,
      state: sound.context.state, volume: sound.volume,
      peak: Math.max(...samples.map(Math.abs)) };
  });
}

for (const embedded of [false, true]) {
  test(`Neon sound unlocks, produces samples, mutes and resumes (${embedded ? 'embedded' : 'standalone'})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.addInitScript(() => {
      const Native = window.AudioContext;
      const probe: any = { contexts: 0, oscillators: 0, drums: 0 };
      (window as any).__neonSound = probe;
      window.AudioContext = class extends Native {
        constructor(...args: any[]) {
          super(...args);
          probe.contexts++;
          probe.context = this;
        }
        createGain() {
          const gain = super.createGain();
          if (!probe.master) {
            probe.master = gain;
            const setVolume = gain.gain.setValueAtTime.bind(gain.gain);
            gain.gain.setValueAtTime = (value, time) => {
              probe.volume = value;
              return setVolume(value, time);
            };
            probe.analyser = this.createAnalyser();
            probe.analyser.fftSize = 512;
            gain.connect(probe.analyser);
          }
          return gain;
        }
        createOscillator() { probe.oscillators++; return super.createOscillator(); }
        createBufferSource() { probe.drums++; return super.createBufferSource(); }
      };
    });
    await page.goto(embedded ? '/' : '/neon-covenant/', { waitUntil: 'domcontentloaded' });
    if (embedded) {
      await page.locator('#NEON1').scrollIntoViewIfNeeded();
      await expect(page.locator('#NEON1').getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
    }
    expect(await page.evaluate(() => (window as any).__neonSound.contexts)).toBe(0);
    await press(page, 'b', embedded);
    await press(page, 'x', embedded);
    await expect.poll(async () => (await soundState(page))?.peak).toBeGreaterThan(0.001);
    await expect.poll(async () => (await soundState(page))?.drums).toBeGreaterThan(0);
    const initial = await soundState(page);
    expect(initial?.contexts).toBe(1);
    expect(initial?.state).toBe('running');
    // Preserve the existing final guide row; Sound is immediately before it.
    await press(page, 'up', embedded);
    await press(page, 'up', embedded);
    expect(await page.evaluate(async () => {
      const saves = JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'];
      const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
      const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
      return { page: state.menu?.page, command: state.menu && labEntries(state)[state.menu.selected][1] };
    })).toEqual({ page: 'main', command: 'audio-toggle' });
    await press(page, 'a', embedded);
    await expect.poll(async () => (await soundState(page))?.volume).toBe(0);
    await expect.poll(async () => (await soundState(page))?.state).toBe('suspended');
    const stopped = await soundState(page);
    await page.waitForTimeout(350);
    expect((await soundState(page))?.oscillators).toBe(stopped?.oscillators);
    await press(page, 'a', embedded);
    await expect.poll(async () => (await soundState(page))?.state).toBe('running');
    expect((await soundState(page))?.contexts).toBe(1);
    expect(errors).toEqual([]);
  });
}
