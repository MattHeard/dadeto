# Commons handheld RPG implementation

- **Unexpected hurdle:** Existing RPG runtime and save seams are reusable, but the Commons quest needs a separate state validator and pixel-board painter to preserve its story and puzzle rules.
- **Diagnosis:** Mosslight exposes lifecycle, shared menus, input, local slots, and the page presenter as composable seams. Its default world logic, save identity, and renderer assumptions are episode-specific.
- **Chosen fix:** Inject a dedicated Commons simulation and versioned save identity into the shared runtime; reuse Chronoflow's deterministic fluid solver without importing its timer; override only the Commons puzzle frame.
- **Next time:** Verify both `commonsToy` and standalone page against the same action trace, test imported states that omit nested fields, and run the focused suite with all four coverage metrics at 100% before the full aggregate check.
