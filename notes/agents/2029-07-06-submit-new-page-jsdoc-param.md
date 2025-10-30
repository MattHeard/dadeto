# Submit new page JSDoc param update

## Unexpected challenge
Running `npm run lint` surprised me because the script pipes the entire lint report through `cat`. I expected a quick summary, but the report is large enough that it looked like the command was hanging before eventually dumping the warnings.

## Resolution
I let the command continue and watched for the prompt to return instead of interrupting it. The run eventually streamed the report and confirmed that only pre-existing warnings remain.

## Takeaway
Be patient when executing lint here. The command is doing work even when the terminal appears idle; wait for the prompt to return before assuming it is stuck.
