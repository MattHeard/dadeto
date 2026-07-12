# Dendrite option link rerender

- Unexpected hurdle: the full check is currently blocked by unrelated repo-wide lint and thin-file findings.
- Diagnosis: new-page submission updates the option's `targetPage` but did not dirty the source variant, so its published HTML kept the writer-form URL.
- Fix: mark the source variant dirty in the same Firestore batch when creating a new page; the existing variant-write renderer then republishes the source link.
- Next-time guidance: test the source option HTML after a new-page submission, not only the destination page and Firestore write.
