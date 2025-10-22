# Move constants directory into core

- Running `npm run lint` auto-applied formatting across unrelated modules. I restored the affected files to their pre-lint state and re-applied only the path updates required for the constants move.
- `npm run build` generated copies with the earlier formatting, so I recopied the updated source modules into `public/` to keep the generated assets aligned with the new `src/core/constants` location.
