# Failure Modes

- Invalid JSON returns `false`.
- Missing input arrays or proposed assignment returns `false`.
- Unknown segments or points return `false`.
- Invalid or reversed timestamps return `false`.
- Existing malformed assignments are ignored; malformed proposed assignments are rejected.
