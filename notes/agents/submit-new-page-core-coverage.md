# Submit new page core coverage

- Unexpected hurdle: the existing handler tests did not exercise the Firestore lookup helpers used to resolve pages, variants, and options.
- Diagnosis: the core's public submission flow delegates to several async query branches that were only indirectly represented.
- Fix: added focused query doubles covering invalid input, empty page/variant/option results, existing option resolution, and page variant validation.
- Next-time guidance: for request handlers with exported lookup helpers, test the query helpers directly to cover empty-result branches without overcomplicating HTTP fixtures.
