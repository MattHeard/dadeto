# E2E Chromium runtime

- Unexpected hurdle: local Chromium reported visible text as zero-height, causing static-page E2E failures.
- Diagnosis: a minimal heading reproduced the failure; the environment lacked usable fontconfig configuration.
- Fix: local Playwright uses the installed Chromium channel; the runtime must provide fontconfig and font libraries.
- Next-time guidance: validate a minimal browser heading before diagnosing page assertions; keep browser runtime setup outside repository code when possible.
