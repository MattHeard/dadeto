# 2025-10-23 – get API key credit core merge

- **Challenge:** Merging the handler utilities into a single module meant the copy-to-infra script no longer pointed at valid file names, which would have broken the deployment bundle.
- **Resolution:** Introduced the consolidated `core.js` module and updated the copy script and unit tests to reference it so the function packaging still mirrors the refactored structure.
