## Trial

- directory: `src/core/build`
- bead: `dadeto-zx7p`
- trial focus: decide whether the path-format helpers (`selectReadablePath` / `formatPathRelativeToProject`) belong in `buildCore.js` (the directory-named shared module) rather than staying inside `blog.js`'s copy-specific configuration.

## Rubric

- shared/helper placement decision: moved the path helpers into `buildCore.js`, imported them there, and let `blog.js` re-export them so `createCopyCore` now looks at the shared module instead of defining the logic itself.
- where the agent looked first for shared logic: inspected `buildCore.js` because it already hosts general copy helpers, then confirmed `createCopyCore` was the only consumer and noted the helper definitions in `blog.js` duplicated the information.
- obvious vs exploration: mostly obvious once the helper block was identified; the only digging was verifying the `public` copies still needed the helpers and how `src/core/cloud/copy.js` imported them.
- helper-file sprawl effect: positive; one fewer ad-hoc helper block and a clearer signal that `buildCore.js` is the canonical home for cross-file copy utilities.
- shared-module coherence: `buildCore.js` already orchestrated Prettier formatting and export maps, so the new path helpers keep that module as the place to look for copy-related utilities.
- directory-splitting pressure: low; the directory remains focused on build scripts and the shared module now handles the clues about what other files should consume.
- import predictability: improved because `createCopyCore` and `src/core/cloud/copy.js` both import the helpers from `buildCore.js`, letting future agents look in the shared core before checking narrower files.

## Conclusion

This trial shows the `buildCore.js` shared module should own the path-format helpers rather than keeping them buried inside `blog.js`, which keeps `blog.js` focused on configuration data and lets every copy workflow reach for the shared core first. Running `npm test` (`node --experimental-vm-modules ./node_modules/.bin/jest --coverage --watchman=false && node src/scripts/write-coverage-summary.js`) after the change passed and regenerated the coverage summary without additional failures.

## Runner note

- unexpected hurdle: the `public` tree still mirrored `blog.js` (defining the helpers inline and pointing cloud copies at `../copy.js`), so the publish-ready files briefly diverged from the new shared-core layout.
- diagnosis path: compared `public/core/copy.js` and `public/core/cloud/copy.js` against the updated `src` modules to understand how to rewire the re-exports without breaking the published copies.
- chosen fix: exported the helpers from the shared `buildCore.js`, imported them both in `blog.js` and `src/core/cloud/copy.js`, re-exported them from `blog.js`, updated `public/core/copy.js` to re-export from a new `public/core/build/buildCore.js`, and added that new build-core file so the browser copy tree kept the same API.
- next-time guidance: when migrating build helpers, remember to rebuild or update every `public`/infra copy so the published scripts still point at the directory-named shared module instead of old helper fragments; the new shared module already hosts `createCopyCore`, so future helpers should go there first.
