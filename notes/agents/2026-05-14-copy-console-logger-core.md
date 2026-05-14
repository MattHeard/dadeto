# Copy Console Logger Core Helper

- Bead: dadeto-c8cw
- Change: added `createConsoleMessageLogger` in `src/core/build/blog.js`.
- Adapter impact: `src/build/copy.js` now asks core to map `console` to the copy workflow logger shape.
- Coverage: added a focused core test for the console-to-logger mapping.
- Evidence: `npm run check` passed after network escalation for `npm audit`; audit found 0 vulnerabilities.
