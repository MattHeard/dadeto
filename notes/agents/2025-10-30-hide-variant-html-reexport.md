# Hide variant HTML re-export

- **Challenge:** Needed to expose the core removeVariantHtml helper under the cloud module without duplicating logic. Double-checked the relative path depth to avoid misreferencing the core implementation.
- **Resolution:** Added a thin re-export wrapper in `src/cloud/hide-variant-html/removeVariantHtml.js` and updated the index module to consume it, keeping the cloud entry point stable.
