Unexpected hurdle: the repo-wide `npm test` wrapper ignored targeted file arguments and then the bead sync from `main` failed with `bufio.Scanner: token too long`.

Diagnosis: the browser failure path was still using the old `/errors` beacon endpoint in `src/core/browser/main.js`, while `admin-core.js` still had temporary `console.debug` noise in the Google sign-in path.

Chosen fix: switch the browser beacon endpoint to `/prod-errors`, remove the debug logging from the sign-in flow, and add regression coverage in the browser tests.

Next-time guidance: use direct `npx jest` for focused browser file checks when the repo wrapper is too broad, and treat bead sync failures as a separate operational issue to retry after the code change is committed.
