Surprise: the lint complexity rule counted logical operators and optional chaining in `submit-moderation-rating-core`, so even single-`if` functions still reported complexity 3. I initially assumed trimming to one guard would be enough, but the warnings persisted until I removed the logical expressions entirely.

Diagnosis: ran `npx eslint src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js --no-color` to isolate the offenders, then iterated on one function at a time, watching which constructs still tripped the rule. The persistent warning on `validateDecodedUid` highlighted that optional chaining (`decoded?.uid`) was treated as a decision point, confirming the rule’s strictness.

What worked: shifted checks into helper functions with simple guards, avoided ternaries and logical `||/&&` in the flagged functions, and funneled early errors through small pipeline helpers to keep the responder under the threshold.

Guidance: when reducing complexity here, remove logical operators from the flagged function bodies altogether—prefer small helpers with single `if` guards and pass results through. Re-run the single-file eslint command above after each refactor to confirm the count dropped.

Open question: is it worth relaxing the complexity threshold or the no-ternary rule for tiny guards? For now, the helper pattern works, but it adds small indirection that could grow if repeated elsewhere.***
