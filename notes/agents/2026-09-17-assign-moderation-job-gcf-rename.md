# Assign moderation job GCF rename

- **Challenge:** Updating the build copy logic after renaming the Assign Moderation Job helper was
  easy to overlook because the script still referenced the old filename directly.
- **Resolution:** Introduced a dedicated constant for the new helper path in `src/build/copy-cloud.js`
  and pointed the copy entry at the renamed file so the Cloud Build assets stay in sync.
