# dadeto-urr8: Playwright smoke startup hang

- Unexpected hurdle: the bounded smoke probe could not get past the local writer server.
- Diagnosis path: `WRITER_PORT=4321 npm run start:writer` wrote `writer server could not bind to port 4321` and pointed at sandbox bind restrictions before Playwright could run.
- Chosen fix: no code change in this loop; classify the failure as local server startup blocked by sandbox, not a Playwright bootstrap or Chromium launch hang.
- Next-time guidance: rerun from a full shell or a less restricted environment, and pass the Playwright config explicitly if needed (`--config test/e2e/playwright.config.ts`).
