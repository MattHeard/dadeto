import { expect, test } from '@playwright/test';

for (const game of ['mosslight-valley', 'neon-covenant']) {
  for (const embedded of [false, true]) {
    test(`${game} selection arrows render real right-pointing pixels in ${embedded ? 'embedded' : 'standalone'} menus`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://fonts.googleapis.com/**', route =>
        route.abort()
      );
      await page.route('https://fonts.gstatic.com/**', route => route.abort());
      const toy = game === 'neon-covenant' ? 'NEON1' : 'MOSS1';
      await page.goto(embedded ? '/' : `/${game}/`);
      if (embedded) {
        await page.locator(`#${toy}`).scrollIntoViewIfNeeded();
        await expect(
          page
            .locator(`#${toy}`)
            .getByRole('button', { name: 'Submit', exact: true })
        ).toBeEnabled();
      }
      const press = async (action: string) => {
        const key =
          { up: 'ArrowUp', down: 'ArrowDown', right: 'ArrowRight' }[action] ||
          action;
        const control = page.locator(
          embedded ? `#${toy} [data-key="${key}"]` : `[data-action="${action}"]`
        );
        if (testInfo.project.name === 'phone') await control.tap();
        else if (embedded) await control.click();
        else await page.keyboard.press(key, { delay: 60 });
        await page.waitForTimeout(280);
      };
      const checkArrow = async () => {
        await expect
          .poll(async () =>
            page.evaluate(
              async ({ game, toy, embedded }) => {
                const saves = JSON.parse(
                  localStorage.getItem('permanentData') || '{}'
                )[`${game}-saves-v2`];
                if (!saves?.slots?.[saves.activeSlot ?? 0]) return null;
                const state = JSON.parse(
                  saves.slots[saves.activeSlot ?? 0]
                ).state;
                if (!state.menu) return null;
                const { menuLines } = await import(
                  '/core/browser/game/mosslight-valley/controls.js'
                );
                const rows = state.presentation?.menuRows || menuLines(state);
                const row = rows.findIndex((text: string) =>
                  /^[>›]/u.test(text)
                );
                if (row < 0) return null;
                const canvas = document.querySelector<HTMLCanvasElement>(
                  embedded ? `#${toy} canvas` : '#game-screen'
                )!;
                const context = canvas.getContext('2d')!;
                const pixels: number[][] = [];
                for (let y = 0; y < 6; y++) {
                  for (let x = 0; x < 4; x++) {
                    const color = context.getImageData(
                      6 + x,
                      7 + row * 10 + y,
                      1,
                      1
                    ).data;
                    if (
                      color[0] === 233 &&
                      color[1] === 216 &&
                      color[2] === 141
                    )
                      pixels.push([x, y]);
                  }
                }
                return pixels;
              },
              { game, toy, embedded }
            )
          )
          .toEqual([
            [1, 1],
            [2, 2],
            [2, 3],
            [1, 4],
          ]);
      };
      if (game === 'neon-covenant') {
        for (let line = 0; line < 6; line++) await press('a');
        await checkArrow();
        await press('x');
        await press('x');
      } else await press('x');
      await checkArrow();
      await press('down');
      await checkArrow();
      await page.screenshot({
        path: `.tmp/menu-marker-${game}-${embedded ? 'embedded' : 'standalone'}-${testInfo.project.name}.png`,
      });
      if (game === 'neon-covenant') {
        await press('x');
        for (let step = 0; step < 6; step++) await press('right');
        await press('up');
        await press('right');
        await press('right');
        const coveredPixels = await page.evaluate(
          async ({ embedded, toy }) => {
            const { drawPixelText } = await import(
              '/core/browser/pixelFont.js'
            );
            const canvas = document.querySelector<HTMLCanvasElement>(
              embedded ? `#${toy} canvas` : '#game-screen'
            )!;
            const expected = document.createElement('canvas');
            expected.width = 54;
            expected.height = 10;
            const context = expected.getContext('2d')!;
            context.fillStyle = '#111426';
            context.fillRect(0, 0, 54, 10);
            context.fillStyle = '#f482ca';
            drawPixelText(context, 'EVALUATION', 2, 8);
            const actual = canvas
              .getContext('2d')!
              .getImageData(106, 36, 54, 10).data;
            const wanted = context.getImageData(0, 0, 54, 10).data;
            return Array.from(actual).flatMap((value, index) =>
              value === wanted[index] ? [] : [index]
            );
          },
          { embedded, toy }
        );
        expect(coveredPixels).toEqual([]);
        await page.screenshot({
          path: `.tmp/exit-label-${embedded ? 'embedded' : 'standalone'}-${testInfo.project.name}.png`,
        });
        await press('a');
        const readConversation = () =>
          page.evaluate(async () => {
            const saves = JSON.parse(localStorage.getItem('permanentData')!)[
              'neon-covenant-saves-v2'
            ];
            const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
            const { renderNeon } = await import(
              '/core/browser/game/neon-covenant/simulation.js'
            );
            const frame = renderNeon(state);
            return {
              dialogue: state.dialogue,
              lab: state.lab,
              day: state.world.day,
              border: frame.shapes.find((shape: any) => shape.width === 154),
            };
          });
        const first = await readConversation();
        expect(first.dialogue.actorId).toBe('ion');
        expect(first.dialogue.lines[0].text).toContain('Every GPU');
        expect(first.dialogue.choices).toEqual([]);
        let current = first;
        for (
          let pageIndex = 0;
          pageIndex < first.dialogue.lines.length;
          pageIndex++
        ) {
          expect(current.border.y).toBeGreaterThanOrEqual(0);
          expect(current.border.y + current.border.height).toBe(106);
          expect(current.lab).toEqual(first.lab);
          expect(current.day).toBe(first.day);
          await page.screenshot({
            path: `.tmp/ion-dialogue-${pageIndex}-${embedded ? 'embedded' : 'standalone'}-${testInfo.project.name}.png`,
          });
          if (!current.dialogue.choices.length) {
            await press('a');
            current = await readConversation();
          }
        }
        expect(current.dialogue.choices).toHaveLength(2);
        await press('down');
        await press('a');
        const declined = await readConversation();
        expect(declined.dialogue).toBeNull();
        expect(declined.lab).toEqual(first.lab);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
