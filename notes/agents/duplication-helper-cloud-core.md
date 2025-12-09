# Duplication helper centralization

- **Unexpected hurdle:** The duplication report flagged the bearer regex helper twice, and while digging into the cloud modules I found the logic had already been centralized in `cloud-core`, so I just needed to extract the shared helper there rather than hiking through each module separately.
- **Learning:** Reuse existing `cloud-core` utilities wherever parsing or normalization is involved—my new `matchBearerToken` sits beside the other auth helpers, which makes future sharing simpler when another cloud function needs the same behavior.
- **Follow-up:** Consider whether the `extractBearerToken` helpers themselves could live in `cloud-core` as well (they mainly guard string-typed headers), or if there are other duplicated auth patterns that would benefit from a similar refactor.
