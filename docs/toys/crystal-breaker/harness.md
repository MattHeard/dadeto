# Harness: Crystal Breaker

Use the existing toy submit loop with keyboard capture and `canvas-2d` output.

## Suggested Smoke Checks
- Empty input renders the default scene with a HUD.
- `{"type":"keydown","key":"Space"}` launches the orb on the next frame.
- Held arrow input moves the paddle across successive frames.
- A persisted state object with `version: 1` resumes safely.

