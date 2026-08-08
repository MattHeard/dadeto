# Browser document facade coverage

- Unexpected hurdle: the module had no dedicated suite and its module-level environment guard could only be reached before the first facade installation.
- Diagnosis: broad helper coverage also required exercising unsupported timer, animation-frame, and gamepad APIs, plus the interactive-component fallback branches.
- Fix: added a direct facade suite with a complete browser-global double and explicit supported/unsupported API cases.
- Next-time guidance: for a large stateless facade, drive the returned handle as an API table and separately test environment guards and optional platform capabilities.
