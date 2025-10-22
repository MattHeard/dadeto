# Build directory rename

## Challenges
- Updating the ignore rules so Git would track the renamed `src/build/` folder instead of treating it as a transient `build/` output.
- Touching every import and script reference that pointed at `src/generator/` without missing the dynamic import cases in the Jest suites.

## Resolutions
- Narrowed the `.gitignore` entry to `/build/` so nested source directories named `build` remain tracked while root build artifacts stay ignored.
- Used targeted search-and-replace plus manual verification to swap all `src/generator` import paths in source and tests to `src/build`, and then spot-checked the CLI script and documentation for lingering references.
