# Mosslight handheld viewport

Mobile chapter prose now follows the keypad and save controls. A compact masthead and viewport-budgeted screen keep the screen and keypad visible together; landscape places them side by side. Desktop presentation is preserved.

The first viewport regression run exposed horizontal overflow at 320px and an oversized landscape screen. Narrow-phone control spacing and landscape screen sizing/alignment fixed both. Keep thumb targets intact when changing spacing.

Acceptance: `npm run build` passed; `TMPDIR=/home/matt/dadeto/.tmp npx playwright test --workers=1 --config=test/mosslight.playwright.config.ts` passed 31 tests with 3 existing skips. The new handheld-layout suite covers 320x568, 390x664, 390x844 and 844x390 in both projects. Screenshots are `.tmp/mosslight-handheld-WIDTH-HEIGHT.png`; terminal evidence is `.tmp/handheld-final-browser.log`.

`TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed nine gates and failed only duplication (138 clones), recorded in `.tmp/handheld-check.log`. Strict aggregate cleanup remains owned by dadeto-aaou; dadeto-20us stays open pending the required green aggregate.
