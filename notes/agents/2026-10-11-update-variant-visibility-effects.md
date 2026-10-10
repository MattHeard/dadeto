# Update variant visibility effect capability

- Unexpected hurdle: the exported trigger-composition helper used the generic Firestore handle builder, which could not inject an invocation capability or the permission-first write adapter.
- Diagnosis: traced the rating trigger from its Cloud Functions registration through the core handler, the admin-lock path, and conditional render-contents republishing.
- Fix: made `AllowEffects` the first core-handler argument, moved both document writes behind an injected adapter, forwarded the capability into render-contents, and minted it at the Cloud trigger boundary. Added focused propagation and adapter coverage.
- Next-time guidance: Firestore event handlers that can write or chain into another effectful flow need capability creation at registration and explicit forwarding through every effect boundary.
