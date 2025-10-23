# Generate stats allowed origins refactor

## Challenges
- The generate stats entry point still depended on a local cors-config wrapper, so figuring out whether other modules relied on that wrapper required a repository search.

## Resolutions
- Verified the wrapper file was unused outside the generate stats function and updated the entry point to call `getAllowedOrigins(process.env)` directly, preserving the previous default behaviour with a nullish coalescing fallback.
