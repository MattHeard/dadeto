# 2026-05-01: Symphony poller blocked on local Playwright Chromium startup

- Unexpected hurdle: every Chromium launch path failed before page load with a Linux crashpad/sandbox permission error in this workspace.
- Diagnosis path: built the blog successfully with `npm run build`, started a static server, then retried Playwright with the bundled Chromium, the system Chromium binary, and `xvfb-run`; all variants failed with `crashpad` / `sandbox_host_linux` permission errors, while Firefox was unavailable locally.
- Chosen fix: recorded the task as blocked in Notion instead of fabricating a screenshot, and kept the run evidence in `tracking/notion-codex/outcomes/`.
- Next-time guidance: if this poll recurs, start by checking whether the environment has a browser that can launch outside the sandbox, or switch to a non-browser screenshot path before spending time on Playwright retries.
