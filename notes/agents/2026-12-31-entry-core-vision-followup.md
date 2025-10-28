# Entry/Core Vision Follow-up Adjustments
- incorporated reviewer feedback so example cloud function injects the Functions SDK into the core module and lets the core handle `onRequest` wiring.
- added dedicated browser dependency factory in the note to emphasize reusing shared browser shims instead of redefining them per entry file.
