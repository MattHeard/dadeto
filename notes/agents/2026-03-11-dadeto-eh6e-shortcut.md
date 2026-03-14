# 2026-03-11 Symphony TUI shortcut

- **Unexpected hurdle:** adding a launch shortcut without blowing up the 40x10 layout forced me to reserve bottom slots before pouring evidence lines, otherwise the polling/footer lines would disappear whenever the view filled up.
- **Diagnosis path:** reviewed `scripts/symphony-tui.js` to understand the polling render loop and checked `src/local/symphony/app.js`/`launch.js` to confirm the `/api/symphony/launch` handler and the error returned when `status.state !== 'ready'`.
- **Chosen fix:** bound the `L` key to POST `/api/symphony/launch`, surface launch outcomes/errors in the dashboard, guard the render loop to keep the new shortcut/polling footer visible, and documented the shortcut behavior plus offline/no-bead messaging in `projects/symphony-tui/notes.md`.
- **Next time:** rerun `npm run symphony:tui` with a running Symphony server to verify the live interaction before wrapping up.
