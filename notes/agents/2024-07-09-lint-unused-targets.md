## Unexpected Hurdle
Running `npm run lint` executes ESLint with `--fix` and tried to rewrite dozens of files I had no intention of touching. I did not expect the command in the task instructions to mutate so much unrelated code.

## Diagnosis
After the run I checked `git status` and saw a wall of modified files. A quick `git diff --stat` confirmed ESLint had formatted many modules outside the area I cared about. I reverted the unrelated files and re-applied my minimal change manually.

## Options Considered
- Commit every auto-format and explain the noise.
- Re-run lint on only the target file.
- Keep the minimal fix and avoid re-running the all-project script once the warning was addressed.

I chose to restore the repo to its previous state and only adjust the spot that triggered the warning. A follow-up `npx eslint <file>` let me confirm the warning was gone without another global auto-fix.

## Takeaways & Guidance
- Be ready for `npm run lint` to stage widespread fixes. Run `git status` immediately afterwards so you can undo the collateral damage before making intentional edits.
- When you only need to verify one file, run ESLint directly on that path without `--fix` to avoid more churn, or restore the tree before re-running global lint.

## Follow-ups / Questions
- It might be worth asking the maintainers whether `npm run lint` should really include `--fix`; a read-only mode would make targeted lint work less risky.
