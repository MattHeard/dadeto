# Person Segment Assignment List

## What this toy does

Person Segment Assignment List is a focused toy for exercising one small domain behavior. Use it to inspect the behavior described in the toy's documented behavior without needing to understand the surrounding application.

## How to use it

1. Read the toy's documented behavior for the supported inputs, outputs, and boundaries.
2. Start with the smallest valid example shown there (or the default input, if one is provided).
3. Run the toy through the application’s toy interface or the command described in the toy interface or local setup.
4. Change one input at a time and compare the result with the expected behavior.
5. If the result is surprising, check the troubleshooting guidance before changing the implementation.

## Input and output

The exact input shape and normalization rules are defined in the toy's documented behavior. The toy returns the output described there; treat omitted, malformed, or out-of-range values according to the documented assumptions rather than guessing at new behavior.

## Useful experiments

- Run the documented happy-path example unchanged.
- Omit one optional field at a time to observe defaults.
- Try the smallest and largest supported values.
- Supply an invalid value and confirm the documented failure or fallback behavior.
- Compare the observed result with the executable acceptance evidence.

## Troubleshooting

- If the toy does not start, follow the setup and fixture instructions in the toy interface or local setup.
- If an assertion fails, rerun the exact command in the expected behavior and inspect the first failing condition.
- If input is rejected, verify its shape and constraints in the toy's documented behavior.
- For known edge cases, use the first-response playbook in the troubleshooting guidance.

## Scope note

This is an exploratory toy, not a general-purpose production API. Keep experiments within the stated boundary and record any newly discovered behavior in the toy’s durable documentation.
