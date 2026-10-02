# Timestamp boundary compatibility regressions

Before further rental parsing/domain separation, added eleven direct regressions
for the public parseTime re-export. The tests pin UTC and offset-equivalent
timestamps, custom string coercion, NaN for absent/invalid timestamps, and
propagation of coercion exceptions. The legacy export must remain the exact
request-boundary function, not a second implementation.

Evidence: focused Jest suite passes 11/11 and the new file passes strict ESLint;
logs `.tmp/rental-timestamp-characterization-{tests,lint}.log`. Production sources
were not edited while the post-WebMCP aggregate coverage run was active. That
run is observed via session 54222 and `.tmp/check-after-game-webmcp.log`; its
terminal outcome must be recorded separately before drawing coverage or full
gate conclusions.

Next-time guidance: preserve raw coercion behavior when extracting numeric
placement calculations. Invalid timestamps are NaN, but throwing toString
methods are errors, not invalid-date results. Do not hide remaining parser
violations by changing classifier configuration or adding exemptions.
