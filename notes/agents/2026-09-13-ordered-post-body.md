# Ordered post body implementation

- Unexpected hurdle: the aggregate coverage runner exposed legacy generator contracts one shard at a time, including getter-based `relatedLinks` behavior and historical renderer error wording.
- Diagnosis: compare each failing fixture with the normalized body path; preserve legacy fields before typed entries, retain the old error substring, and add branch-targeted ordered-body tests.
- Fix: normalize all visible body entries into one sequence, dispatch media/links/toy markers in authored order, add the default toy fallback, and validate toy markers.
- Next time: run the repository shard runner rather than a raw Jest path when coverage or ESM behavior is part of acceptance.
