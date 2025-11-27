## Extracting the variant menu toggle helper
- **Unexpected**: the buildHtml test looked for the inline toggle listener, so moving it to `variantMenuToggle.js` required reading that file in the test instead of looking at the generated HTML string.
- **Diagnosis**: referencing the new `variantMenuToggle.js` via `<script src="/variantMenuToggle.js"></script>` and keeping the same DOM wiring ensures the variant page still toggles menus while allowing the script to be reused/deployed separately.
- **Learning**: whenever you pull inline helpers out into shared assets, update the tests to cover both the `<script>` reference and the extracted file content so the assertions stay accurate even though the HTML string shrinks.
