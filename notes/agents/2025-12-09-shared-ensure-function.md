While chasing the remaining jscpd clones, I noticed the `token-action` helper and the moderation `authedFetch` implementation were still defining identical `ensureFunction` guards. To keep the fix scoped, I plumbed a single `ensureFunction` export through `src/core/common-core.js` and imported it from both modules instead of re-implementing the same type check.

I considered extracting a separate micro-module, but using the existing `core/common-core` kept the new helper near other shared utilities and avoided another layer of indirection. The only tweak was ensuring the import paths lined up for the browser-specific files.

Duplication is still reported for the toy dendrite story/page helpers, so that pair is next on the backlog.

After answering the last question, I realized `ensureFunction` is only consumed by browser-facing cores, so I moved it out of `src/core/common-core.js` and into `src/core/browser/browser-core.js`. The browser utilities now import it directly from `browser-core` instead of reaching into `common-core`, so the helper stays close to its only users and the admin/moderation stacks keep sharing the same guard.

Testing:
- `npm run duplication`
- `npm run lint`
- `npm test`

Open question: should the `ensureFunction` helper also be re-exported through the browser-facing `common-core.js` entry points so other browser-only helpers can share it without reaching into `core/`?
