# Mosslight modal and WebMCP regressions

Local reproduction uses `TMPDIR=/home/matt/dadeto/.tmp npx playwright test --workers=1 --config=test/mosslight.playwright.config.ts`. System temporary storage was exhausted; repo-local temporary storage avoids both Jest transform-cache ENOSPC and Chromium navigation resource errors.

Before fixing, the strict registration adapter rejected all tools: passing a bound native function directly to `forEach` forwarded the numeric index as registration options. Wrap registration so only the definition is passed. Keep strict argument checking in both unit and browser tests.

An existing save with `mode: journal` and no dialogue let fishing, movement and rest run behind the Field Journal. Treat this legacy panel as modal independently of dialogue presence. Cancel or confirm dismisses it; other world actions cannot pass through. Normalize shifted letter keys so uppercase X matches lowercase x.

The full browser suite also reproduced dadeto-l43e: frame redraw erased the pause label. Render that label from runtime running state, retaining map/time context for agent observations.

Before-fix evidence: `.tmp/mosslight-bug-before.log` (four phone/desktop failures), `.tmp/mosslight-unit-before.log`. Subsequent evidence: `.tmp/mosslight-bugs-focused.log`, `.tmp/mosslight-bug-final.log`, `.tmp/mosslight-bugs-check.log`. Quality cleanup remains owned by dadeto-aaou; do not interpret passing browser tests as a green aggregate gate.
