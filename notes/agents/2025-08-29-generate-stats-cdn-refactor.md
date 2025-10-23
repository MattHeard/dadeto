# 2025-08-29 - Generate stats CDN refactor

- **Challenge:** Removing the explicit `cdnHost` dependency from `createGenerateStatsCore` meant untangling the Jest helper that always injected a fake host, which initially masked whether the env fallback still worked.
- **Resolution:** Updated the factory to read the CDN host directly from `getCdnHostFromEnv` and adjusted the tests to pass env overrides where needed, ensuring coverage stayed green without the manual host wiring.
