# THREEFOLD Broken Gate closure epilogues

- Unexpected hurdle: the first receding-water regression passed a rendered frame back into the simulation renderer, which correctly rejected it because the scene state was missing. Moving the page test into its own suite also exposed that its mock history needed its own reset.
- Diagnosis: focused impact output identified the missing canonical scene state, uncovered page-rendering branches, and later a missing-summary branch in the accessible details panel.
- Chosen fix: derive report and departure epilogues from persisted episode/gate state, use native `<details>` and text-only list items, preserve the separate Iri log, and cover intact/destroyed stations, dry/flooded/receded channels, unchanged frames, missing summary elements, alternate scenes, and save/import.
- Next-time guidance: render from simulation state rather than presentation payloads. When extracting a test into a new Jest `describe`, add its own mock reset rather than relying on a sibling suite's hooks.
