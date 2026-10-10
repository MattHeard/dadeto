# Render-variant dirty marker clear

- Unexpected hurdle: none after the adapter was threaded into render persistence.
- Diagnosis: the final post-invalidation marker clear still used `DocumentReference.update` directly even though other renderer writes had permission-aware adapters.
- Fix: the marker clear now calls the shared Firestore update adapter inside its own fresh capability boundary. The test verifies the unchanged payload and that clearing remains after CDN invalidation.
- Next-time guidance: after each isolated Firestore write migration, search the complete core call tree for remaining direct command methods; the reverse-link record `.set` is the next render-variant write to audit.
