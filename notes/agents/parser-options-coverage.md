# Parser options coverage

- The module is configuration-only, so coverage depends on a test importing and asserting the exported options object.
- Added a direct test covering every parser flag, plugin, and source-type setting.
- Evidence: bead `dadeto-cbf` records the focused Jest command passing 1 test at 100% statements, branches, functions, and lines.
