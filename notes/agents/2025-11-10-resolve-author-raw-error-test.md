Expanded the `resolveAuthorMetadata` suite with a regression that ensures raw errors lacking a `message` continue to be logged, so the helper never silently drops unexpected rejection shapes.

Unexpected hurdle: none—the test paralleled the existing error-logging coverage but forced the alternate completion branch.

Lesson: when third-party SDKs can reject with bare objects, log the raw payload so diagnostics stay actionable.

Open questions: none.
