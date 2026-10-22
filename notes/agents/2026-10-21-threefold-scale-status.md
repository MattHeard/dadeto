# Threefold Scale Status Row

- **Unexpected hurdle:** the four renderer families exposed different status subsets, and the shared HUD truncates rows longer than 30 characters.
- **Diagnosis:** route-level tests showed Broken Gate lacked physical height, Tidal Archive lacked height and Anchor, Silt Margin lacked scale and Anchor, and high-world scenes lacked Anchor.
- **Chosen fix:** use one formatter for scale, height (centimetres below one metre, metres otherwise), and current/capacity Anchor. Keep water/crisis/consequence messaging in the route toast or tide gauge. Add route-family coverage for scales −4 through +4 and assert each row fits.
- **Evidence:** focused impact passed 13 suites / 108 tests with full changed-renderer coverage and zero clones. `npm run build`, `npm run manuals:check` (79 manuals), and `npm run check` passed; the fast check covered 977 suites / 6,819 tests and all 10 gates.
- **Next-time guidance:** route presentations should share the scale-status formatter; test the low-scale unit branch, metre branch, remaining-resource value, and compact-row length whenever renderer status changes.
