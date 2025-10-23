# CDN host helper extraction
- **Challenge:** Needed to ensure the CDN host defaulted correctly when the explicit dependency was missing without breaking existing tests that depended on the old signature.
- **Resolution:** Introduced a dedicated `getCdnHostFromEnv` helper and adjusted the core factory to fall back to it, updating the Jest helpers to surface the new behavior.
