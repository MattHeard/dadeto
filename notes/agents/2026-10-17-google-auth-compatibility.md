# Google auth module compatibility loop

- **Unexpected hurdle:** the three tracked `infra/browser` entrypoints had drifted from `src/browser`, and the Terraform uploaded root `infra/*.js` modules used a mix of call shapes. Running `npm run build:dendritestories-co-nz` refreshed the generated core but also exposed unrelated stale browser copies.
- **Diagnosis:** the call shape changed in `deb51137c2`; the previous single options object is the canonical contract, while deployed modules may still call the shared handler positionally. Static output tests now check both Terraform-uploaded root objects and the checked-in Dendrite browser tree.
- **Fix:** the shared handler normalizes both call shapes and quietly skips initialization when `document.querySelectorAll` is unavailable. The three source entrypoints and both static output trees use the options object. Focused tests cover the legacy shape, invalid documents, and output parity.
- **Next-time guidance:** inspect both `infra/*.js` Terraform object sources and `infra/browser` before changing browser modules. The Dendrite copy command refreshes the ignored `infra/core` package but may rewrite unrelated stale snapshots; inspect its diff and retain only intended outputs. On this host, set `TMPDIR` to a repo-local path for focused Jest runs.
- **Open follow-up:** deployment verification, compatible cache-window evidence, and the 24-hour Error Reporting query remain outstanding; do not claim the production error group is clear based on local checks.

## Production verification — 2026-10-18

- Netlify production run [39051385100](https://github.com/MattHeard/dadeto/actions/runs/39051385100) deployed compatibility commit ff965f243bfa8f572e1e3a3bb94fbd2b8eac49af successfully on 2026-10-17.
- Read-only GETs for /browser/contentsGoogleAuthModule.js, /browser/statsGoogleAuthModule.js, /browser/variantGoogleSignIn.js, and /core/browser/google-auth-status.js returned 200. Their SHA-256 hashes match the corresponding tracked infra/browser entrypoints and src/core/browser/google-auth-status.js.
- The public root page returned 200 but did not reference these modules. /contents and the root-level /contentsGoogleAuthModule.js returned 404, so the exact affected contents-page route remains unverified.
- This environment has no Google Error Reporting access. The required 24-hour no-new-occurrences query for group CJf1gI2Nj72dMA remains outstanding.
