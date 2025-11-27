Reflected on converting the report script to multi-line formatting while keeping the HTML generator and its tests in sync.

Unexpected detail: the test had an exact substring expectation for `JSON.stringify({variant:'1a'})`, which failed the moment the script was expanded to multiple lines. Instead of keeping the test fragile to formatting, I normalized the rendered HTML before looking for the same semantic substring (with whitespace collapsed), which keeps the assertion resilient to future formatting tweaks.

What I learned: when an inline script is embedded via template literals, whitespace changes can break string-matching tests; normalizing whitespace before asserting on the embedded logic keeps the behavior check focused on the actual code rather than its layout.

Open idea: whenever we add significant inline scripts in HTML builders, we might want to provide shared helpers to normalize/compare the script body so tests do not rely on formatting details.
