Added a regression test for `resolveStoryMetadata` that ensures when the root page lookup rejects with an error lacking a truthy `message`, the helper still logs the raw error object and leaves `firstPageUrl` undefined.

Unexpected hurdle: none—the test mirrored existing logging coverage but forced the alternative branch for error sanitisation.

Lesson: guardrails should cover both structured and unstructured errors so failures stay diagnosable even when third-party SDKs return odd shapes.

Open questions: none.
