# 2026-04-01 – restore complexity warning for http-method-guard

- **Unexpected hurdle:** The previous config had a file-level complexity exemption that masked warnings in `src/core/cloud/http-method-guard.js`.
- **Diagnosis path:** Reviewed `eslint.config.js` overrides and found a dedicated block disabling `complexity` for that file.
- **Chosen fix:** Removed the file-specific override so the global complexity warning threshold applies again.
- **Next-time guidance:** Prefer targeted refactors over long-lived per-file lint exemptions in core paths.
