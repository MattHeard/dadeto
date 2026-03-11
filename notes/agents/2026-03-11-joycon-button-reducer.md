# Joy-Con button capture reducer loop

- **Unexpected hurdle:** Lint keeps flagging the reducer complexity even after pulling the guard logic into a helper, and the new helper started triggering other complexity/max-params warnings.
- **Diagnosis:** Analyzed ESLint output; the reducer arrow needed to be a single expression while `selectStrongerButtonCapture` had to safely handle `null` candidates without adding extra complexity.
- **Taken fix:** Swapped the reducer to inline the candidate selection with a single-expression arrow and split `selectStrongerButtonCapture` into a boundary function (guards against null candidates) plus a helper that only compares non-null captures.
- **Next time:** Wrap refactors like this in a couple `npm run lint` cycles as soon as new helpers land to catch any ripple warnings before sending evidence.
