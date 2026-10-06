# Chronoflow standalone handheld

- Unexpected hurdle: the standalone page's controls lived in the page presenter, while the embedded toy used a separate keypad implementation.
- Diagnosis: `/chronoflow/` had no Mosslight controls or directional selection despite CHRO1 already having its own handheld input surface.
- Fix: retain the accessible DOM board, inject keypad buttons into the page presenter, and map the Mosslight D-pad/A/B/X/Y keys plus START and reset to existing runtime actions. Keep clock trust in the existing network-time adapter.
- Next time: when adding a shared game input style, update both standalone and embedded entry points and their separate local journeys; verify the public release metadata is what the generated blog consumes.
