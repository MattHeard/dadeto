## Extracting variant Google sign-in
- **Unexpected**: `buildHtml.test.js` was looking for inline `import {` lines, so after moving the sign-in logic into `src/browser/variantGoogleSignIn.js` it needed to read that file instead.
- **Diagnosis**: copying the extracted module into the infra directory, wiring it up via a `<script type="module" src="/variantGoogleSignIn.js">` tag, and updating the Terraform static objects kept the deployed variant pages loading the same auth helpers at runtime.
- **Learning**: when removing inline scripts from generated HTML, keep the tests aligned by asserting both the new script tag reference and by reading the external file to verify its contents; this keeps the coverage high while keeping the template tidy.
