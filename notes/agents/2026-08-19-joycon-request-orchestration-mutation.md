# JoyCon request orchestration mutation coverage

- Hypothesis: request-device handling must reject incomplete APIs, pass the exact filter list, and open/track every returned device before refreshing the UI.
- Evidence: API validation (`271–273`) killed 8/8 mutants; filter construction (`275–280`) killed 3/3; returned-device iteration (`282–288`) killed 1/1. All scans had 0 survivors and 0 timeouts.
- Focused Jest (84/84), targeted ESLint, and diff checks passed.
