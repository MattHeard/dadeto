# Lint command flag quirk

## What happened
Running `npm run lint -- --fix` surfaced a surprise: our lint script already forces `--fix`, and passing the flag through npm made the trailing `cat` invocation treat `--fix` as its own option, aborting the script.

## How I resolved it
I reran the command without extra args (`npm run lint`), which still runs ESLint with `--fix` according to `package.json`. That completed successfully and produced the warnings report.

## Takeaways
Before forwarding flags to npm scripts, check the script definition—especially when chained commands are involved. Otherwise the shell may hand your extra flags to the wrong program. When we do need to pass additional eslint flags, edit the script instead of appending them at the CLI.
